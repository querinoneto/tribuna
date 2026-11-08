import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { SITE_URL } from "@/lib/env";
import { STATUS_LABEL } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import type { ArticleFull } from "@/lib/types";
import { CARD_SELECT } from "@/lib/data/public";
import { ArticleView, articleUrl } from "@/components/site/article-view";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeaderStatic } from "@/components/site/header";

export const metadata = { title: "Pré-visualização", robots: { index: false } };

/** Mostra o texto exatamente como ficará no site, mesmo antes de publicar. */
export default async function PreviewPage({ params }: PageProps<"/admin/textos/[id]/previa">) {
  const { id } = await params;
  await requireStaff();
  const supabase = await createClient();
  const { data } = await supabase
    .from("articles")
    .select(`${CARD_SELECT}, content_html, cover_caption, cover_credit, updated_at, status, tags:article_tags(tag:tags(name, slug))`)
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();

  const raw = data as unknown as Omit<ArticleFull, "tags"> & { tags: { tag: { name: string; slug: string } | null }[] };
  const article: ArticleFull = {
    ...raw,
    published_at: raw.published_at ?? new Date().toISOString(),
    tags: raw.tags.map((t) => t.tag).filter((t): t is { name: string; slug: string } => Boolean(t)),
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-paper">
      <div className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-ink px-4 py-2.5 text-center text-sm text-paper">
        <span>
          <strong>Pré-visualização</strong> · {STATUS_LABEL[article.status]}. Só a equipe vê esta página.
        </span>
        <Link href={`/admin/textos/${id}`} className="font-semibold underline underline-offset-4">
          Voltar a editar
        </Link>
      </div>
      <SiteHeaderStatic />
      <main id="conteudo">
        <ArticleView article={article} url={articleUrl(SITE_URL, article)} />
      </main>
      <SiteFooter />
    </div>
  );
}
