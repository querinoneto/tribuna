import { SITE_NAME, SITE_TAGLINE, SITE_URL, TIMEZONE } from "@/lib/env";
import { articlePath, columnLabel } from "@/lib/format";

/**
 * Modelos dos e-mails de assinatura (funções puras, testadas em
 * tests/unit/newsletter.test.ts). HTML em tabelas e estilos inline,
 * como exigem os programas de e-mail.
 */

export type DigestArticle = {
  title: string;
  subtitle: string;
  slug: string;
  published_at: string;
  cover_url: string | null;
  cover_alt: string;
  reading_minutes: number;
  section: { name: string } | null;
  column?: { name: string } | null;
  author: { name: string } | null;
};

/** Marcador que o Resend troca pelo link de cancelamento de cada assinante. */
export const RESEND_UNSUBSCRIBE = "{{{RESEND_UNSUBSCRIBE_URL}}}";

const C = { ink: "#1a1a1a", soft: "#4a4642", muted: "#7a746d", paper: "#faf8f5", paper2: "#f0e9e0", rule: "#e2dbd2", accent: "#b3201f" };
const SANS = "Helvetica,Arial,sans-serif";
const SERIF = "Georgia,'Times New Roman',serif";

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const dayMonth = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", timeZone: TIMEZONE });
const fullDate = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: TIMEZONE });

