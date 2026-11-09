"use client";

import { useState } from "react";
import { ActionForm } from "@/components/admin/action-form";
import { SubmitButton } from "@/components/admin/submit-button";
import { useToast } from "@/components/admin/toast";
import { uploadImage } from "@/lib/upload";
import { saveMyProfile } from "./actions";

export function ProfileForm({ initial }: { initial: { name: string; bio: string; avatar_url: string } }) {
  const toast = useToast();
  const [photo, setPhoto] = useState(initial.avatar_url);
  const [uploading, setUploading] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const up = await uploadImage(file, { alt: `Foto de ${initial.name}` });
      setPhoto(up.url);
      toast("success", "Foto enviada. Clique em Salvar para confirmar.");
    } catch (e) {
      toast("error", (e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <ActionForm action={saveMyProfile} className="flex flex-col gap-4">
      <input type="hidden" name="avatar_url" value={photo} />
      <div className="flex items-center gap-4">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="size-24 rounded-full object-cover" />
        ) : (
          <span aria-hidden className="flex size-24 items-center justify-center rounded-full bg-paper-2 text-3xl font-semibold">
            {initial.name.charAt(0).toUpperCase()}
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
      <label className="field">
        Nome
        <input name="name" className="input" defaultValue={initial.name} required maxLength={120} />
      </label>
      <label className="field">
        Mini biografia
        <textarea name="bio" rows={4} className="input" defaultValue={initial.bio} maxLength={600} placeholder="Ex.: Advogada, pesquisadora de direito do trabalho e militante sindical." />
      </label>
      <div>
        <SubmitButton className="btn-primary" disabled={uploading}>
          Salvar
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
