/**
 * Notas de rodapé: o editor salva cada nota como
 *   <span data-type="footnote" data-note="texto da nota"></span>
 * no ponto do texto em que ela é chamada. Ao exibir, cada marcador vira um
 * número sobrescrito com link para a lista "Notas", no fim do texto, e cada
 * nota tem um link de volta para o ponto de chamada.
 *
 * Deve rodar DEPOIS da limpeza do HTML (sanitizeArticleHtml). O texto da nota
 * é tratado como texto puro: só endereços https:// viram links.
 */
const FOOTNOTE_NODE = /<span\b([^>]*\bdata-type="footnote"[^>]*)>\s*<\/span>/g;

const decode = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&amp;/g, "&");

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Texto da nota em HTML seguro, com os endereços https:// como links. */
function noteHtml(text: string): string {
  const parts = text.split(/(https?:\/\/[^\s<>"]+[^\s<>".,;:!?)\]])/g);
  return parts
    .map((part, i) =>
      i % 2 === 1 ? `<a href="${escape(part)}" target="_blank" rel="noopener noreferrer nofollow">${escape(part)}</a>` : escape(part),
    )
    .join("");
}

export function renderFootnotes(html: string): string {
  if (!html.includes('data-type="footnote"')) return html;
  const notes: string[] = [];
  const body = html.replace(FOOTNOTE_NODE, (_whole, attrs: string) => {
    const text = decode(/\bdata-note="([^"]*)"/.exec(attrs)?.[1] ?? "").trim();
    if (!text) return "";
    notes.push(text);
    const n = notes.length;
    return `<sup class="footnote-ref"><a href="#nota-${n}" id="chamada-${n}" aria-label="Nota ${n}">${n}</a></sup>`;
  });
  if (!notes.length) return body;
  const items = notes
    .map((t, i) => `<li id="nota-${i + 1}">${noteHtml(t)} <a href="#chamada-${i + 1}" class="footnote-back" aria-label="Voltar ao ponto da nota ${i + 1}">↩</a></li>`)
    .join("");
  return `${body}<section class="footnotes" aria-labelledby="notas-titulo"><h2 id="notas-titulo">Notas</h2><ol>${items}</ol></section>`;
}
