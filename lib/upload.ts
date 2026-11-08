"use client";

import { createClient } from "@/lib/supabase/browser";
import { slugify } from "@/lib/slug";
import { validateImageFile } from "@/lib/validation";

export type Uploaded = { id: string; url: string; width: number | null; height: number | null };

async function dimensions(file: File): Promise<{ width: number | null; height: number | null }> {
  try {
    const bmp = await createImageBitmap(file);
    const d = { width: bmp.width, height: bmp.height };
    bmp.close();
    return d;
  } catch {
    return { width: null, height: null };
  }
}

/**
 * Envia uma imagem para o Storage do Supabase (bucket "media") e registra na
 * biblioteca. O tamanho (5 MB) e o tipo são conferidos aqui e de novo pelo
 * próprio bucket, que recusa qualquer coisa fora da regra.
 */
export async function uploadImage(
  file: File,
  meta: { alt?: string; caption?: string; credit?: string } = {},
): Promise<Uploaded> {
  const invalid = validateImageFile(file);
  if (invalid) throw new Error(invalid);

  const supabase = createClient();
  const now = new Date();
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const base = slugify(file.name.replace(/\.[^.]+$/, ""), 40) || "imagem";
  const path = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${crypto.randomUUID().slice(0, 8)}-${base}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("media")
    .upload(path, file, { cacheControl: "31536000", contentType: file.type, upsert: false });
  if (upErr) {
    if (/size|large/i.test(upErr.message)) throw new Error("A imagem passa do limite de 5 MB.");
    if (/mime|type/i.test(upErr.message)) throw new Error("Formato de imagem não aceito.");
    throw new Error("Não foi possível enviar a imagem. Tente de novo.");
  }

  const { data: pub } = supabase.storage.from("media").getPublicUrl(path);
  const { width, height } = await dimensions(file);

  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("media")
    .insert({
      path,
      url: pub.publicUrl,
      alt: meta.alt ?? "",
      caption: meta.caption ?? "",
      credit: meta.credit ?? "",
      width,
      height,
      size_bytes: file.size,
      mime_type: file.type,
      uploaded_by: userData.user?.id,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error("A imagem foi enviada, mas não entrou na biblioteca. Tente de novo.");

  return { id: data.id, url: pub.publicUrl, width, height };
}
