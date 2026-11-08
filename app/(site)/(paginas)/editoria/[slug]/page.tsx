import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getSectionPage, PAGE_SIZE } from "@/lib/data/public";
import { SITE_URL } from "@/lib/env";
import { ArticleCard, ArticleRow, EmptyState } from "@/components/site/article-card";
import { Pagination } from "@/components/site/pagination";
import { ListSkeleton } from "@/components/site/skeletons";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ pagina?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getSectionPage(slug, 1);
  if (!data) return { title: "Editoria não encontrada" };
  return {
    title: data.section.name,
    description: data.section.description ?? `Notícias e análises de ${data.section.name} na Tribuna Socialista.`,
    alternates: { canonical: `${SITE_URL}/editoria/${slug}` },
  };
}

async function Content({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const page = Math.max(1, Number(sp.pagina) || 1);
  const data = await getSectionPage(slug, page);
  if (!data) notFound();
  const { section, articles, total } = data;
  const [first, ...rest] = articles;

  return (
    <div className="wrap pt-8 pb-16 sm:pt-12">
      <header className="mb-8 border-b border-rule-strong pb-6 sm:mb-10">
        <p className="kicker mb-2">Editoria</p>
        <h1 className="font-display text-4xl leading-none sm:text-5xl">{section.name}</h1>
        {section.description && <p className="mt-3 max-w-2xl font-serif text-lg text-ink-soft sm:text-xl">{section.description}</p>}
      </header>

      {articles.length === 0 ? (
        <EmptyState title="Nada por aqui ainda">Esta editoria ainda não tem textos publicados.</EmptyState>
      ) : (
        <>
          {page === 1 && first && (
            <div className="mb-10 border-b border-rule pb-10">
              <div className="grid items-center gap-6 lg:grid-cols-[1.4fr_1fr] lg:gap-10">
                <ArticleCard article={first} headingLevel={2} />
              </div>
            </div>
          )}
          <div className="hidden gap-x-7 gap-y-10 sm:grid sm:grid-cols-2 lg:grid-cols-3">
            {(page === 1 ? rest : articles).map((a) => (
              <ArticleCard key={a.id} article={a} headingLevel={2} />
            ))}
          </div>
          <div className="sm:hidden">
            {(page === 1 ? rest : articles).map((a) => (
              <ArticleRow key={a.id} article={a} />
            ))}
          </div>
          <Pagination page={page} total={total} perPage={PAGE_SIZE} base={`/editoria/${slug}`} />
        </>
      )}
    </div>
  );
}

export default function SectionPage(props: Props) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Content {...props} />
    </Suspense>
  );
}
