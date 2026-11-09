"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { changeStatus, deleteArticle, saveArticle, type SaveResult } from "@/app/admin/textos/actions";
import { IconArrowLeft, IconClose, IconExternal, IconImage, IconSliders, IconTrash } from "@/components/icons";
import { articlePath, formatShort, formatTime } from "@/lib/format";
import { canPublish, isCoordination } from "@/lib/permissions";
import { slugify } from "@/lib/slug";
import type { ArticleStatus, Role } from "@/lib/types";
import { uploadImage } from "@/lib/upload";
import { ConfirmButton } from "./confirm";
import { MediaPicker } from "./media-picker";
import { RichEditor, type RichValue } from "./rich-editor";
import { StatusBadge } from "./status-badge";
import { useToast } from "./toast";

export type EditorArticle = {
  id: string;
  title: string;
  subtitle: string;
  slug: string;
  excerpt: string;
  content_json: unknown;
  content_html: string;
  cover_url: string | null;
  cover_alt: string;
  cover_caption: string;
  cover_credit: string;
  section_id: string | null;
  column_id: string | null;
  author_id: string | null;
  featured: boolean;
  pinned: boolean;
  status: ArticleStatus;
  published_at: string | null;
  scheduled_at: string | null;
  updated_at: string;
  in_review: boolean;
  submitted_at: string | null;
  review_note: string;
};

type Option = { id: string; name: string };
type SaveState = { kind: "saved"; at: string } | { kind: "dirty" } | { kind: "saving" } | { kind: "error"; message: string };

const AUTOSAVE_MS = 2500;

