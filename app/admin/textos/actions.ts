"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { postArticle, postDueArticles } from "@/lib/instagram/service";
import { getStaff, requireStaff } from "@/lib/auth";
import { applyRoleRules, slugFollowsTitle, type Current } from "@/lib/article-rules";
import { dbErrorMessage, planTransition } from "@/lib/publishing";
import { revalidateContent, revalidateContentQuiet } from "@/lib/revalidate";
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

/** Estado atual do texto (com a data da primeira publicação, quando o banco já tem essa coluna). */
async function loadCurrent(supabase: Awaited<ReturnType<typeof createClient>>, id: string): Promise<Current | null> {
  const r = await supabase.from("articles").select("slug, status, author_id, published_at, first_published_at").eq("id", id).maybeSingle();
  if (!r.error) return r.data as Current | null;
  const { data } = await supabase.from("articles").select("slug, status, author_id, published_at").eq("id", id).maybeSingle();
  return data as Current | null;
}

/** Atualiza o texto; se o endereço gerado do título já estiver em uso, acrescenta um sufixo curto. */
async function updateArticle(supabase: Awaited<ReturnType<typeof createClient>>, id: string, cols: Record<string, unknown>, autoSlug: boolean) {
  const run = (patch: Record<string, unknown>) =>
    supabase.from("articles").update(patch).eq("id", id).select("status, published_at, updated_at").maybeSingle();
  let r = await run(cols);
  if (autoSlug && r.error?.code === "23505" && typeof cols.slug === "string") {
    r = await run({ ...cols, slug: `${cols.slug.slice(0, 90)}-${Math.random().toString(36).slice(2, 6)}` });
  }
  return r;
}

/** Salvamento (usado pelo autosave e pelo botão Salvar). */
export async function saveArticle(id: string, raw: unknown): Promise<SaveResult> {
  const staff = await getStaff();
  if (!staff) return { ok: false, error: "Sua sessão expirou. Entre de novo para continuar." };

  const n = normalize(raw);
  if (!n.ok) return n;
  const supabase = await createClient();

  const current = await loadCurrent(supabase, id);
  if (!current) return { ok: false, error: "Você não pode editar este texto (ele pode ter sido publicado ou pertencer a outra pessoa)." };
  const cols = applyRoleRules(staff.role, n.value, current);

  const { data, error } = await updateArticle(supabase, id, cols, slugFollowsTitle(staff.role, current));

  if (error) return { ok: false, error: dbErrorMessage(error) };
  if (!data) return { ok: false, error: "Você não pode editar este texto (ele pode ter sido publicado ou pertencer a outra pessoa)." };

  // Se o texto já está no ar, a edição aparece no site na próxima visita
  if (data.status === "published" || data.status === "scheduled") revalidateContentQuiet();

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
  const current = await loadCurrent(supabase, id);
  if (!current) return { ok: false, error: "Texto não encontrado ou sem permissão." };
  const cols = applyRoleRules(staff.role, n.value, current);

  const plan = planTransition({
    role: staff.role,
    target,
    input: n.value,
    scheduledAt,
    currentPublishedAt: current.status === "published" ? current.published_at : null,
  });
  if (!plan.ok) return plan;

  // O endereço de um texto que vai ao ar não muda mais (para quem não é administrador)
  const { data, error } = await updateArticle(supabase, id, { ...cols, ...plan.patch }, slugFollowsTitle(staff.role, current));

  if (error) return { ok: false, error: dbErrorMessage(error) };
  if (!data) return { ok: false, error: "Você não tem permissão para alterar o estado deste texto." };

  revalidateContent();
  // Texto no ar: o card vai para o Instagram em segundo plano (se a automação estiver ligada)
  if (data.status === "published") {
    after(async () => {
      await postArticle(id).catch(() => undefined);
      await postDueArticles().catch(() => undefined);
    });
  }
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
