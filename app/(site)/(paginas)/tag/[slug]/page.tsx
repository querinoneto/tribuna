import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getTagPage } from "@/lib/data/public";
import { ArticleRow, EmptyState } from "@/components/site/article-card";
import { ListSkeleton } from "@/components/site/skeletons";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getTagPage(slug);
  return { title: data ? `#${data.tag.name}` : "Tag não encontrada" };
}

async function Content({ params }: Props) {
  const { slug } = await params;
  const data = await getTagPage(slug);
  if (!data) notFound();
  return (
    <div className="wrap pt-8 pb-16 sm:pt-12">
      <header className="mb-8 border-b border-rule-strong pb-6">
        <p className="kicker mb-2">Tag</p>
        <h1 className="font-display text-4xl leading-none sm:text-5xl">{data.tag.name}</h1>
      </header>
      {data.articles.length === 0 ? (
        <EmptyState title="Nenhum texto com esta tag" />
      ) : (
        <div className="max-w-3xl">
          {data.articles.map((a) => (
            <ArticleRow key={a.id} article={a} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TagPage(props: Props) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Content {...props} />
    </Suspense>
  );
}
