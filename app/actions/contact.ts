"use server";

import { createPublicClient } from "@/lib/supabase/public";
import { contactSchema } from "@/lib/validation";

export type ContactState = { ok?: boolean; error?: string; key?: number };

/** Formulário da página Contato (visitantes, sem conta). Só o administrador lê. */
export async function sendContact(_: ContactState, fd: FormData): Promise<ContactState> {
  const key = Date.now();
  // Campo-armadilha contra robôs: pessoas não veem nem preenchem
  if (String(fd.get("site") ?? "")) return { ok: true, key };

  const parsed = contactSchema.safeParse({
    first_name: fd.get("first_name"),
    last_name: fd.get("last_name"),
    email: fd.get("email"),
    message: fd.get("message"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Confira os campos.", key };
  if (fd.get("consent") !== "on") return { ok: false, error: "Para enviar, marque que concorda com a Política de privacidade.", key };

  const db = createPublicClient();
  if (!db) return { ok: false, error: "O formulário está indisponível no momento.", key };

  const { error } = await db.from("contact_messages").insert(parsed.data);
  if (error) {
    if (error.code === "54000") return { ok: false, error: "Muitas mensagens seguidas. Tente de novo mais tarde.", key };
    return { ok: false, error: "Não foi possível enviar agora. Tente de novo em instantes.", key };
  }
  return { ok: true, key };
}
