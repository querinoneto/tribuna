"use server";

import { inspectFile } from "@/lib/security/files";
import { cleanVisitorText, countLinks } from "@/lib/security/text";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";
import { firstError, submissionSchema } from "@/lib/validation";

export type SubmissionResult = { ok: true } | { ok: false; error: string };

const TEXT_FIELDS = ["first_name", "last_name", "email", "title", "subtitle", "message", "file_name"] as const;

/**
 * Confere o conteúdo real dos arquivos já enviados ao bucket privado (não
 * só a extensão). Arquivo perigoso ou falso é apagado e o envio recusado.
 * Sem a chave secreta do Supabase, a conferência fica para o painel (Envios).
 */
async function checkFiles(paths: { path: string; kind: "texto" | "foto" }[]): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  for (const { path, kind } of paths) {
    const { data, error } = await admin.storage.from("envios").download(path);
    if (error || !data) return "Não encontramos o arquivo enviado. Envie de novo.";
    const result = inspectFile(path, new Uint8Array(await data.arrayBuffer()), kind);
    if (!result.ok) {
      await admin.storage.from("envios").remove(paths.map((p) => p.path));
      return `O arquivo foi recusado por segurança: ${result.reason}. Salve uma cópia limpa (por exemplo, “Salvar como” .docx ou PDF comum) e envie de novo.`;
    }
  }
  return null;
}

/**
 * Registra um envio de texto. Os arquivos já foram enviados pelo navegador
 * direto para o bucket privado "envios"; aqui conferimos o conteúdo deles e
 * gravamos os dados. O banco confere de novo os caminhos, a foto obrigatória
 * e o limite de envios.
 */
export async function submitText(raw: unknown): Promise<SubmissionResult> {
  // Sem caracteres invisíveis (que escondem instruções ou trechos do texto)
  const input = { ...((raw ?? {}) as Record<string, unknown>) };
  for (const f of TEXT_FIELDS) if (typeof input[f] === "string") input[f] = cleanVisitorText(input[f] as string);

  const parsed = submissionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { consent: _consent, terms: _terms, first_name, last_name, ...rest } = parsed.data;
  void _consent;
  void _terms;
  if (/[<>]/.test(first_name + last_name)) return { ok: false, error: "O nome não pode ter os sinais < ou >." };
  if (countLinks(rest.message) > 3) return { ok: false, error: "A mensagem tem links demais. Deixe no máximo 3." };
  // Nome e sobrenome são obrigatórios; no banco ficam juntos, como serão assinados
  const data = { ...rest, name: `${first_name} ${last_name}`.replace(/\s+/g, " ").trim() };

  const db = createPublicClient();
  if (!db) return { ok: false, error: "Envios indisponíveis no momento." };

  const files: { path: string; kind: "texto" | "foto" }[] = [{ path: data.file_path, kind: "texto" }];
  if (data.first_time && data.photo_path) files.push({ path: data.photo_path, kind: "foto" });
  const rejected = await checkFiles(files);
  if (rejected) return { ok: false, error: rejected };

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
