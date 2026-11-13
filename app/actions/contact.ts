"use server";

import { CAPTCHA_MESSAGES, checkCaptcha } from "@/lib/captcha";
import { cleanVisitorText, countLinks } from "@/lib/security/text";
import { createPublicClient } from "@/lib/supabase/public";
import { contactSchema } from "@/lib/validation";

export type ContactState = { ok?: boolean; error?: string; key?: number };

/** Formulário da página Contato (visitantes, sem conta). Só o administrador lê. */
export async function sendContact(_: ContactState, fd: FormData): Promise<ContactState> {
  const key = Date.now();
  // Campo-armadilha contra robôs: pessoas não veem nem preenchem
  if (String(fd.get("site") ?? "")) return { ok: true, key };

  // Captcha: os números da imagem
  const captcha = checkCaptcha(fd.get("captcha_token"), fd.get("captcha_answer"));
  if (captcha !== "ok") return { ok: false, error: CAPTCHA_MESSAGES[captcha], key };

  // Sem caracteres invisíveis (que escondem instruções ou trechos do texto)
  const text = (name: string) => cleanVisitorText(String(fd.get(name) ?? ""));
  const parsed = contactSchema.safeParse({
    first_name: text("first_name"),
    last_name: text("last_name"),
    email: text("email"),
    message: text("message"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Confira os campos.", key };
  if (fd.get("consent") !== "on") return { ok: false, error: "Para enviar, marque que concorda com a Política de privacidade.", key };
  if (/[<>]/.test(parsed.data.first_name + parsed.data.last_name)) return { ok: false, error: "O nome não pode ter os sinais < ou >.", key };
  if (countLinks(parsed.data.message) > 3) return { ok: false, error: "A mensagem tem links demais. Deixe no máximo 3.", key };

  const db = createPublicClient();
  if (!db) return { ok: false, error: "O formulário está indisponível no momento.", key };

  const { error } = await db.from("contact_messages").insert(parsed.data);
  if (error) {
    if (error.code === "54000") return { ok: false, error: "Muitas mensagens seguidas. Tente de novo mais tarde.", key };
    return { ok: false, error: "Não foi possível enviar agora. Tente de novo em instantes.", key };
  }
  return { ok: true, key };
}
