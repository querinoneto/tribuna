"use server";

import { createCaptcha, type Captcha } from "@/lib/captcha";

/** Nova imagem do captcha (chamada pelo formulário de Contato). */
export async function newCaptcha(): Promise<Captcha> {
  return createCaptcha();
}
