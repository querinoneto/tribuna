"use server";

import { redirect } from "next/navigation";
import { getStaff, requireStaff } from "@/lib/auth";
import { readingTime } from "@/lib/format";
import { dbErrorMessage, planTransition } from "@/lib/publishing";
import { revalidateContent } from "@/lib/revalidate";
import { sanitizeArticleHtml } from "@/lib/sanitize";
import { slugify } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";
import type { ArticleStatus } from "@/lib/types";
import { articleSchema, firstError, type ArticleInput } from "@/lib/validation";

export type SaveResult = { ok: true; savedAt: string; status: ArticleStatus; publishedAt: string | null } | { ok: false; error: string };

/** Cria um rascunho vazio e abre o editor. */
export async function createArticle() {
  const staff = await requireStaff();
  const supabase = await createClient();

  // Assina pelo autor ligado à conta, se houver
  const { data: author } = await supabase.from("authors").select("id").eq("profile_id", staff.id).maybeSingle();

  const { data, error } = await supabase
    .from("articles")
    .insert({
      title: "",
      slug: `rascunho-${Date.now().toString(36)}`,
      status: "draft",
      author_id: author?.id ?? null,
      created_by: staff.id,
    })
    .select("id")
    .single();

  if (error || !data) redirect(`/admin/textos?erro=${encodeURIComponent(dbErrorMessage(error))}`);
  redirect(`/admin/textos/${data.id}`);
}

function normalize(raw: unknown): { ok: true; value: ArticleInput } | { ok: false; error: string } {
  const parsed = articleSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const value = parsed.data;
  value.content_html = sanitizeArticleHtml(value.content_html);
  if (!value.slug) value.slug = slugify(value.title) || `texto-${Date.now().toString(36)}`;
  return { ok: true, value };
}

async function syncTags(supabase: Awaited<ReturnType<typeof createClient>>, articleId: string, names: string[]) {
  const unique = [...new Map(names.map((n) => [slugify(n), n.trim()])).entries()].filter(([s]) => s);
  const slugs = unique.map(([s]) => s);

  if (unique.length) {
    const { data: existing } = await supabase.from("tags").select("id, slug").in("slug", slugs);
    const have = new Set((existing ?? []).map((t) => t.slug));
    const missing = unique.filter(([s]) => !have.has(s)).map(([slug, name]) => ({ slug, name }));
    if (missing.length) await supabase.from("tags").insert(missing);
  }

  const { data: tags } = slugs.length
    ? await supabase.from("tags").select("id").in("slug", slugs)
    : { data: [] as { id: string }[] };

  await supabase.from("article_tags").delete().eq("article_id", articleId);
  if (tags && tags.length) {
    await supabase.from("article_tags").insert(tags.map((t) => ({ article_id: articleId, tag_id: t.id })));
  }
}

function columns(v: ArticleInput) {
  return {
    title: v.title,
    subtitle: v.subtitle,
    slug: v.slug,
    excerpt: v.excerpt,
    content_json: v.content_json ?? null,
    content_html: v.content_html,
    cover_url: v.cover_url,
    cover_alt: v.cover_alt,
    cover_caption: v.cover_caption,
    cover_credit: v.cover_credit,
    section_id: v.section_id,
    author_id: v.author_id,
    featured: v.featured,
    pinned: v.pinned,
    reading_minutes: readingTime(v.content_html),
  };
}

/** Salvamento (usado pelo autosave e pelo botão Salvar). */
export async function saveArticle(id: string, raw: unknown): Promise<SaveResult> {
  const staff = await getStaff();
  if (!staff) return { ok: false, error: "Sua sessão expirou. Entre de novo para continuar." };

  const n = normalize(raw);
  if (!n.ok) return n;
  const supabase = await createClient();

  // Colunistas não podem destacar textos (o banco também recusa)
  const cols = columns(n.value);
  if (staff.role === "colunista") {
    cols.featured = false;
    cols.pinned = false;
  }

  const { data, error } = await supabase
    .from("articles")
    .update(cols)
    .eq("id", id)
    .select("status, published_at, updated_at")
    .maybeSingle();

  if (error) return { ok: false, error: dbErrorMessage(error) };
  if (!data) return { ok: false, error: "Você não pode editar este texto (ele pode ter sido publicado ou pertencer a outra pessoa)." };

  await syncTags(supabase, id, n.value.tags);

  // Se o texto já está no ar, a edição aparece no site imediatamente
  if (data.status === "published" || data.status === "scheduled") revalidateContent();

  return { ok: true, savedAt: data.updated_at, status: data.status, publishedAt: data.published_at };
}

/** Publicar, agendar, voltar para rascunho ou arquivar. Salva antes. */
export async function changeStatus(
  id: string,
  raw: unknown,
  target: ArticleStatus,
  scheduledAt?: string | null,
): Promise<SaveResult> {
  const staff = await getStaff();
  if (!staff) return { ok: false, error: "Sua sessão expirou. Entre de novo para continuar." };

  const n = normalize(raw);
  if (!n.ok) return n;

  const supabase = await createClient();
  const { data: current } = await supabase.from("articles").select("published_at, status").eq("id", id).maybeSingle();
  if (!current) return { ok: false, error: "Texto não encontrado ou sem permissão." };

  const plan = planTransition({
    role: staff.role,
    target,
    input: n.value,
    scheduledAt,
    currentPublishedAt: current.status === "published" ? current.published_at : null,
  });
  if (!plan.ok) return plan;

  const cols = columns(n.value);
  if (staff.role === "colunista") {
    cols.featured = false;
    cols.pinned = false;
  }

  const { data, error } = await supabase
    .from("articles")
    .update({ ...cols, ...plan.patch })
    .eq("id", id)
    .select("status, published_at, updated_at")
    .maybeSingle();

  if (error) return { ok: false, error: dbErrorMessage(error) };
  if (!data) return { ok: false, error: "Você não tem permissão para alterar o estado deste texto." };

  await syncTags(supabase, id, n.value.tags);
  revalidateContent();
  return { ok: true, savedAt: data.updated_at, status: data.status, publishedAt: data.published_at };
}

export async function deleteArticle(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireStaff();
  const supabase = await createClient();
  const { data, error } = await supabase.from("articles").delete().eq("id", id).select("status");
  if (error) return { ok: false, error: dbErrorMessage(error) };
  if (!data?.length) return { ok: false, error: "Você não pode excluir este texto." };
  if (data[0].status !== "draft") revalidateContent();
  return { ok: true };
}

export async function deleteArticleAndRedirect(id: string) {
  const r = await deleteArticle(id);
  if (!r.ok) redirect(`/admin/textos?erro=${encodeURIComponent(r.error ?? "Erro ao excluir.")}`);
  redirect("/admin/textos?aviso=excluido");
}
