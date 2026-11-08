"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

type Media = { id: string; url: string; alt: string };

/** Escolher uma imagem já enviada para a biblioteca. */
export function MediaPicker({
  onPick,
  onPicked,
  label = "Escolher da biblioteca",
}: {
  onPick: (m: Media) => void;
  onPicked?: () => void;
  label?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [items, setItems] = useState<Media[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    ref.current?.showModal();
    setError(null);
    const { data, error } = await createClient()
      .from("media")
      .select("id, url, alt")
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) setError("Não foi possível carregar a biblioteca.");
    setItems(data ?? []);
  }

  return (
    <>
      <button type="button" className="btn-secondary" onClick={open}>
        {label}
      </button>
      <dialog ref={ref} className="m-auto w-[min(94vw,48rem)] rounded-lg border border-rule bg-paper p-0 text-ink backdrop:bg-black/50">
        <div className="flex items-center justify-between border-b border-rule p-4">
          <h2 className="font-display text-2xl">Biblioteca de imagens</h2>
          <button type="button" className="btn-ghost" onClick={() => ref.current?.close()}>
            Fechar
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-4">
          {error && <p role="alert" className="text-sm text-accent">{error}</p>}
          {items === null && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="skeleton aspect-video rounded-md" />
              ))}
            </div>
          )}
          {items?.length === 0 && <p className="py-10 text-center text-sm text-muted">Nenhuma imagem enviada ainda.</p>}
          {items && items.length > 0 && (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {items.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    className="block w-full overflow-hidden rounded-md border border-rule hover:border-ink focus-visible:border-ink"
                    onClick={() => {
                      onPick(m);
                      onPicked?.();
                      ref.current?.close();
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.url} alt={m.alt || "Imagem sem descrição"} className="aspect-video w-full object-cover" loading="lazy" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </dialog>
    </>
  );
}
