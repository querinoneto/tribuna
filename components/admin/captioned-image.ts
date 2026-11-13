import Image from "@tiptap/extension-image";
import { mergeAttributes } from "@tiptap/react";

/**
 * Imagem do corpo do texto com legenda opcional. Com legenda, sai como
 *   <figure><img src="…" alt="…"><figcaption>legenda</figcaption></figure>
 * e, sem legenda, como uma <img> simples (como antes). Clique na imagem,
 * no editor, para mudar a legenda ou o texto alternativo.
 */
export const CaptionedImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      caption: {
        default: "",
        // A legenda vai no <figcaption>, não como atributo da imagem
        parseHTML: (el) => el.closest("figure")?.querySelector("figcaption")?.textContent?.trim() ?? "",
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "figure",
        priority: 60,
        getAttrs: (el) => {
          const img = (el as HTMLElement).querySelector("img[src]");
          if (!img) return false;
          return {
            src: img.getAttribute("src"),
            alt: img.getAttribute("alt"),
            title: img.getAttribute("title"),
            caption: (el as HTMLElement).querySelector("figcaption")?.textContent?.trim() ?? "",
          };
        },
      },
      { tag: "img[src]" },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const img = ["img", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)] as const;
    const caption = String(node.attrs.caption ?? "").trim();
    if (!caption) return [...img];
    return ["figure", {}, [...img], ["figcaption", {}, caption]];
  },
});
