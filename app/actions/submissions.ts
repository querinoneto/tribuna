"use server";

import { createPublicClient } from "@/lib/supabase/public";
import { firstError, submissionSchema } from "@/lib/validation";

export type SubmissionResult = { ok: true } | { ok: false; error: string };

/**
 * Registra um envio de texto. Os arquivos já foram enviados pelo navegador
 * direto para o bucket privado "envios"; aqui só gravamos os dados.
 * O banco confere de novo os caminhos, a foto obrigatória e o limite de envios.
 */
export async function submitText(raw: unknown): Promise<SubmissionResult> {
  const parsed = submissionSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { consent: _consent, first_name, last_name, ...rest } = parsed.data;
  void _consent;
  // Nome e sobrenome são obrigatórios; no banco ficam juntos, como serão assinados
  const data = { ...rest, name: `${first_name} ${last_name}`.replace(/\s+/g, " ").trim() };

  const db = createPublicClient();
  if (!db) return { ok: false, error: "Envios indisponíveis no momento." };

  const { error } = await db.from("submissions").insert({ ...data, photo_path: data.first_time ? data.photo_path : null });
  if (error) {
    if (error.code === "54000") return { ok: false, error: "Muitos envios seguidos com este e-mail. Tente de novo mais tarde." };
    return { ok: false, error: "Não foi possível concluir o envio. Tente de novo em instantes." };
  }
  return { ok: true };
}
