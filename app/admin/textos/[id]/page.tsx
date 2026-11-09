import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ArticleEditor, type EditorArticle } from "@/components/admin/article-editor";

export const metadata = { title: "Editar texto" };

export default async function EditArticlePage({ params, searchParams }: PageProps<"/admin/textos/[id]">) {
  const { id } = await params;
  const { preparado } = (await searchParams) as { preparado?: string };
  const staff = await requireStaff();
  const supabase = await createClient();

  const [{ data: article }, { data: sections }, { data: authors }] = await Promise.all([
    supabase.from("articles").select("*").eq("id", id).maybeSingle(),
    supabase.from("sections").select("id, name").order("position"),
    supabase.from("authors").select("id, name, profile_id").order("name"),
  ]);

  if (!article) notFound();

  // Colunistas assinam apenas com o próprio nome (ou "Redação", se não tiver autor ligado)
  const authorOptions =
    staff.role === "colunista"
      ? (authors ?? []).filter((a) => a.profile_id === staff.id || a.id === article.author_id)
      : (authors ?? []);

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
    in_review: article.in_review ?? false,
    submitted_at: article.submitted_at ?? null,
    review_note: article.review_note ?? "",
  };

  return (
    <ArticleEditor
      key={article.id}
      article={editorArticle}
      sections={sections ?? []}
      authors={authorOptions.map((a) => ({ id: a.id, name: a.name }))}
      role={staff.role}
      notice={preparedNotice(preparado)}
    />
  );
}

/** Mensagem exibida no editor logo depois de "Preparar para publicação". */
function preparedNotice(code?: string): string | undefined {
  if (!code) return undefined;
  const parts = code.split(",");
  const who = parts.includes("colaboracao-existente")
    ? "A assinatura reaproveita um cadastro de colaboração com o mesmo nome e e-mail. O e-mail do formulário não é verificado: confira se é mesmo a mesma pessoa."
    : "A pessoa foi cadastrada como colaboradora (não aparece entre os colunistas), com a foto enviada.";
  const text = parts.includes("texto-importado")
    ? "O texto do arquivo Word já está no editor: revise a formatação."
    : parts.includes("texto-falhou")
      ? "Não foi possível ler o arquivo Word: baixe-o em Envios de leitores e cole o texto aqui."
      : "O arquivo veio em PDF (ou Word antigo): baixe-o em Envios de leitores e cole o texto aqui.";
  return `Rascunho criado a partir do envio. ${who} ${text} Antes de publicar, escolha a editoria.`;
}
