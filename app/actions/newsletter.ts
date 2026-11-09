"use server";

import { subscribe as subscribeEmail } from "@/lib/newsletter/service";
import { emailSchema } from "@/lib/validation";

export type NewsletterState = { ok?: boolean; message?: string };

/** Assinatura por e-mail (visitantes, sem conta), com confirmação por e-mail. */
export async function subscribe(_: NewsletterState, fd: FormData): Promise<NewsletterState> {
  // Campo-armadilha contra robôs: pessoas não veem nem preenchem
  if (String(fd.get("site") ?? "")) return { ok: true, message: "Quase lá! Confira seu e-mail para confirmar a assinatura." };

  const parsed = emailSchema.safeParse(fd.get("email"));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Digite um e-mail válido." };

  switch (await subscribeEmail(parsed.data)) {
    case "confirmacao-enviada":
      return { ok: true, message: "Quase lá! Enviamos um e-mail para você confirmar a assinatura. Confira também a caixa de spam." };
    case "ja-ativa":
      return { ok: true, message: "Este e-mail já está assinado. Obrigado!" };
    case "registrada":
      return { ok: true, message: "Assinatura registrada. Em breve você receberá um e-mail para confirmá-la." };
    default:
      return { ok: false, message: "Não foi possível concluir a assinatura. Tente de novo em instantes." };
  }
}
