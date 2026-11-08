"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { dbErrorMessage } from "@/lib/publishing";
import { createClient } from "@/lib/supabase/server";

export type EnvioResult = { ok: boolean; message?: string; error?: string };

export async function setSubmissionStatus(id: string, status: "novo" | "lido" | "arquivado"): Promise<EnvioResult> {
  await requireRole("admin", "editor");
  const supabase = await createClient();
  const { error } = await supabase.from("submissions").update({ status }).eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  revalidatePath("/admin/envios");
  return { ok: true, message: status === "arquivado" ? "Envio arquivado." : status === "lido" ? "Marcado como lido." : "Marcado como novo." };
}

export async function deleteSubmission(id: string): Promise<EnvioResult> {
  await requireRole("admin", "editor");
  const supabase = await createClient();
  const { data: s } = await supabase.from("submissions").select("file_path, photo_path").eq("id", id).maybeSingle();
  if (!s) return { ok: false, error: "Envio não encontrado." };
  await supabase.storage.from("envios").remove([s.file_path, s.photo_path].filter((p): p is string => Boolean(p)));
  const { error } = await supabase.from("submissions").delete().eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  revalidatePath("/admin/envios");
  return { ok: true, message: "Envio e arquivos apagados." };
}
