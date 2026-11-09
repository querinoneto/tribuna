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
  const { consent: _consent, terms: _terms, first_name, last_name, ...rest } = parsed.data;
  void _consent;
  void _terms;
  // Nome e sobrenome são obrigatórios; no banco ficam juntos, como serão assinados
  const data = { ...rest, name: `${first_name} ${last_name}`.replace(/\s+/g, " ").trim() };

  const db = createPublicClient();
  if (!db) return { ok: false, error: "Envios indisponíveis no momento." };

  // Versão do termo aceito = data da última atualização da página do termo
  const { data: termo } = await db.from("pages").select("updated_at").eq("slug", "termos-de-colaboracao").maybeSingle();
  if (!termo) return { ok: false, error: "O termo de colaboração está indisponível no momento. Tente mais tarde." };
  const terms_version = `termos-de-colaboracao@${termo.updated_at}`;

  const { error } = await db.from("submissions").insert({ ...data, photo_path: data.first_time ? data.photo_path : null, terms_version });
  if (error) {
    if (error.code === "54000") return { ok: false, error: "Muitos envios seguidos com este e-mail. Tente de novo mais tarde." };
    return { ok: false, error: "Não foi possível concluir o envio. Tente de novo em instantes." };
  }
  return { ok: true };
}
