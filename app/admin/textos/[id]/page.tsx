import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { isSelectableAuthor, type AuthorRow } from "@/lib/authors";
import { createClient } from "@/lib/supabase/server";
import { ArticleEditor, type EditorArticle } from "@/components/admin/article-editor";

export const metadata = { title: "Editar texto" };

const ARTICLE_FIELDS =
  "id, title, subtitle, slug, excerpt, content_json, content_html, cover_url, cover_alt, cover_caption, cover_credit, section_id, column_id, author_id, featured, pinned, status, published_at, scheduled_at, updated_at, in_review, submitted_at, review_note";
// Ao publicar, o envio do card ao Instagram roda em segundo plano e pode levar alguns segundos
export const maxDuration = 120;

export default async function EditArticlePage({ params, searchParams }: PageProps<"/admin/textos/[id]">) {
  const { id } = await params;
  const { preparado } = (await searchParams) as { preparado?: string };
  const staff = await requireStaff();
  const supabase = await createClient();

  const loadArticle = async () => {
    // Só o que o editor usa (sem o índice de busca e outros campos internos);
    // num banco sem as últimas migrações, cai para todas as colunas
    const r = await supabase.from("articles").select(ARTICLE_FIELDS).eq("id", id).maybeSingle();
    return r.error ? await supabase.from("articles").select("*").eq("id", id).maybeSingle() : r;
  };
  const [{ data: article }, { data: sections }, { data: authorRows }, { data: columnRows }] = await Promise.all([
    loadArticle(),
    supabase.from("sections").select("id, name").order("position"),
    supabase.from("authors").select("id, name, profile_id, is_contributor, revoked_at").order("name"),
    // Sem a migração 18, a consulta falha e o editor simplesmente não mostra o campo Coluna
    supabase.from("columns").select("id, name, author_id").order("name"),
  ]);

  if (!article) notFound();

  const authors = (authorRows ?? []) as AuthorRow[];
  // Colunistas assinam apenas com o próprio nome. Administração e coordenação
  // escolhem entre quem tem conta ativa no painel (administrador, coordenador
  // ou colunista); colaboradores (leitores que enviaram texto) e quem perdeu
  // o acesso não aparecem. O autor atual do texto continua na lista, para não
  // se perder ao salvar (ex.: texto de leitor preparado em Envios).
  const authorOptions = authors
    .filter((a) => (staff.role === "colunista" ? a.profile_id === staff.id : isSelectableAuthor(a)) || a.id === article.author_id)
    .map((a) => ({
      id: a.id,
      name: isSelectableAuthor(a) ? a.name : `${a.name} (${a.is_contributor ? "leitor colaborador" : "sem acesso ao painel"})`,
    }));

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
    column_id: article.column_id ?? null,
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
      authors={authorOptions}
      columns={(columnRows ?? []) as { id: string; name: string; author_id: string }[]}
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
