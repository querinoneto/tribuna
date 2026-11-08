"use client";

import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import { Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useRef } from "react";
import { uploadImage } from "@/lib/upload";
import { usePrompt } from "./prompt-dialog";
import { useToast } from "./toast";

export type RichValue = { json: unknown; html: string };

/**
 * Editor de texto rico. A tipografia é a mesma do site (classe
 * .prose-tribuna), para que o que aparece aqui seja o que será publicado.
 */
export function RichEditor({
  initial,
  onChange,
  placeholder = "Comece a escrever…",
  stickyTop = "top-0",
}: {
  initial: unknown;
  onChange: (v: RichValue) => void;
  placeholder?: string;
  stickyTop?: string;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      }),
      Image.configure({ inline: false }),
      Youtube.configure({ nocookie: true, controls: true, modestBranding: true }),
      Placeholder.configure({ placeholder }),
    ],
    content: (initial as object) ?? "",
    editorProps: {
      attributes: { class: "prose-tribuna tiptap mx-auto", "aria-label": "Corpo do texto", role: "textbox", "aria-multiline": "true" },
    },
    onUpdate: ({ editor }) => onChange({ json: editor.getJSON(), html: editor.getHTML() }),
  });

  return (
    <div>
      {editor && <Toolbar editor={editor} stickyTop={stickyTop} />}
      <div className="px-1 py-6">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function Toolbar({ editor, stickyTop }: { editor: Editor; stickyTop: string }) {
  const [dialog, ask] = usePrompt();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      quote: e.isActive("blockquote"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      link: e.isActive("link"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const chain = () => editor.chain().focus();

  async function addLink() {
    const prev = editor.getAttributes("link").href as string | undefined;
    const v = await ask({
      title: prev ? "Editar link" : "Inserir link",
      fields: [{ name: "href", label: "Endereço", placeholder: "https://…", defaultValue: prev, type: "url", hint: "Deixe vazio para remover o link." }],
      confirmLabel: "Aplicar",
    });
    if (v === null) return;
    if (!v.href) chain().extendMarkRange("link").unsetLink().run();
    else chain().extendMarkRange("link").setLink({ href: v.href }).run();
  }

  async function addYoutube() {
    const v = await ask({
      title: "Inserir vídeo do YouTube",
      fields: [{ name: "src", label: "Link do vídeo", placeholder: "https://www.youtube.com/watch?v=…", type: "url", required: true }],
    });
    if (!v?.src) return;
    const ok = editor.commands.setYoutubeVideo({ src: v.src });
    if (!ok) toast("error", "Esse link não parece ser de um vídeo do YouTube.");
  }

  async function onImage(file: File) {
    const v = await ask({
      title: "Descreva a imagem",
      fields: [
        { name: "alt", label: "Texto alternativo", placeholder: "O que aparece na imagem?", required: true, hint: "Usado por leitores de tela e buscadores." },
      ],
      confirmLabel: "Enviar imagem",
    });
    if (!v) return;
    try {
      toast("success", "Enviando imagem…");
      const up = await uploadImage(file, { alt: v.alt });
      chain().setImage({ src: up.url, alt: v.alt }).run();
    } catch (e) {
      toast("error", (e as Error).message);
    }
  }

  const Btn = ({
    label,
    active,
    onClick,
    children,
    disabled,
  }: {
    label: string;
    active?: boolean;
    onClick: () => void;
    children: React.ReactNode;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`inline-flex size-10 shrink-0 items-center justify-center rounded-md text-sm transition-colors disabled:opacity-30 ${
        active ? "bg-ink text-paper" : "text-ink hover:bg-paper-2"
      }`}
    >
      {children}
    </button>
  );
  const Sep = () => <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-rule" />;
  const svg = (d: React.ReactNode) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {d}
    </svg>
  );

  return (
    <>
      <div
        role="toolbar"
        aria-label="Formatação"
        className={`sticky ${stickyTop} z-20 -mx-1 flex items-center gap-0.5 overflow-x-auto border-b border-rule bg-paper/95 px-1 py-1.5 backdrop-blur`}
      >
        <Btn label="Intertítulo (H2)" active={s.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()}>
          <span className="font-semibold">H2</span>
        </Btn>
        <Btn label="Intertítulo menor (H3)" active={s.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()}>
          <span className="font-semibold">H3</span>
        </Btn>
        <Sep />
        <Btn label="Negrito" active={s.bold} onClick={() => chain().toggleBold().run()}>
          <span className="font-serif text-base font-bold">B</span>
        </Btn>
        <Btn label="Itálico" active={s.italic} onClick={() => chain().toggleItalic().run()}>
          <span className="font-serif text-base italic">I</span>
        </Btn>
        <Btn label="Citação" active={s.quote} onClick={() => chain().toggleBlockquote().run()}>
          {svg(<path d="M7 7h4v4c0 3-2 5-4 5M14 7h4v4c0 3-2 5-4 5" />)}
        </Btn>
        <Btn label="Lista com marcadores" active={s.bullet} onClick={() => chain().toggleBulletList().run()}>
          {svg(<><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" /></>)}
        </Btn>
        <Btn label="Lista numerada" active={s.ordered} onClick={() => chain().toggleOrderedList().run()}>
          <span className="text-xs font-semibold">1.</span>
        </Btn>
        <Sep />
        <Btn label="Link" active={s.link} onClick={addLink}>
          {svg(<><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>)}
        </Btn>
        <Btn label="Imagem" onClick={() => fileRef.current?.click()}>
          {svg(<><rect x="3" y="5" width="18" height="14" rx="1" /><circle cx="9" cy="10" r="1.5" /><path d="m21 16-5-5-8 8" /></>)}
        </Btn>
        <Btn label="Vídeo do YouTube" onClick={addYoutube}>
          {svg(<><rect x="2.5" y="6" width="19" height="12" rx="3" /><path d="M10 9.5v5l4.5-2.5z" /></>)}
        </Btn>
        <Btn label="Divisor" onClick={() => chain().setHorizontalRule().run()}>
          {svg(<path d="M4 12h16" />)}
        </Btn>
        <Sep />
        <Btn label="Desfazer" disabled={!s.canUndo} onClick={() => chain().undo().run()}>
          {svg(<path d="M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3" />)}
        </Btn>
        <Btn label="Refazer" disabled={!s.canRedo} onClick={() => chain().redo().run()}>
          {svg(<path d="m15 14 5-5-5-5M20 9H9a5 5 0 0 0 0 10h3" />)}
        </Btn>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) onImage(f);
          }}
        />
      </div>
      {dialog}
    </>
  );
}
