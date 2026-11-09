import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getAuthorPage, PAGE_SIZE } from "@/lib/data/public";
import { SITE_URL } from "@/lib/env";
import { ArticleRow, EmptyState } from "@/components/site/article-card";
import { Pagination } from "@/components/site/pagination";
import { ListSkeleton } from "@/components/site/skeletons";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ pagina?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getAuthorPage(slug, 1);
  if (!data) return { title: "Autor não encontrado" };
  return {
    title: data.author.name,
    description: data.author.bio ?? `Textos de ${data.author.name} na Tribuna Socialista.`,
    alternates: { canonical: `${SITE_URL}/autor/${slug}` },
    openGraph: { type: "profile", title: data.author.name, images: data.author.avatar_url ? [data.author.avatar_url] : undefined },
  };
}

async function Content({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const page = Math.max(1, Number(sp.pagina) || 1);
  const data = await getAuthorPage(slug, page);
  if (!data) notFound();
  const { author, articles, total } = data;

  return (
    <div className="wrap pt-8 pb-16 sm:pt-12">
      <header className="mb-10 flex flex-col items-start gap-6 border-b border-rule-strong pb-8 sm:flex-row sm:items-center">
        {author.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={author.avatar_url} alt={`Foto de ${author.name}`} className="size-28 rounded-full object-cover grayscale sm:size-32" />
        ) : (
          <span aria-hidden className="flex size-28 items-center justify-center rounded-full bg-paper-2 font-display text-5xl text-muted sm:size-32">
            {author.name.charAt(0)}
          </span>
        )}
        <div>
          <p className="kicker mb-2">{author.is_columnist ? "Colunista" : author.is_contributor ? "Colaborador externo" : "Autor"}</p>
          <h1 className="font-display text-4xl leading-none sm:text-5xl">{author.name}</h1>
          {author.bio && <p className="mt-3 max-w-2xl font-serif text-lg leading-snug text-ink-soft">{author.bio}</p>}
        </div>
      </header>

      <h2 className="mb-2 text-sm font-semibold tracking-[0.1em] text-muted uppercase">
        {total} {total === 1 ? "texto publicado" : "textos publicados"}
      </h2>
      {articles.length === 0 ? (
        <EmptyState title="Nenhum texto ainda" />
      ) : (
        <div className="max-w-3xl">
          {articles.map((a) => (
            <ArticleRow key={a.id} article={a} />
          ))}
        </div>
      )}
      <Pagination page={page} total={total} perPage={PAGE_SIZE} base={`/autor/${slug}`} />
    </div>
  );
}

export default function AuthorPage(props: Props) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Content {...props} />
    </Suspense>
  );
}
