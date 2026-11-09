import { readingTime } from "@/lib/format";
import { isCoordination } from "@/lib/permissions";
import { slugify } from "@/lib/slug";
import type { ArticleStatus, Role } from "@/lib/types";
import type { ArticleInput } from "@/lib/validation";

function articleColumns(v: ArticleInput) {
  return {
    title: v.title,
    subtitle: v.subtitle,
    slug: v.slug,
    ...(v.excerpt !== undefined ? { excerpt: v.excerpt } : {}),
    content_json: v.content_json ?? null,
    content_html: v.content_html,
    cover_url: v.cover_url,
    cover_alt: v.cover_alt,
    ...(v.cover_caption !== undefined ? { cover_caption: v.cover_caption } : {}),
    cover_credit: v.cover_credit,
    section_id: v.section_id,
    author_id: v.author_id,
    ...(v.column_id !== undefined ? { column_id: v.column_id } : {}),
    featured: v.featured,
    pinned: v.pinned,
    reading_minutes: readingTime(v.content_html),
  };
}

export type Current = { slug: string; status: ArticleStatus; author_id: string | null; published_at: string | null };

/**
 * Regras por papel, aplicadas no servidor (o painel só esconde os campos):
 * - texto de coluna não tem editoria;
 * - endereço (URL), manchete principal e fixação na home: só o administrador
 *   (para os demais, o endereço de um rascunho é gerado do título e, depois de
 *   publicado ou agendado, não muda mais);
 * - trocar o autor do texto: administrador e coordenação.
 */
/** Rascunho que nunca foi ao ar: para quem não é administrador, o endereço acompanha o título. */
export function slugFollowsTitle(role: Role, current: Current) {
  return role !== "admin" && current.status === "draft" && !current.published_at;
}

export function applyRoleRules(role: Role, v: ArticleInput, current: Current) {
  if (v.column_id) v.section_id = null;
  if (!isCoordination(role)) v.author_id = current.author_id;
  const cols: Partial<ReturnType<typeof articleColumns>> & { slug?: string } = articleColumns(v);
  if (role !== "admin") {
    delete cols.featured;
    delete cols.pinned;
    cols.slug = slugFollowsTitle(role, current) ? slugify(v.title) || current.slug : current.slug;
    v.slug = cols.slug;
  }
  return cols;
}

