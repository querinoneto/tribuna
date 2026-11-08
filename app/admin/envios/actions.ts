"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { readingTime } from "@/lib/format";
import { dbErrorMessage } from "@/lib/publishing";
import { sanitizeArticleHtml } from "@/lib/sanitize";
import { slugify } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";
import { PHOTO_FILE_TYPES, fileExtension } from "@/lib/validation";

type Supabase = Awaited<ReturnType<typeof createClient>>;

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

/* ------------------------------------------------------------------ */
/* Preparar para publicação                                           */
/* ------------------------------------------------------------------ */

const WORD_STYLES = [
  "p[style-name='Title'] => h2:fresh",
  "p[style-name='Título'] => h2:fresh",
  "p[style-name='Heading 1'] => h2:fresh",
  "p[style-name='Título 1'] => h2:fresh",
  "p[style-name='Heading 2'] => h2:fresh",
  "p[style-name='Título 2'] => h2:fresh",
  "p[style-name='Heading 3'] => h3:fresh",
  "p[style-name='Título 3'] => h3:fresh",
  "p[style-name='Quote'] => blockquote > p:fresh",
  "p[style-name='Citação'] => blockquote > p:fresh",
];

/** Converte um .docx em HTML limpo no formato do editor (sem imagens). */
async function wordToHtml(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.convertToHtml({ buffer }, { styleMap: WORD_STYLES });
  const html = value
    .replace(/<img[^>]*>/gi, "")
    .replace(/<(\/?)h1>/gi, "<$1h2>")
    .replace(/<(\/?)h[4-6]>/gi, "<$1h3>")
    .replace(/<p>\s*<\/p>/gi, "");
  return sanitizeArticleHtml(html);
}

/** Endereço único para a página do autor (ex.: maria-silva, maria-silva-2). */
async function uniqueAuthorSlug(supabase: Supabase, name: string): Promise<string> {
  const base = slugify(name, 60) || "colaboracao";
  const { data } = await supabase.from("authors").select("slug").like("slug", `${base}%`);
  const taken = new Set((data ?? []).map((a) => a.slug));
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
}

/** Copia a foto do envio (bucket privado) para a biblioteca pública de mídia. */
async function publishPhoto(supabase: Supabase, staffId: string, photoPath: string, name: string): Promise<string | null> {
  const { data: blob, error } = await supabase.storage.from("envios").download(photoPath);
  if (error || !blob) return null;
  const ext = fileExtension(photoPath);
  const now = new Date();
  const path = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${crypto.randomUUID().slice(0, 8)}-${slugify(name, 40) || "colaboracao"}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("media")
    .upload(path, blob, { contentType: PHOTO_FILE_TYPES[ext], cacheControl: "31536000", upsert: false });
  if (upErr) return null;
  const { data: pub } = supabase.storage.from("media").getPublicUrl(path);
  await supabase.from("media").insert({
    path,
    url: pub.publicUrl,
    alt: `Foto de ${name}`,
    size_bytes: blob.size,
    mime_type: PHOTO_FILE_TYPES[ext],
    uploaded_by: staffId,
  });
  return pub.publicUrl;
}

/**
 * Transforma um envio em rascunho pronto para revisar:
 * 1. cadastra a pessoa como COLABORADORA (nunca como colunista) ou
 *    reaproveita o cadastro, se ela já mandou textos antes;
 * 2. publica a foto dela na biblioteca e usa como foto do autor;
 * 3. cria o rascunho com título e autor preenchidos e, se o arquivo for
 *    Word (.docx), com o texto já importado;
 * 4. marca o envio como lido e abre o editor.
 */
export async function prepareSubmission(id: string): Promise<EnvioResult> {
  const staff = await requireRole("admin", "editor");
  const supabase = await createClient();

  const { data: s } = await supabase.from("submissions").select("*").eq("id", id).maybeSingle();
  if (!s) return { ok: false, error: "Envio não encontrado." };

  // Já preparado antes? Só abre o rascunho.
  if (s.article_id) {
    const { data: existing } = await supabase.from("articles").select("id").eq("id", s.article_id).maybeSingle();
    if (existing) redirect(`/admin/textos/${existing.id}`);
  }

  // 1. Autor: o mesmo da última colaboração desta pessoa…
  let authorId: string | null = s.author_id;
  if (!authorId) {
    const { data: prev } = await supabase
      .from("submissions")
      .select("author_id")
      .eq("email", s.email)
      .not("author_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1);
    authorId = prev?.[0]?.author_id ?? null;
  }
  // …ou, se ela diz que já publicou, um autor com exatamente o mesmo nome
  if (!authorId && !s.first_time) {
    const { data: same } = await supabase.from("authors").select("id").ilike("name", s.name.replace(/[%_]/g, ""));
    if (same?.length === 1) authorId = same[0].id;
  }

  let reused = Boolean(authorId);
  if (authorId) {
    const { data: a } = await supabase.from("authors").select("id, avatar_url").eq("id", authorId).maybeSingle();
    if (!a) {
      authorId = null;
      reused = false;
    } else if (!a.avatar_url && s.photo_path) {
      const avatar = await publishPhoto(supabase, staff.id, s.photo_path, s.name);
      if (avatar) await supabase.from("authors").update({ avatar_url: avatar }).eq("id", a.id);
    }
  }

  if (!authorId) {
    const avatar = s.photo_path ? await publishPhoto(supabase, staff.id, s.photo_path, s.name) : null;
    const { data: created, error } = await supabase
      .from("authors")
      .insert({
        name: s.name,
        slug: await uniqueAuthorSlug(supabase, s.name),
        avatar_url: avatar,
        is_columnist: false,
        is_contributor: true,
      })
      .select("id")
      .single();
    if (error || !created) return { ok: false, error: `Não foi possível cadastrar a colaboração: ${dbErrorMessage(error)}` };
    authorId = created.id;
  }

  // 2. Texto: importa o Word (.docx); PDF e .doc antigo precisam ser colados à mão
  let contentHtml = "";
  let imported = false;
  if (fileExtension(s.file_path) === "docx") {
    const { data: file } = await supabase.storage.from("envios").download(s.file_path);
    if (file) {
      try {
        contentHtml = await wordToHtml(Buffer.from(await file.arrayBuffer()));
        imported = contentHtml.length > 0;
      } catch {
        imported = false;
      }
    }
  }

  // 3. Rascunho
  const { data: article, error: artErr } = await supabase
    .from("articles")
    .insert({
      title: s.title,
      slug: `${slugify(s.title || s.name, 60) || "colaboracao"}-${Date.now().toString(36)}`,
      status: "draft",
      author_id: authorId,
      created_by: staff.id,
      content_html: contentHtml,
      content_json: null,
      reading_minutes: readingTime(contentHtml),
    })
    .select("id")
    .single();
  if (artErr || !article) return { ok: false, error: `Não foi possível criar o rascunho: ${dbErrorMessage(artErr)}` };

  // 4. Liga o envio ao autor e ao rascunho
  await supabase.from("submissions").update({ author_id: authorId, article_id: article.id, status: "lido" }).eq("id", s.id);
  revalidatePath("/admin/envios");

  const notes = [
    reused ? "colaboração-existente" : "colaboracao-nova",
    imported ? "texto-importado" : fileExtension(s.file_path) === "docx" ? "texto-falhou" : "texto-pdf",
  ].join(",");
  redirect(`/admin/textos/${article.id}?preparado=${notes}`);
}
