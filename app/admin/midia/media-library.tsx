"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ConfirmButton } from "@/components/admin/confirm";
import { useToast } from "@/components/admin/toast";
import { IconLink, IconUpload } from "@/components/icons";
import { formatShort } from "@/lib/format";
import { uploadImage } from "@/lib/upload";
import { deleteMedia, updateMedia } from "../crud-actions";

type M = {
  id: string;
  url: string;
  alt: string;
  caption: string;
  credit: string;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  uploaded_by: string | null;
  created_at: string;
};

export function MediaLibrary({ initial, userId, canEditAll }: { initial: M[]; userId: string; canEditAll: boolean }) {
  const toast = useToast();
  const router = useRouter();
  const [drag, setDrag] = useState(false);
  const [queue, setQueue] = useState<string[]>([]);
  const [selected, setSelected] = useState<M | null>(null);
  const [pending, start] = useTransition();

  async function upload(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    setQueue(list.map((f) => f.name));
    let ok = 0;
    for (const f of list) {
      try {
        await uploadImage(f);
        ok++;
      } catch (e) {
        toast("error", `${f.name}: ${(e as Error).message}`);
      }
      setQueue((q) => q.slice(1));
    }
    if (ok) toast("success", ok === 1 ? "Imagem enviada." : `${ok} imagens enviadas.`);
    router.refresh();
  }

  const canEdit = (m: M) => canEditAll || m.uploaded_by === userId;

  return (
    <div>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          upload(e.dataTransfer.files);
        }}
        className={`flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          drag ? "border-accent bg-accent/5" : "border-rule bg-paper hover:border-ink"
        }`}
      >
        <IconUpload size={28} />
        <span className="font-semibold">{queue.length ? `Enviando ${queue[0]}… (${queue.length} na fila)` : "Enviar imagens"}</span>
        <span className="text-sm text-muted">Arraste e solte aqui ou toque para escolher · JPG, PNG, WebP, GIF, AVIF · até 5 MB cada</span>
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          className="sr-only"
          onChange={(e) => {
            if (e.target.files) upload(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      {initial.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted">A biblioteca está vazia.</p>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {initial.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => setSelected(m)}
                className="group block w-full overflow-hidden rounded-md border border-rule bg-paper text-left hover:border-ink"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.url} alt={m.alt || ""} className="aspect-video w-full object-cover" loading="lazy" />
                <span className="block truncate px-2 py-1.5 text-xs text-muted">
                  {m.alt || <span className="text-accent">Sem texto alternativo</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Detalhes da imagem">
          <form
            className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-xl bg-paper p-5 sm:rounded-lg"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              start(async () => {
                const r = await updateMedia(selected.id, {
                  alt: String(fd.get("alt") ?? ""),
                  caption: String(fd.get("caption") ?? ""),
                  credit: String(fd.get("credit") ?? ""),
                });
                toast(r.ok ? "success" : "error", r.ok ? r.message! : r.error!);
                if (r.ok) {
                  setSelected(null);
                  router.refresh();
                }
              });
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selected.url} alt={selected.alt} className="max-h-72 w-full rounded-md object-contain" />
            <p className="mt-2 text-xs text-muted">
              {selected.width && selected.height ? `${selected.width}×${selected.height} · ` : ""}
              {selected.size_bytes ? `${Math.round(selected.size_bytes / 1024)} KB · ` : ""}
              enviada em {formatShort(selected.created_at)}
            </p>
            <fieldset disabled={!canEdit(selected)} className="mt-4 flex flex-col gap-3">
              <label className="field">
                Texto alternativo
                <input name="alt" className="input" defaultValue={selected.alt} maxLength={300} />
              </label>
              <label className="field">
                Legenda
                <input name="caption" className="input" defaultValue={selected.caption} maxLength={400} />
              </label>
              <label className="field">
                Crédito
                <input name="credit" className="input" defaultValue={selected.credit} maxLength={120} />
              </label>
            </fieldset>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn-ghost"
                onClick={async () => {
                  await navigator.clipboard.writeText(selected.url);
                  toast("success", "Endereço da imagem copiado.");
                }}
              >
                <IconLink size={16} /> Copiar endereço
              </button>
              <span className="flex-1" />
              {canEdit(selected) && (
                <ConfirmButton
                  className="btn-ghost text-accent"
                  title="Apagar esta imagem?"
                  description="O arquivo será removido. Textos que usam esta imagem ficarão sem ela."
                  confirmLabel="Apagar"
                  onConfirm={async () => {
                    const r = await deleteMedia(selected.id);
                    toast(r.ok ? "success" : "error", r.ok ? r.message! : r.error!);
                    if (r.ok) {
                      setSelected(null);
                      router.refresh();
                    }
                  }}
                >
                  Apagar
                </ConfirmButton>
              )}
              <button type="button" className="btn-secondary" onClick={() => setSelected(null)}>
                Fechar
              </button>
              {canEdit(selected) && (
                <button type="submit" className="btn-primary" disabled={pending}>
                  Salvar
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
