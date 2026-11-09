"use client";

import { useState } from "react";
import { ActionForm } from "@/components/admin/action-form";
import { ColumnNameField } from "@/components/admin/column-name-field";
import { NameBioFields } from "@/components/admin/name-bio-fields";
import { SubmitButton } from "@/components/admin/submit-button";
import { useToast } from "@/components/admin/toast";
import { uploadImage } from "@/lib/upload";
import { saveAuthor } from "../crud-actions";

type A = { id: string; name: string; slug: string; bio: string; avatar_url: string; columnist: boolean; column_name?: string };

export function AuthorForm({ author }: { author: A }) {
  const toast = useToast();
  const [photo, setPhoto] = useState(author.avatar_url);
  const [uploading, setUploading] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const up = await uploadImage(file, { alt: `Foto de ${author.name}` });
      setPhoto(up.url);
      toast("success", "Foto enviada. Clique em Salvar para confirmar.");
    } catch (e) {
      toast("error", (e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <ActionForm action={saveAuthor} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={author.id} />
      <input type="hidden" name="avatar_url" value={photo} />

      <div className="flex items-center gap-4">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="size-20 rounded-full object-cover" />
        ) : (
          <span aria-hidden className="flex size-20 items-center justify-center rounded-full bg-paper-2 text-2xl font-semibold">
            {author.name.charAt(0)}
          </span>
        )}
        <div className="flex flex-wrap gap-2">
          <label className={`btn-secondary cursor-pointer ${uploading ? "pointer-events-none opacity-60" : ""}`}>
            {uploading ? "Enviando…" : photo ? "Trocar foto" : "Enviar foto"}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          {photo && (
            <button type="button" className="btn-ghost text-accent" onClick={() => setPhoto("")}>
              Remover foto
            </button>
          )}
        </div>
      </div>

      <NameBioFields name={author.name} bio={author.bio} requireSurname={author.columnist} />
      {author.columnist && <ColumnNameField value={author.column_name ?? ""} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="field">
          Endereço da página
          <div className="flex items-center overflow-hidden rounded-md border border-rule focus-within:border-ink">
            <span className="pl-3 text-sm text-muted">/autor/</span>
            <input name="slug" className="input border-0 pl-1" defaultValue={author.slug} />
          </div>
        </label>
      </div>

      <div>
        <SubmitButton className="btn-primary" disabled={uploading}>
          Salvar
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
