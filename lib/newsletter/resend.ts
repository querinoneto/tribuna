import "server-only";

/**
 * Cliente mínimo da API do Resend (https://resend.com/docs), via fetch.
 *   RESEND_API_KEY     chave da API (re_...)
 *   RESEND_SEGMENT_ID  segmento que recebe o resumo semanal
 *   NEWSLETTER_FROM    remetente, ex.: Tribuna Socialista <assinaturas@tribunasocialista.com.br>
 */
// RESEND_API_URL só existe para testes locais (servidor que imita o Resend)
const API = process.env.RESEND_API_URL ?? "https://api.resend.com";
const KEY = process.env.RESEND_API_KEY ?? "";
export const RESEND_SEGMENT_ID = process.env.RESEND_SEGMENT_ID ?? "";
export const NEWSLETTER_FROM = process.env.NEWSLETTER_FROM ?? "";
export const NEWSLETTER_REPLY_TO = process.env.NEWSLETTER_REPLY_TO ?? "";

/** O envio por e-mail está configurado? (chave, segmento e remetente) */
export const hasResend = Boolean(KEY && RESEND_SEGMENT_ID && NEWSLETTER_FROM);

export class ResendError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const text = await res.text();
  const json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  if (!res.ok) throw new ResendError(String(json.message ?? json.name ?? `Erro ${res.status} no Resend`), res.status);
  return json as T;
}

export function sendEmail(params: { to: string; subject: string; html: string; text: string }) {
  return call<{ id: string }>("POST", "/emails", {
    from: NEWSLETTER_FROM,
    to: [params.to],
    subject: params.subject,
    html: params.html,
    text: params.text,
    ...(NEWSLETTER_REPLY_TO ? { reply_to: NEWSLETTER_REPLY_TO } : {}),
  });
}

/** Cria (ou reativa) o contato e o coloca no segmento do resumo semanal. */
export async function upsertContact(email: string) {
  try {
    await call("POST", "/contacts", { email, unsubscribed: false, segments: [{ id: RESEND_SEGMENT_ID }] });
    return;
  } catch (e) {
    // Contato já existe: reativa e garante o segmento
    if (!(e instanceof ResendError) || e.status >= 500) throw e;
  }
  const id = encodeURIComponent(email);
  await call("PATCH", `/contacts/${id}`, { unsubscribed: false });
  try {
    await call("POST", `/contacts/${id}/segments/${RESEND_SEGMENT_ID}`);
  } catch (e) {
    if (!(e instanceof ResendError) || e.status >= 500) throw e; // já está no segmento
  }
}

export async function removeContact(email: string) {
  try {
    await call("DELETE", `/contacts/${encodeURIComponent(email)}`);
  } catch (e) {
    if (!(e instanceof ResendError) || e.status !== 404) throw e;
  }
}

type Contact = { id: string; email: string; unsubscribed: boolean };

/** E-mails que cancelaram a assinatura pelo link do Resend. */
export async function listUnsubscribedEmails(max = 5000): Promise<string[]> {
  const out: string[] = [];
  let after: string | undefined;
  for (let i = 0; i < Math.ceil(max / 100); i++) {
    const page = await call<{ data: Contact[]; has_more?: boolean }>(
      "GET",
      `/contacts?limit=100${after ? `&after=${encodeURIComponent(after)}` : ""}`,
    );
    for (const c of page.data ?? []) if (c.unsubscribed) out.push(c.email.toLowerCase());
    if (!page.has_more || !page.data?.length) break;
    after = page.data[page.data.length - 1].id;
  }
  return out;
}

export function sendBroadcast(params: { name: string; subject: string; html: string; text: string }) {
  return call<{ id: string }>("POST", "/broadcasts", {
    segment_id: RESEND_SEGMENT_ID,
    from: NEWSLETTER_FROM,
    subject: params.subject,
    name: params.name,
    html: params.html,
    text: params.text,
    ...(NEWSLETTER_REPLY_TO ? { reply_to: NEWSLETTER_REPLY_TO } : {}),
    send: true,
  });
}
