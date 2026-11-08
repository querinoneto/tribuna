import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ArticleEditor, type EditorArticle } from "@/components/admin/article-editor";

export const metadata = { title: "Editar texto" };

export default async function EditArticlePage({ params }: PageProps<"/admin/textos/[id]">) {
  const { id } = await params;
  const staff = await requireStaff();
  const supabase = await createClient();

  const [{ data: article }, { data: sections }, { data: authors }, { data: tagRows }] = await Promise.all([
    supabase.from("articles").select("*").eq("id", id).maybeSingle(),
    supabase.from("sections").select("id, name").order("position"),
    supabase.from("authors").select("id, name, profile_id").order("name"),
    supabase.from("article_tags").select("tags(name)").eq("article_id", id),
  ]);

  if (!article) notFound();

  // Colunistas assinam apenas com o próprio nome (ou "Redação", se não tiver autor ligado)
  const authorOptions =
    staff.role === "colunista"
      ? (authors ?? []).filter((a) => a.profile_id === staff.id || a.id === article.author_id)
      : (authors ?? []);

  const tags = (tagRows ?? [])
    .map((r) => (r.tags as unknown as { name: string } | null)?.name)
    .filter((n): n is string => Boolean(n));

  const editorArticle: EditorArticle = {
    id: article.id,
    title: article.title,
    subtitle: article.subtitle,
    slug: article.slug,
    excerpt: article.excerpt,
    content_json: article.content_json,
    content_html: article.content_html,
    cover_url: article.cover_url,
    cover_alt: article.cover_alt,
    cover_caption: article.cover_caption,
    cover_credit: article.cover_credit,
    section_id: article.section_id,
    author_id: article.author_id,
    featured: article.featured,
    pinned: article.pinned,
    status: article.status,
    published_at: article.published_at,
    scheduled_at: article.scheduled_at,
    updated_at: article.updated_at,
    tags,
  };

  return (
    <ArticleEditor
      key={article.id}
      article={editorArticle}
      sections={sections ?? []}
      authors={authorOptions.map((a) => ({ id: a.id, name: a.name }))}
      role={staff.role}
    />
  );
}
