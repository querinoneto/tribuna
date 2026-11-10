import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { SITE_URL } from "@/lib/env";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";
import { buildConfirmation, buildDigest, RESEND_UNSUBSCRIBE, weekKey, type DigestArticle } from "./digest";
import { hasResend, listUnsubscribedEmails, removeContact, sendBroadcast, sendEmail, upsertContact } from "./resend";

/** Rotinas de assinatura por e-mail: confirmação, sincronização e resumo semanal. */

export const newsletterReady = hasResend && hasAdminClient;

const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");
const RESEND_INTERVAL_MS = 10 * 60_000; // não reenvia a confirmação ao mesmo e-mail em menos de 10 min
/**
 * Teto de e-mails de confirmação por hora, somando todos os endereços. Sem
 * ele, um robô poderia cadastrar milhares de e-mails e esgotar a cota do
 * Resend. Acima do teto, a assinatura fica registrada e a confirmação sai na
 * rotina semanal (sendPendingConfirmations).
 */
const CONFIRMATIONS_PER_HOUR = 40;

export type SubscribeOutcome = "confirmacao-enviada" | "ja-ativa" | "registrada" | "erro";

/**
 * Registra a assinatura. Com o Resend configurado, envia o e-mail de
 * confirmação; sem ele, a assinatura fica pendente até a configuração.
 */
export async function subscribe(email: string): Promise<SubscribeOutcome> {
  if (!newsletterReady) {
    const db = createPublicClient();
    if (!db) return "erro";
    const { error } = await db.from("subscribers").insert({ email, status: "pendente" });
    return !error || error.code === "23505" ? "registrada" : "erro";
  }

  const db = createAdminClient()!;
  const { data: existing } = await db.from("subscribers").select("id, status, confirm_sent_at").eq("email", email).maybeSingle();
  if (existing?.status === "ativo") return "ja-ativa";
  if (existing?.confirm_sent_at && Date.now() - new Date(existing.confirm_sent_at).getTime() < RESEND_INTERVAL_MS) {
    return "confirmacao-enviada";
  }

  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  const { count: recent } = await db.from("subscribers").select("id", { count: "exact", head: true }).gte("confirm_sent_at", hourAgo);
  if ((recent ?? 0) >= CONFIRMATIONS_PER_HOUR) {
    if (!existing) {
      const { error } = await db.from("subscribers").insert({ email, status: "pendente" });
      if (error && error.code !== "23505") return "erro";
    }
    return "registrada";
  }

  const token = randomBytes(32).toString("base64url");
  const row = { email, status: "pendente", confirm_token_hash: hashToken(token), confirm_sent_at: new Date().toISOString(), unsubscribed_at: null };
  const { error } = existing
    ? await db.from("subscribers").update(row).eq("id", existing.id)
    : await db.from("subscribers").insert(row);
  if (error) return "erro";

  const mail = buildConfirmation(`${SITE_URL}/assinatura/confirmar?token=${token}`);
  try {
    await sendEmail({ to: email, ...mail });
    return "confirmacao-enviada";
  } catch {
    return "erro";
  }
}

/** Confirma a assinatura pelo link recebido por e-mail. */
export async function confirmSubscription(token: string): Promise<"confirmada" | "invalida" | "erro"> {
  if (!newsletterReady || !/^[A-Za-z0-9_-]{20,100}$/.test(token)) return "invalida";
  const db = createAdminClient()!;
  const { data: sub } = await db.from("subscribers").select("id, email, status").eq("confirm_token_hash", hashToken(token)).maybeSingle();
  if (!sub) return "invalida";
  try {
    await upsertContact(sub.email);
  } catch {
    return "erro";
  }
  const now = new Date().toISOString();
  await db
    .from("subscribers")
    .update({ status: "ativo", confirmed_at: now, synced_at: now, confirm_token_hash: null, unsubscribed_at: null })
    .eq("id", sub.id);
  return "confirmada";
}

/** Envia a confirmação a quem assinou antes de o Resend estar configurado. */
export async function sendPendingConfirmations(limit = 80): Promise<number> {
  if (!newsletterReady) return 0;
  const db = createAdminClient()!;
  const { data } = await db.from("subscribers").select("email").eq("status", "pendente").is("confirm_sent_at", null).limit(limit);
  let sent = 0;
  for (const s of data ?? []) {
    if ((await subscribe(s.email)) === "confirmacao-enviada") sent++;
  }
  return sent;
}

/**
 * Mantém o banco em sintonia com o Resend: leva ao Resend os assinantes
 * ativos ainda não sincronizados e marca como cancelados os que usaram o
 * link de cancelamento dos e-mails.
 */