function toLocalInput(iso: string | null): string {
  const d = iso ? new Date(iso) : new Date(Date.now() + 3600_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ArticleEditor({
  article,
  sections,
  authors,
  columns = [],
  role,
  notice,
}: {
  article: EditorArticle;
  sections: Option[];
  authors: Option[];
  columns?: (Option & { author_id: string })[];
  role: Role;
  notice?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const editorCanPublish = canPublish(role);
  const coordination = isCoordination(role);

  const [form, setForm] = useState(() => ({
    title: article.title,
    subtitle: article.subtitle,
    slug: article.slug,
    excerpt: article.excerpt,
    cover_url: article.cover_url ?? "",
    cover_alt: article.cover_alt,
    cover_caption: article.cover_caption,
    cover_credit: article.cover_credit,
    section_id: article.section_id ?? "",
    // Rascunho novo de quem tem coluna com nome já nasce na coluna
    column_id:
      article.column_id ??
      (!article.title && !article.content_html && article.status === "draft"
        ? (columns.find((c) => c.author_id === article.author_id)?.id ?? "")
        : ""),
    author_id: article.author_id ?? "",
    featured: article.featured,
    pinned: article.pinned,
  }));
  const content = useRef<RichValue>({ json: article.content_json, html: article.content_html });
  const [status, setStatus] = useState<ArticleStatus>(article.status);
  const [publishedAt, setPublishedAt] = useState<string | null>(article.published_at);
  const [saveState, setSaveState] = useState<SaveState>({ kind: "saved", at: article.updated_at });
  const [panel, setPanel] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleAt, setScheduleAt] = useState(() => toLocalInput(article.scheduled_at));
  const [slugTouched, setSlugTouched] = useState(!article.slug.startsWith("rascunho-"));
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);

  const dirty = useRef(false);
  const saving = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formRef = useRef(form);
  useEffect(() => {
    formRef.current = form;
  }, [form]);

  const payload = useCallback(() => {
    const { column_id, ...f } = formRef.current;
    return {
      ...f,
      // Só envia a coluna quando o recurso existe (há colunas cadastradas)
      ...(columns.length > 0 ? { column_id } : {}),
      content_json: content.current.json,
      content_html: content.current.html,
    };
  }, [columns.length]);

  const applyResult = useCallback(
    (r: SaveResult, okMessage?: string) => {
      if (r.ok) {
        setSaveState({ kind: "saved", at: r.savedAt });
        setStatus(r.status);
        setPublishedAt(r.publishedAt);
        if (okMessage) toast("success", okMessage);
      } else {
        setSaveState({ kind: "error", message: r.error });
        toast("error", r.error);
      }
      return r.ok;
    },
    [toast],
  );

  // O agendamento chama a versão mais recente de save() por meio de uma ref
  const saveRef = useRef<() => Promise<void>>(async () => {});
  const schedule = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => saveRef.current(), AUTOSAVE_MS);
  }, []);

  const save = useCallback(async () => {
    if (saving.current) return;
    saving.current = true;
    dirty.current = false;
    setSaveState({ kind: "saving" });
    const r = await saveArticle(article.id, payload());
    saving.current = false;
    if (r.ok) {
      setSaveState({ kind: "saved", at: r.savedAt });
      setStatus(r.status);
      // Se algo mudou enquanto salvava, agenda outro salvamento
      if (dirty.current) schedule();
    } else {
      dirty.current = true;
      setSaveState({ kind: "error", message: r.error });
    }
  }, [article.id, payload, schedule]);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const touch = useCallback(() => {
    dirty.current = true;
    setSaveState((s) => (s.kind === "saving" ? s : { kind: "dirty" }));
    schedule();
  }, [schedule]);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === "title" && !slugTouched && status === "draft") next.slug = slugify(String(value)) || f.slug;
      return next;
    });
    touch();
  };

  // Ctrl/Cmd+S salva; aviso ao sair com alterações não salvas
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (timer.current) clearTimeout(timer.current);
        save();
      }
    };
    const onLeave = (e: BeforeUnloadEvent) => {
      if (dirty.current || saving.current) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onLeave);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [save]);

  function transition(target: ArticleStatus, message: string, when?: string | null) {
    if (timer.current) clearTimeout(timer.current);
    start(async () => {
      setSaveState({ kind: "saving" });
      dirty.current = false;
      const r = await changeStatus(article.id, payload(), target, when ?? null);
      if (applyResult(r, message)) {
        setScheduleOpen(false);
        router.refresh();
      }
    });
  }

  async function preview() {
    if (timer.current) clearTimeout(timer.current);
    await save();
    window.open(`/admin/textos/${article.id}/previa`, "_blank", "noopener");
  }

  async function onCover(file: File) {
    setUploading(true);
    try {
      const up = await uploadImage(file, { alt: form.cover_alt, caption: form.cover_caption, credit: form.cover_credit });
      set("cover_url", up.url);
      toast("success", "Imagem de capa enviada. Lembre de preencher o texto alternativo.");
    } catch (e) {
      toast("error", (e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  const live = status === "published" || status === "scheduled";

  const indicator = (() => {
    switch (saveState.kind) {
      case "saving":
        return <span className="text-muted">Salvando…</span>;
      case "dirty":
        return <span className="text-muted">Alterações não salvas</span>;
      case "error":
        return (
          <button type="button" onClick={save} className="font-semibold text-accent underline">
            Erro ao salvar. Tentar de novo
          </button>
        );
      case "saved":
        return <span className="text-[#2f7a45] dark:text-[#9fd8b0]">Salvo às {formatTime(saveState.at)}</span>;
    }
  })();

  /* ------------------------------ Ações principais ------------------------------ */
  const actions = editorCanPublish ? (
    <>
      {status === "draft" && (
        <>
          <button type="button" className="btn-secondary hidden sm:inline-flex" onClick={() => setScheduleOpen(true)} disabled={pending}>
            Agendar
          </button>
          <button type="button" className="btn-primary" onClick={() => transition("published", "Texto publicado.")} disabled={pending}>
            Publicar
          </button>
        </>
      )}
      {status === "published" && (
        <button type="button" className="btn-primary" onClick={() => transition("published", "Alterações publicadas.")} disabled={pending}>
          Atualizar
        </button>
      )}
      {status === "scheduled" && (
        <button type="button" className="btn-primary" onClick={() => transition("published", "Texto publicado agora.")} disabled={pending}>
          Publicar agora
        </button>
      )}
      {status === "archived" && (
        <button type="button" className="btn-primary" onClick={() => transition("published", "Texto republicado.")} disabled={pending}>
          Republicar
        </button>
      )}
    </>
  ) : null;

  /* ------------------------------ Painel de detalhes ------------------------------ */
  const authorColumn = columns.find((c) => c.author_id === form.author_id) ?? null;

  const details = (
    <div className="flex flex-col gap-5">
      <section aria-labelledby="capa-t" className="flex flex-col gap-3">
        <h3 id="capa-t" className="text-sm font-semibold">
          Imagem de capa
        </h3>
        {form.cover_url ? (
          <div className="flex flex-col gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={form.cover_url} alt={form.cover_alt || "Prévia da capa"} className="aspect-video w-full rounded-md object-cover" />
            <div className="flex gap-2">
              <MediaPicker onPick={(m) => setForm((f) => ({ ...f, cover_url: m.url, cover_alt: f.cover_alt || m.alt }))} onPicked={touch} label="Trocar" />
              <button type="button" className="btn-ghost text-accent" onClick={() => set("cover_url", "")}>
                Remover
              </button>
            </div>
          </div>
        ) : (
          <label
            className={`flex min-h-36 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-rule p-4 text-center text-sm text-muted hover:border-ink ${
              uploading ? "opacity-60" : ""
            }`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) onCover(f);
            }}
          >
            <IconImage size={22} />
            <span>{uploading ? "Enviando…" : "Arraste uma imagem ou toque para escolher"}</span>
            <span className="text-xs">JPG, PNG, WebP, GIF ou AVIF · até 5 MB</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) onCover(f);
              }}
            />
          </label>
        )}
        {!form.cover_url && (
          <MediaPicker onPick={(m) => setForm((f) => ({ ...f, cover_url: m.url, cover_alt: f.cover_alt || m.alt }))} onPicked={touch} label="Escolher da biblioteca" />
        )}
        <label className="field">
          <span>
            Texto alternativo <span className="text-accent">(obrigatório com capa)</span>
          </span>
          <input className="input" value={form.cover_alt} onChange={(e) => set("cover_alt", e.target.value)} placeholder="Descreva a imagem para quem não pode vê-la" />
        </label>
        <div className="grid grid-cols-3 gap-2">
          <label className="field col-span-2">
            Legenda
            <input className="input" value={form.cover_caption} onChange={(e) => set("cover_caption", e.target.value)} />
          </label>
          <label className="field">
            Crédito
            <input className="input" value={form.cover_credit} onChange={(e) => set("cover_credit", e.target.value)} placeholder="Foto: …" />
          </label>
        </div>
      </section>

      <hr className="border-rule" />

      {authorColumn && (
        <div className="flex flex-col gap-1">
          <label className="field">
            Coluna
            <select className="input" value={form.column_id} onChange={(e) => set("column_id", e.target.value)} aria-describedby="coluna-dica">
              <option value="">Nenhuma (texto avulso)</option>
              <option value={authorColumn.id}>{authorColumn.name}</option>
            </select>
          </label>
          <span id="coluna-dica" className="text-xs text-muted">
            Textos da coluna não precisam de editoria.
          </span>
        </div>
      )}

      <label className="field">
        {form.column_id ? "Editoria (opcional)" : "Editoria"}
        <select className="input" value={form.section_id} onChange={(e) => set("section_id", e.target.value)}>
          <option value="">{form.column_id ? "Nenhuma" : "Escolha…"}</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        Autor
        <select
          className="input"
          value={form.author_id}
          onChange={(e) => {
            const author = e.target.value;
            set("author_id", author);
            // A coluna é do autor: ao trocar o autor, sai da coluna anterior
            if (form.column_id && !columns.some((c) => c.id === form.column_id && c.author_id === author)) set("column_id", "");
          }}
        >
          <option value="">Escolha…</option>
          {authors.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        Endereço (URL)
        <div className="flex items-center overflow-hidden rounded-md border border-rule focus-within:border-ink">
          <span className="shrink-0 pl-3 text-xs text-muted">/{publishedAt ? articlePath({ slug: "", published_at: publishedAt }).split("/").slice(1, 3).join("/") : "ano/mês"}/</span>
          <input
            aria-label="Endereço (URL)"
            className="min-h-11 w-full min-w-0 bg-transparent px-1 text-base outline-none sm:text-sm"
            value={form.slug}
            onChange={(e) => {
              setSlugTouched(true);
              set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
            }}
            onBlur={() => set("slug", slugify(form.slug) || slugify(form.title))}
          />
        </div>
        <span className="text-xs font-normal text-muted">
          Gerado a partir do título. {live && "Mudar o endereço de um texto publicado quebra links já compartilhados."}
        </span>
      </label>

      <label className="field">
        Resumo para redes sociais
        <textarea className="input" rows={3} maxLength={300} value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} placeholder="Aparece ao compartilhar no WhatsApp, X e e-mail." />
        <span className="text-right text-xs font-normal text-muted tabular-nums">{form.excerpt.length}/300</span>
      </label>

      {coordination && (
        <fieldset className="flex flex-col gap-1 border-t border-rule pt-4">
          <legend className="sr-only">Destaque na home</legend>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} />
            Manchete principal da home
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={form.pinned} onChange={(e) => set("pinned", e.target.checked)} />
            Fixar entre os destaques da home
          </label>
        </fieldset>
      )}

      {editorCanPublish && (
        <section className="flex flex-col gap-2 border-t border-rule pt-4">
          <h3 className="text-sm font-semibold">Publicação</h3>
          {status === "scheduled" && article.scheduled_at && (
            <p className="text-sm text-ink-soft">Agendado para {formatShort(publishedAt ?? article.scheduled_at)}.</p>
          )}
          {status === "published" && publishedAt && <p className="text-sm text-ink-soft">No ar desde {formatShort(publishedAt)}.</p>}
          <div className="flex flex-wrap gap-2">
            {(status === "draft" || status === "scheduled") && (
              <button type="button" className="btn-secondary" onClick={() => setScheduleOpen(true)}>
                {status === "scheduled" ? "Reagendar" : "Agendar publicação"}
              </button>
            )}
            {status !== "draft" && (
              <button type="button" className="btn-secondary" onClick={() => transition("draft", "O texto voltou a ser rascunho e saiu do site.")}>
                {status === "scheduled" ? "Cancelar agendamento" : "Voltar para rascunho"}
              </button>
            )}
            {status !== "archived" && status !== "draft" && (
              <ConfirmButton
                className="btn-ghost text-accent"
                title="Arquivar este texto?"
                description="Ele sai do site, mas continua guardado no painel. Você pode republicá-lo depois."
                confirmLabel="Arquivar"
                onConfirm={() => transition("archived", "Texto arquivado.")}
              >
                Arquivar
              </ConfirmButton>
            )}
          </div>
        </section>
      )}

      {(coordination || status === "draft") && (
        <div className="border-t border-rule pt-4">
          <ConfirmButton
            className="btn-ghost text-accent"
            title="Excluir definitivamente?"
            description="O texto será apagado e não poderá ser recuperado."
            confirmLabel="Excluir"
            onConfirm={async () => {
              const r = await deleteArticle(article.id);
              if (r.ok) {
                dirty.current = false;
                router.push("/admin/textos?aviso=excluido");
              } else toast("error", r.error ?? "Não foi possível excluir.");
            }}
          >
            <IconTrash size={16} /> Excluir texto
          </ConfirmButton>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      {/* Barra superior */}
      <header className="sticky top-0 z-30 flex min-h-14 flex-wrap items-center gap-x-2 gap-y-1 border-b border-rule bg-paper px-2 py-1.5 sm:px-4">
        <Link href="/admin/textos" className="btn-ghost size-11 p-0" aria-label="Voltar para a lista de textos">
          <IconArrowLeft />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col items-start text-xs sm:flex-row sm:items-center sm:gap-3 sm:text-sm" aria-live="polite">
          <StatusBadge status={status} />
          <span className="truncate">{indicator}</span>
        </div>
        <button type="button" className="btn-ghost size-11 p-0 xl:hidden" onClick={() => setPanel(true)} aria-label="Detalhes do texto">
          <IconSliders />
        </button>
        <button type="button" className="btn-secondary hidden sm:inline-flex" onClick={preview}>
          Pré-visualizar
        </button>
        {status === "published" && publishedAt && (
          <a href={articlePath({ slug: form.slug, published_at: publishedAt })} target="_blank" rel="noopener" className="btn-ghost hidden size-11 p-0 md:inline-flex" aria-label="Ver no site">
            <IconExternal />
          </a>
        )}
        {actions}
      </header>

      {notice && (
        <p role="status" className="border-b border-rule bg-[#e6edf8] px-4 py-3 text-center text-sm text-[#1f4170] dark:bg-[#1c2a40] dark:text-[#a9c4ec]">
          {notice}
        </p>
      )}


      <div className="flex flex-1">
        {/* Área de escrita */}
        <div className="min-w-0 flex-1 px-4 pt-6 pb-24 sm:px-8 sm:pt-10">
          <div className="mx-auto max-w-[68ch]">
            <label htmlFor="titulo" className="sr-only">
              Título
            </label>
            <textarea
              id="titulo"
              rows={2}
              value={form.title}
              onChange={(e) => set("title", e.target.value.replace(/\n/g, " "))}
              placeholder="Título"
              className="w-full resize-none border-0 bg-transparent p-0 font-sans text-[28px] leading-[1.12] font-bold tracking-[-0.025em] outline-none placeholder:text-muted/60 [field-sizing:content] sm:text-[40px]"
            />
            <label htmlFor="linha-fina" className="sr-only">
              Linha fina
            </label>
            <textarea
              id="linha-fina"
              rows={2}
              value={form.subtitle}
              onChange={(e) => set("subtitle", e.target.value.replace(/\n/g, " "))}
              placeholder="Linha fina: um resumo de uma ou duas frases"
              className="mt-3 w-full resize-none border-0 bg-transparent p-0 font-serif text-lg leading-snug text-ink-soft outline-none placeholder:text-muted/60 [field-sizing:content] sm:text-[21px]"
            />
            <div className="mt-4 border-t border-rule" />
            <RichEditor
              initial={article.content_json ?? article.content_html}
              onChange={(v) => {
                content.current = v;
                touch();
              }}
              stickyTop="top-[57px]"
            />
          </div>
        </div>

        {/* Detalhes: barra lateral no computador */}
        <aside aria-label="Detalhes do texto" className="hidden w-[22rem] shrink-0 overflow-y-auto border-l border-rule p-5 xl:block">
          {details}
        </aside>
      </div>

      {/* Detalhes: folha em tela cheia no celular/tablet */}
      {panel && (
        <div className="fixed inset-0 z-40 flex flex-col bg-paper xl:hidden" role="dialog" aria-modal="true" aria-label="Detalhes do texto">
          <div className="flex h-14 items-center justify-between border-b border-rule px-4">
            <h2 className="font-semibold">Detalhes</h2>
            <button type="button" className="btn-ghost size-11 p-0" onClick={() => setPanel(false)} aria-label="Fechar detalhes">
              <IconClose />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 pb-10">
            <button type="button" className="btn-secondary mb-5 w-full sm:hidden" onClick={preview}>
              Pré-visualizar
            </button>
            {details}
          </div>
        </div>
      )}

      {/* Diálogo de agendamento */}
      {scheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="agendar-t">
          <div className="w-full max-w-sm rounded-t-xl bg-paper p-6 sm:rounded-lg">
            <h2 id="agendar-t" className="font-display text-2xl">
              Agendar publicação
            </h2>
            <p className="mt-1 text-sm text-ink-soft">O texto entra no site automaticamente na data e hora escolhidas.</p>
            <label className="field mt-4">
              Data e hora
              <input type="datetime-local" className="input" value={scheduleAt} min={toLocalInput(new Date().toISOString())} onChange={(e) => setScheduleAt(e.target.value)} />
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setScheduleOpen(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={pending}
                onClick={() => {
                  const iso = new Date(scheduleAt).toISOString();
                  transition("scheduled", `Agendado para ${formatShort(iso)}.`, iso);
                }}
              >
                Agendar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
