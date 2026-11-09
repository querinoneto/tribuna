import "server-only";
import { SITE_URL } from "@/lib/env";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { clip } from "./card";

/**
 * Publicação automática no feed do Instagram.
 *
 * Aceita os dois tipos de token que a Meta emite:
 * - login do Instagram: token "IG…" (60 dias, renovável), em graph.instagram.com;
 * - login unificado / do Facebook: token "EAA…" (o de usuário do sistema não
 *   expira), em graph.facebook.com.
 * Os endereços de publicação são os mesmos nos dois casos.
 *
 * Fluxo: quando um texto entra no ar, o site gera o card em
 * /instagram/card/<id> (JPEG público), pede ao Instagram que crie a mídia a
 * partir desse endereço e, quando ela fica pronta, publica no feed.
 *
 * Configuração (token, conta, ligado/desligado) fica na tabela
 * instagram_config, acessível só com a chave secreta do Supabase. Cada
 * texto é postado uma única vez (tabela instagram_posts).
 */

const IG_API = process.env.INSTAGRAM_API_URL ?? "https://graph.instagram.com";
const FB_API = process.env.FACEBOOK_API_URL ?? "https://graph.facebook.com";

/** Tokens do login do Instagram começam com "IG"; os demais vão ao graph.facebook.com. */
export const isInstagramLoginToken = (token: string) => token.startsWith("IG");
const VERSION = "v25.0";

export type InstagramConfig = {
  enabled: boolean;
  access_token: string | null;
  ig_user_id: string | null;
  username: string | null;
  token_refreshed_at: string | null;
  enabled_at: string | null;
};

export const instagramAvailable = hasAdminClient;

function db() {
  const c = createAdminClient();
  if (!c) throw new Error("Falta a chave secreta do Supabase (SUPABASE_SECRET_KEY) na Vercel.");
  return c;
}

export async function getConfig(): Promise<InstagramConfig | null> {
  if (!hasAdminClient) return null;
  const { data } = await db().from("instagram_config").select("enabled, access_token, ig_user_id, username, token_refreshed_at, enabled_at").maybeSingle();
  return data ?? null;
}

class InstagramError extends Error {}

