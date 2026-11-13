import { mergeAttributes, Node } from "@tiptap/react";

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    footnote: {
      /** Insere uma nota de rodapé na posição do cursor. */
      insertFootnote: (note: string) => ReturnType;
    };
  }
}

/**
 * Nota de rodapé: um marcador no meio da frase que guarda o texto da nota.
 * No editor aparece como um número sobrescrito (contado pelo CSS); no site,
 * o número vira link para a lista "Notas", no fim do texto (lib/footnotes.ts).
 * HTML salvo: <span data-type="footnote" data-note="texto da nota"></span>
 */
export const Footnote = Node.create({
  name: "footnote",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      note: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-note") ?? "",
        renderHTML: (attrs) => ({ "data-note": attrs.note }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="footnote"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-type": "footnote", title: HTMLAttributes["data-note"] ?? "" })];
  },

  renderText() {
    return "";
  },

  addCommands() {
    return {
      insertFootnote:
        (note: string) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { note } }),
    };
  },
});
