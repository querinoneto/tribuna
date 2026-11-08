"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { RichEditor, type RichValue } from "@/components/admin/rich-editor";
import { useToast } from "@/components/admin/toast";
import { IconArrowLeft, IconExternal } from "@/components/icons";
import { savePage } from "../../crud-actions";

const PUBLIC_PATH: Record<string, string> = {
  sobre: "/sobre",
  contato: "/contato",
  expediente: "/expediente",
  privacidade: "/privacidade",
};

export function PageEditor({ page }: { page: { slug: string; title: string; content_json: unknown; content_html: string } }) {
  const [title, setTitle] = useState(page.title);
  const content = useRef<RichValue>({ json: page.content_json, html: page.content_html });
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();

  const save = () =>
    start(async () => {
      const r = await savePage(page.slug, { title, content_json: content.current.json, content_html: content.current.html });
      if (r.ok) {
        setDirty(false);
        toast("success", r.message ?? "Salvo.");
      } else toast("error", r.error ?? "Erro ao salvar.");
    });

  return (
    <div className="min-h-dvh bg-paper">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-rule bg-paper px-2 sm:px-4">
        <Link href="/admin/paginas" className="btn-ghost size-11 p-0" aria-label="Voltar para páginas">
          <IconArrowLeft />
        </Link>
        <span className="flex-1 text-sm text-muted" aria-live="polite">
          {dirty ? "Alterações não salvas" : "Tudo salvo"}
        </span>
        {PUBLIC_PATH[page.slug] && (
          <a href={PUBLIC_PATH[page.slug]} target="_blank" rel="noopener" className="btn-ghost size-11 p-0" aria-label="Ver no site">
            <IconExternal />
          </a>
        )}
        <button type="button" className="btn-primary" onClick={save} disabled={pending}>
          {pending ? "Salvando…" : "Salvar e publicar"}
        </button>
      </header>
      <div className="px-4 pt-8 pb-24 sm:px-8">
        <div className="mx-auto max-w-[68ch]">
          <label htmlFor="titulo-pagina" className="sr-only">
            Título da página
          </label>
          <input
            id="titulo-pagina"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setDirty(true);
            }}
            className="w-full border-0 bg-transparent p-0 font-display text-5xl outline-none"
          />
          <div className="mt-4 border-t border-rule" />
          <RichEditor
            initial={page.content_json ?? page.content_html}
            onChange={(v) => {
              content.current = v;
              setDirty(true);
            }}
            stickyTop="top-14"
          />
        </div>
      </div>
    </div>
  );
}