export async function syncSubscribers(): Promise<{ added: number; cancelled: number }> {
  if (!newsletterReady) return { added: 0, cancelled: 0 };
  const db = createAdminClient()!;
  let added = 0;
  const { data: toSync } = await db.from("subscribers").select("id, email").eq("status", "ativo").is("synced_at", null).limit(200);
  for (const s of toSync ?? []) {
    await upsertContact(s.email);
    await db.from("subscribers").update({ synced_at: new Date().toISOString() }).eq("id", s.id);
    added++;
  }
  const gone = await listUnsubscribedEmails();
  let cancelled = 0;
  if (gone.length) {
    const { data } = await db
      .from("subscribers")
      .update({ status: "cancelado", unsubscribed_at: new Date().toISOString() })
      .in("email", gone)
      .eq("status", "ativo")
      .select("id");
    cancelled = data?.length ?? 0;
  }
  return { added, cancelled };
}

/** Elimina pedidos de assinatura não confirmados há mais de 30 dias (Política, cl. 6.2.2). */
export async function purgeStalePending(): Promise<number> {
  if (!hasAdminClient) return 0;
  const db = createAdminClient()!;
  const limit = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data } = await db.from("subscribers").delete().eq("status", "pendente").lt("confirm_sent_at", limit).select("id");
  return data?.length ?? 0;
}

/** Remove o assinante também do Resend (usado ao apagar no painel). */
export async function forgetSubscriber(email: string) {
  if (hasResend) await removeContact(email);
}

const DIGEST_SELECT =
  "title, subtitle, slug, published_at, cover_url, cover_alt, reading_minutes, section:sections(name), column:columns(name), author:authors(name)";

/** Textos publicados nos últimos sete dias, do mais recente ao mais antigo. */
export async function weekArticles(now = new Date()): Promise<DigestArticle[]> {
  const db = createPublicClient();
  if (!db) return [];
  const since = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const { data } = await db
    .from("articles")
    .select(DIGEST_SELECT)
    .in("status", ["published", "scheduled"])
    .gt("published_at", since)
    .lte("published_at", now.toISOString())
    .order("published_at", { ascending: false })
    .limit(30);
  return (data ?? []) as unknown as DigestArticle[];
}

export type DigestResult =
  | { ok: true; status: "enviado" | "sem-novidades" | "ja-enviado"; articles: number }
  | { ok: false; error: string };

/**
 * Envia o resumo semanal a todos os assinantes ativos (pelo segmento do
 * Resend). kind "semanal" (automático) envia uma vez por semana; "manual"
 * (botão do painel) sempre envia.
 */
export async function sendWeeklyDigest(kind: "semanal" | "manual", now = new Date()): Promise<DigestResult> {
  if (!newsletterReady) return { ok: false, error: "O envio por e-mail ainda não está configurado." };
  const db = createAdminClient()!;
  const week = weekKey(now);

  if (kind === "semanal") {
    const { data: done } = await db
      .from("newsletter_sends")
      .select("id")
      .eq("week_key", week)
      .eq("kind", "semanal")
      .in("status", ["enviado", "sem-novidades"])
      .maybeSingle();
    if (done) return { ok: true, status: "ja-enviado", articles: 0 };
  }

  try {
    await syncSubscribers();
  } catch {
    // A sincronização não impede o envio: o Resend já ignora quem cancelou
  }

  const articles = await weekArticles(now);
  if (!articles.length) {
    await db.from("newsletter_sends").insert({ week_key: week, kind, status: "sem-novidades", article_count: 0 });
    return { ok: true, status: "sem-novidades", articles: 0 };
  }

  const mail = buildDigest(articles, { now, unsubscribeUrl: RESEND_UNSUBSCRIBE });
  try {
    const b = await sendBroadcast({ name: `Resumo ${week}${kind === "manual" ? " (manual)" : ""}`, ...mail });
    await db.from("newsletter_sends").insert({ week_key: week, kind, status: "enviado", article_count: articles.length, broadcast_id: b.id });
    return { ok: true, status: "enviado", articles: articles.length };
  } catch (e) {
    const error = (e as Error).message.slice(0, 500);
    await db.from("newsletter_sends").insert({ week_key: week, kind, status: "erro", article_count: articles.length, error });
    return { ok: false, error };
  }
}

/** Envia o resumo desta semana só para um endereço (prévia). */
export async function sendDigestTest(to: string, now = new Date()): Promise<{ ok: boolean; error?: string; articles?: number }> {
  if (!hasResend) return { ok: false, error: "O envio por e-mail ainda não está configurado." };
  const articles = await weekArticles(now);
  if (!articles.length) return { ok: false, error: "Não há textos publicados nos últimos 7 dias para montar o resumo." };
  const mail = buildDigest(articles, { now, unsubscribeUrl: `${SITE_URL}/privacidade` });
  try {
    await sendEmail({ to, subject: `[Teste] ${mail.subject}`, html: mail.html, text: mail.text });
    return { ok: true, articles: articles.length };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
