"use server";

import { createPublicClient } from "@/lib/supabase/public";
import { emailSchema } from "@/lib/validation";

export type NewsletterState = { ok?: boolean; message?: string };

/** Inscrição na newsletter (visitantes, sem conta). */
export async function subscribe(_: NewsletterState, fd: FormData): Promise<NewsletterState> {
  // Campo-armadilha contra robôs: pessoas não veem nem preenchem
  if (String(fd.get("site") ?? "")) return { ok: true, message: "Inscrição confirmada. Obrigado!" };

  const parsed = emailSchema.safeParse(fd.get("email"));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Digite um e-mail válido." };

  const db = createPublicClient();
  if (!db) return { ok: false, message: "Inscrições indisponíveis no momento." };

  const { error } = await db.from("subscribers").insert({ email: parsed.data });
  // E-mail repetido conta como sucesso (sem revelar quem já está na lista)
  if (error && error.code !== "23505") {
    return { ok: false, message: "Não foi possível concluir a inscrição. Tente de novo em instantes." };
  }
  return { ok: true, message: "Inscrição confirmada. Obrigado!" };
}
