import sanitizeHtml from "sanitize-html";

/**
 * Limpa o HTML gerado pelo editor antes de salvar. Mantém só a formatação
 * que o editor oferece e bloqueia scripts, estilos, eventos (onclick…) e
 * iframes que não sejam do YouTube.
 */
const YOUTUBE_EMBED = /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com)\/embed\/[A-Za-z0-9_-]{6,20}(\?[\w=&%-]*)?$/;

export function sanitizeArticleHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "h2", "h3", "strong", "b", "em", "i", "u", "s", "a", "blockquote",
      "ul", "ol", "li", "hr", "br", "img", "figure", "figcaption", "div", "iframe",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "title", "width", "height"],
      iframe: ["src", "width", "height", "allowfullscreen", "allow", "title", "frameborder"],
      div: ["data-youtube-video"],
      ol: ["start"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["https", "http"] },
    allowProtocolRelative: false,
    exclusiveFilter: (frame) => frame.tag === "iframe" && !YOUTUBE_EMBED.test(frame.attribs.src ?? ""),
    transformTags: {
      a: (tagName, attribs) => {
        const external = /^https?:\/\//.test(attribs.href ?? "");
        return {
          tagName,
          attribs: external ? { ...attribs, target: "_blank", rel: "noopener noreferrer nofollow" } : attribs,
        };
      },
      iframe: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          title: attribs.title || "Vídeo do YouTube",
          allow: "accelerometer; encrypted-media; gyroscope; picture-in-picture",
          allowfullscreen: "true",
        },
      }),
    },
  });
}

/** Remove todas as tags (para resumos e metadados). */
export function stripHtml(html: string): string {
  // Espaço depois de cada bloco, para "título.Parágrafo" não grudar
  const spaced = html.replace(/<\/(p|h[1-6]|li|blockquote|div|figcaption)>|<br\s*\/?>/gi, "$& ");
  return sanitizeHtml(spaced, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, " ").trim();
}