/** Semana ISO no fuso do jornal, ex.: "2026-W46" (evita enviar o resumo duas vezes). */
export function weekKey(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: TIMEZONE }).formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const date = new Date(Date.UTC(get("year"), get("month") - 1, get("day")));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function shell(opts: { preheader: string; body: string; footer: string }): string {
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(SITE_NAME)}</title></head>
<body style="margin:0;padding:0;background:${C.paper2};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.paper2};">${esc(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.paper2};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${C.paper};border-top:4px solid ${C.ink};">
<tr><td align="center" style="padding:28px 28px 18px;border-bottom:1px solid ${C.rule};">
<a href="${SITE_URL}" style="text-decoration:none;"><img src="${SITE_URL}/logo.png" width="56" height="56" alt="" style="display:block;border:0;margin:0 auto 10px;"><span style="font-family:${SERIF};font-size:30px;line-height:1;font-weight:700;letter-spacing:-0.5px;color:${C.ink};">${esc(SITE_NAME)}</span></a>
<div style="font-family:${SANS};font-size:12px;color:${C.muted};margin-top:6px;">${esc(SITE_TAGLINE)}</div>
</td></tr>
${opts.body}
<tr><td style="padding:22px 28px 28px;border-top:1px solid ${C.rule};font-family:${SANS};font-size:12px;line-height:1.6;color:${C.muted};text-align:center;">${opts.footer}</td></tr>
</table></td></tr></table></body></html>`;
}

/** Resumo semanal com os textos publicados nos últimos sete dias. */
export function buildDigest(articles: DigestArticle[], opts: { now: Date; unsubscribeUrl: string }) {
  const start = new Date(opts.now.getTime() - 6 * 86_400_000);
  const range = `${dayMonth.format(start)} a ${fullDate.format(opts.now)}`;
  const subject = articles.length ? `Resumo da semana: ${articles[0].title}` : "Resumo da semana";
  const preheader = articles.length === 1 ? "O texto publicado nesta semana." : `Os ${articles.length} textos publicados nesta semana.`;

  const items = articles
    .map((a, i) => {
      const url = `${SITE_URL}${articlePath(a)}`;
      const by = [a.author?.name ? `Por ${esc(a.author.name)}` : "", `${a.reading_minutes} min de leitura`].filter(Boolean).join(" · ");
      const img =
        a.cover_url && i === 0
          ? `<a href="${url}"><img src="${esc(a.cover_url)}" width="544" alt="${esc(a.cover_alt)}" style="display:block;width:100%;max-width:544px;height:auto;border:0;margin:0 0 14px;"></a>`
          : "";
      return `<tr><td style="padding:22px 28px;${i > 0 ? `border-top:1px solid ${C.rule};` : ""}">
${img}${a.column || a.section ? `<div style="font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${C.accent};margin-bottom:6px;">${esc(a.column ? columnLabel(a.column.name) : a.section!.name)}</div>` : ""}
<a href="${url}" style="font-family:${SANS};font-size:${i === 0 ? 24 : 19}px;line-height:1.2;font-weight:700;color:${C.ink};text-decoration:none;">${esc(a.title)}</a>
${a.subtitle ? `<div style="font-family:${SANS};font-size:15px;line-height:1.45;color:${C.soft};margin-top:8px;">${esc(a.subtitle)}</div>` : ""}
<div style="font-family:${SANS};font-size:12px;color:${C.muted};margin-top:8px;">${by}</div>
</td></tr>`;
    })
    .join("\n");

  const body = `<tr><td style="padding:22px 28px 4px;font-family:${SANS};">
<div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${C.accent};">Resumo da semana</div>
<div style="font-size:14px;color:${C.soft};margin-top:4px;">${esc(range)}</div>
</td></tr>
${items}
<tr><td align="center" style="padding:6px 28px 26px;">
<a href="${SITE_URL}" style="display:inline-block;background:${C.accent};color:#ffffff;font-family:${SANS};font-size:14px;font-weight:700;text-decoration:none;padding:12px 22px;">Ler mais no site</a>
</td></tr>`;

  const footer = `Você recebe este e-mail porque assinou o conteúdo da ${esc(SITE_NAME)}.<br>
<a href="${opts.unsubscribeUrl}" style="color:${C.muted};">Cancelar assinatura</a> · <a href="${SITE_URL}/privacidade" style="color:${C.muted};">Política de Privacidade</a>`;

  const text = [
    `${SITE_NAME} | Resumo da semana (${range})`,
    "",
    ...articles.flatMap((a) => [
      `${a.column || a.section ? `[${a.column ? columnLabel(a.column.name) : a.section!.name}] ` : ""}${a.title}`,
      ...(a.subtitle ? [a.subtitle] : []),
      `${SITE_URL}${articlePath(a)}`,
      "",
    ]),
    `Cancelar assinatura: ${opts.unsubscribeUrl}`,
  ].join("\n");

  return { subject, html: shell({ preheader, body, footer }), text, range };
}

/** E-mail de confirmação da assinatura (dupla confirmação). */
export function buildConfirmation(confirmUrl: string) {
  const subject = `Confirme sua assinatura da ${SITE_NAME}`;
  const body = `<tr><td style="padding:28px;font-family:${SANS};font-size:16px;line-height:1.55;color:${C.ink};">
<p style="margin:0 0 14px;">Recebemos um pedido para enviar o conteúdo da ${esc(SITE_NAME)} a este endereço de e-mail.</p>
<p style="margin:0 0 22px;">Para confirmar a assinatura, clique no botão abaixo. Você passará a receber um resumo semanal com os textos publicados.</p>
<p style="margin:0 0 22px;text-align:center;"><a href="${confirmUrl}" style="display:inline-block;background:${C.accent};color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:13px 24px;">Confirmar assinatura</a></p>
<p style="margin:0;font-size:13px;color:${C.muted};">Se você não fez este pedido, ignore esta mensagem: sem a confirmação, nenhum e-mail será enviado.</p>
</td></tr>`;
  const footer = `<a href="${SITE_URL}/privacidade" style="color:${C.muted};">Política de Privacidade</a>`;
  const text = `${subject}\n\nPara confirmar a assinatura, acesse:\n${confirmUrl}\n\nSe você não fez este pedido, ignore esta mensagem.`;
  return { subject, html: shell({ preheader: "Falta um clique para confirmar sua assinatura.", body, footer }), text };
}
