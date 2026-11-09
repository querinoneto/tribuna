"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { dbErrorMessage } from "@/lib/publishing";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "../crud-actions";

export async function setMessageRead(id: string, read: boolean): Promise<FormState> {
  await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase
    .from("contact_messages")
    .update({ read_at: read ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error), key: Date.now() };
  revalidatePath("/admin/contato");
  return { ok: true, message: read ? "Marcada como lida." : "Marcada como não lida.", key: Date.now() };
}

export async function deleteMessage(id: string): Promise<FormState> {
  await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase.from("contact_messages").delete().eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error), key: Date.now() };
  revalidatePath("/admin/contato");
  return { ok: true, message: "Mensagem apagada.", key: Date.now() };
}
