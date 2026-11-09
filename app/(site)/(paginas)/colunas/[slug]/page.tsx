import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getColumnPage, PAGE_SIZE } from "@/lib/data/public";
import { SITE_URL } from "@/lib/env";
import { ArticleCard, ArticleRow, EmptyState } from "@/components/site/article-card";
import { Pagination } from "@/components/site/pagination";
import { ListSkeleton } from "@/components/site/skeletons";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ pagina?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getColumnPage(slug, 1);
  if (!data) return { title: "Coluna não encontrada" };
  const by = data.column.author?.name ? `, de ${data.column.author.name}` : "";
  return {
    title: data.column.name,
    description: data.column.description ?? `${data.column.name}: coluna${by} na Tribuna Socialista.`,
    alternates: { canonical: `${SITE_URL}/colunas/${slug}` },
  };
}

async function Content({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const page = Math.max(1, Number(sp.pagina) || 1);
  const data = await getColumnPage(slug, page);
  if (!data) notFound();
  const { column, articles, total } = data;
  const author = column.author;
  const [first, ...rest] = articles;

  return (
    <div className="wrap pt-8 pb-16 sm:pt-12">
      <header className="mb-8 flex flex-col items-center gap-4 border-b border-rule-strong pb-8 text-center sm:mb-10">
        <p className="kicker">Coluna</p>
        <h1 className="font-display text-4xl leading-none sm:text-6xl">{column.name}</h1>
        {author && (
          <Link href={`/autor/${author.slug}`} className="group flex items-center gap-3">
            {author.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={author.avatar_url} alt="" className="size-11 rounded-full object-cover" />
            ) : null}
            <span className="text-[13px] font-bold tracking-[0.06em] uppercase group-hover:text-accent">por {author.name}</span>
          </Link>
        )}
        {column.description && <p className="max-w-2xl font-sans text-lg text-ink-soft">{column.description}</p>}
      </header>

      {articles.length === 0 ? (
        <EmptyState title="Nada por aqui ainda">Esta coluna ainda não tem textos publicados.</EmptyState>
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
          <Pagination page={page} total={total} perPage={PAGE_SIZE} base={`/colunas/${slug}`} />
        </>
      )}
    </div>
  );
}

export default function ColumnPage(props: Props) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Content {...props} />
    </Suspense>
  );
}