async function ig<T>(path: string, init: { method?: "GET" | "POST"; params: Record<string, string> }): Promise<T> {
  const token = init.params.access_token ?? "";
  const base = isInstagramLoginToken(token) ? IG_API : FB_API;
  const url = new URL(`${base}/${path.startsWith("refresh_access_token") ? "" : `${VERSION}/`}${path}`);
  const body = new URLSearchParams(init.params);
  const method = init.method ?? "GET";
  if (method === "GET") url.search = body.toString();
  const res = await fetch(url, {
    method,
    body: method === "POST" ? body : undefined,
    headers: method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : undefined,
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as { error?: { message?: string; code?: number } } & T;
  if (!res.ok || json.error) {
    const e = json.error;
    const msg = e?.code === 190 ? "O token de acesso do Instagram expirou ou foi revogado. Gere um novo e salve na página Instagram do painel." : e?.message;
    throw new InstagramError(msg || `Instagram respondeu ${res.status}.`);
  }
  return json;
}

type Account = { id: string; username: string | null };

/** Descobre a conta do Instagram ligada a um token do login unificado/Facebook. */
async function findFacebookLoginAccount(token: string, accountId?: string): Promise<Account | null> {
  if (accountId) {
    const a = await ig<{ id: string; username?: string }>(accountId, { params: { fields: "id,username", access_token: token } });
    return { id: a.id, username: a.username ?? null };
  }
  const attempts: (() => Promise<Account | null>)[] = [
    async () => {
      const r = await ig<{ data?: { id: string; username?: string }[] }>("me/assigned_instagram_accounts", {
        params: { fields: "id,username", access_token: token },
      });
      const a = r.data?.[0];
      return a ? { id: a.id, username: a.username ?? null } : null;
    },
    async () => {
      const r = await ig<{ data?: { instagram_business_account?: { id: string; username?: string } }[] }>("me/accounts", {
        params: { fields: "instagram_business_account{id,username}", access_token: token },
      });
      const a = r.data?.find((p) => p.instagram_business_account)?.instagram_business_account;
      return a ? { id: a.id, username: a.username ?? null } : null;
    },
    async () => {
      // Em alguns fluxos o próprio token já responde pela conta do Instagram
      const a = await ig<{ id?: string; username?: string }>("me", { params: { fields: "id,username", access_token: token } });
      return a.id && a.username ? { id: a.id, username: a.username } : null;
    },
  ];
  for (const attempt of attempts) {
    try {
      const a = await attempt();
      if (a) return a;
    } catch {}
  }
  return null;
}

/** Confere o token e descobre a conta (ID e @). Usado ao salvar o token. */
export async function connectAccount(token: string, accountId?: string): Promise<{ ok: true; username: string } | { ok: false; error: string }> {
  try {
    let account: Account | null;
    if (isInstagramLoginToken(token)) {
      const me = await ig<{ user_id?: string; id?: string; username?: string; account_type?: string }>("me", {
        params: { fields: "user_id,username,account_type", access_token: token },
      });
      const id = me.user_id ?? me.id;
      if (me.account_type && !["BUSINESS", "MEDIA_CREATOR", "CREATOR"].includes(me.account_type)) {
        return { ok: false, error: "A conta precisa ser profissional (Empresa ou Criador de conteúdo). Mude isso nas configurações do Instagram." };
      }
      account = id ? { id, username: me.username ?? null } : null;
    } else {
      account = await findFacebookLoginAccount(token, accountId?.trim() || undefined);
    }
    if (!account) {
      return {
        ok: false,
        error: "O token é válido, mas não foi possível descobrir a conta do Instagram. Preencha também o ID da conta do Instagram (aparece no painel da Meta, ao lado da conta).",
      };
    }
    const { error } = await db().from("instagram_config").upsert({
      id: true,
      access_token: token,
      ig_user_id: account.id,
      username: account.username,
      token_refreshed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, username: account.username ?? account.id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function setEnabled(enabled: boolean) {
  const cfg = await getConfig();
  const patch: Record<string, unknown> = { id: true, enabled, updated_at: new Date().toISOString() };
  // Ao ligar, só os textos publicados a partir de agora vão para o Instagram
  if (enabled && !cfg?.enabled) patch.enabled_at = new Date().toISOString();
  const { error } = await db().from("instagram_config").upsert(patch);
  if (error) throw new Error(error.message);
}

export async function disconnect() {
  const { error } = await db()
    .from("instagram_config")
    .upsert({ id: true, enabled: false, access_token: null, ig_user_id: null, username: null, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

/**
 * O token "de longa duração" vale 60 dias e pode ser renovado depois de 24h.
 * A rotina diária renova quando ele tem mais de 7 dias.
 */
export async function refreshTokenIfNeeded(): Promise<"renovado" | "em-dia" | "sem-token" | "nao-expira"> {
  const cfg = await getConfig();
  if (!cfg?.access_token) return "sem-token";
  // Token de usuário do sistema (login unificado) não expira
  if (!isInstagramLoginToken(cfg.access_token)) return "nao-expira";
  const age = Date.now() - new Date(cfg.token_refreshed_at ?? 0).getTime();
  if (age < 7 * 86_400_000) return "em-dia";
  const r = await ig<{ access_token: string }>("refresh_access_token", {
    params: { grant_type: "ig_refresh_token", access_token: cfg.access_token },
  });
  await db().from("instagram_config").update({ access_token: r.access_token, token_refreshed_at: new Date().toISOString() }).eq("id", true);
  return "renovado";
}

type ArticleRow = {
  id: string;
  title: string;
  subtitle: string | null;
  slug: string;
  status: string;
  published_at: string | null;
  updated_at: string;
  cover_alt: string | null;
  section: { name: string } | null;
  author: { name: string } | null;
};

export function buildCaption(a: Pick<ArticleRow, "title" | "subtitle" | "section" | "author">): string {
  const tag = (s: string) =>
    "#" +
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^A-Za-z0-9]+/g, " ")
      .trim()
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join("");
  const parts = [a.title.trim()];
  if (a.subtitle?.trim()) parts.push(a.subtitle.trim());
  parts.push(`Por ${a.author?.name || "Redação"}.`);
  parts.push("Leia o texto completo no site da Tribuna Socialista: link na bio.");
  parts.push(["#TribunaSocialista", a.section?.name ? tag(a.section.name) : null, "#ImprensaPopular"].filter(Boolean).join(" "));
  const caption = parts.join("\n\n");
  return caption.length <= 2100 ? caption : `${caption.slice(0, 2099)}…`;
}

export function cardUrl(a: Pick<ArticleRow, "id" | "updated_at">) {
  return `${SITE_URL}/instagram/card/${a.id}?v=${encodeURIComponent(new Date(a.updated_at).getTime().toString(36))}`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Reserva o texto para postagem (evita postar duas vezes). */
async function claim(articleId: string, force: boolean): Promise<boolean> {
  const client = db();
  const { data: inserted } = await client
    .from("instagram_posts")
    .upsert({ article_id: articleId, status: "processando" }, { onConflict: "article_id", ignoreDuplicates: true })
    .select("article_id");
  if (inserted?.length) return true;
  if (!force) return false;
  // Nova tentativa: só para erros ou postagens travadas há mais de 10 minutos
  const stale = new Date(Date.now() - 10 * 60_000).toISOString();
  const { data: retried } = await client
    .from("instagram_posts")
    .update({ status: "processando", error: null, updated_at: new Date().toISOString() })
    .eq("article_id", articleId)
    .or(`status.eq.erro,and(status.eq.processando,updated_at.lt.${stale})`)
    .select("article_id, attempts");
  if (!retried?.length) return false;
  await client.from("instagram_posts").update({ attempts: (retried[0].attempts ?? 1) + 1 }).eq("article_id", articleId);
  return true;
}

export type PostResult = { ok: true; permalink: string | null } | { ok: false; error: string; skipped?: boolean };

/** Gera o card de um texto publicado e posta no feed. */
export async function postArticle(articleId: string, opts: { force?: boolean } = {}): Promise<PostResult> {
  const cfg = await getConfig();
  if (!cfg?.access_token || !cfg.ig_user_id) return { ok: false, error: "Instagram não conectado.", skipped: true };
  if (!cfg.enabled && !opts.force) return { ok: false, error: "Publicação automática desligada.", skipped: true };

  const client = db();
  const { data: a } = await client
    .from("articles")
    .select("id, title, subtitle, slug, status, published_at, updated_at, cover_alt, section:sections(name), author:authors(name)")
    .eq("id", articleId)
    .maybeSingle<ArticleRow>();
  if (!a || !["published", "scheduled"].includes(a.status) || !a.published_at || new Date(a.published_at) > new Date()) {
    return { ok: false, error: "O texto ainda não está no ar.", skipped: true };
  }

  if (!(await claim(a.id, Boolean(opts.force)))) return { ok: false, error: "Este texto já foi enviado ao Instagram.", skipped: true };

  try {
    const container = await ig<{ id: string }>(`${cfg.ig_user_id}/media`, {
      method: "POST",
      params: {
        image_url: cardUrl(a),
        caption: buildCaption(a),
        alt_text: clip(`Card da Tribuna Socialista: ${a.title}${a.cover_alt ? `. Foto: ${a.cover_alt}` : ""}`, 1000),
        access_token: cfg.access_token,
      },
    });

    // Espera o Instagram processar a imagem (normalmente poucos segundos)
    for (let i = 0; i < 20; i++) {
      const s = await ig<{ status_code?: string }>(container.id, { params: { fields: "status_code", access_token: cfg.access_token } });
      if (s.status_code === "FINISHED" || !s.status_code) break;
      if (s.status_code === "ERROR" || s.status_code === "EXPIRED") throw new InstagramError("O Instagram não conseguiu processar o card.");
      await sleep(3000);
    }

    const published = await ig<{ id: string }>(`${cfg.ig_user_id}/media_publish`, {
      method: "POST",
      params: { creation_id: container.id, access_token: cfg.access_token },
    });
    let permalink: string | null = null;
    try {
      permalink = (await ig<{ permalink?: string }>(published.id, { params: { fields: "permalink", access_token: cfg.access_token } })).permalink ?? null;
    } catch {}

    await client
      .from("instagram_posts")
      .update({ status: "publicado", media_id: published.id, permalink, error: null, updated_at: new Date().toISOString() })
      .eq("article_id", a.id);
    return { ok: true, permalink };
  } catch (e) {
    const error = (e as Error).message || "Erro desconhecido ao postar no Instagram.";
    await client.from("instagram_posts").update({ status: "erro", error, updated_at: new Date().toISOString() }).eq("article_id", a.id);
    return { ok: false, error };
  }
}

/**
 * Posta os textos já no ar que ainda não foram ao Instagram (inclui os
 * agendados cujo horário chegou). Só considera o que foi publicado depois
 * que a automação foi ligada.
 */
export async function postDueArticles(limit = 3): Promise<{ posted: number; errors: number }> {
  const cfg = await getConfig();
  if (!cfg?.enabled || !cfg.access_token || !cfg.enabled_at) return { posted: 0, errors: 0 };
  const client = db();
  const now = new Date().toISOString();
  const { data: candidates } = await client
    .from("articles")
    .select("id, instagram_posts(article_id)")
    .in("status", ["published", "scheduled"])
    .gte("published_at", cfg.enabled_at)
    .lte("published_at", now)
    .order("published_at", { ascending: true })
    .limit(50);
  // instagram_posts vem como objeto (relação 1:1) ou lista, conforme a versão do PostgREST
  const alreadySent = (v: unknown) => (Array.isArray(v) ? v.length > 0 : Boolean(v));
  const due = (candidates ?? []).filter((c) => !alreadySent(c.instagram_posts)).slice(0, limit);

  let posted = 0;
  let errors = 0;
  for (const c of due) {
    const r = await postArticle(c.id);
    if (r.ok) posted++;
    else if (!r.skipped) errors++;
  }
  return { posted, errors };
}
