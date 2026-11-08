import type { Metadata } from "next";
import { Suspense } from "react";
import { PAGE_SIZE, searchArticles } from "@/lib/data/public";
import { ArticleRow, EmptyState } from "@/components/site/article-card";
import { Pagination } from "@/components/site/pagination";
import { IconSearch } from "@/components/icons";

export const metadata: Metadata = { title: "Busca", robots: { index: false, follow: true } };

type SP = Promise<{ q?: string; pagina?: string }>;

async function SearchBox({ searchParams }: { searchParams: SP }) {
  const { q = "" } = await searchParams;
  return <Box defaultValue={q} />;
}

function Box({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <form role="search" action="/busca" className="flex items-center border-b-2 border-rule-strong">
      <label htmlFor="busca-q" className="sr-only">
        O que você procura?
      </label>
      <input
        id="busca-q"
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="O que você procura?"
        maxLength={120}
        className="h-16 min-w-0 flex-1 bg-transparent font-serif text-2xl outline-offset-4 sm:text-3xl"
      />
      <button type="submit" className="inline-flex size-14 items-center justify-center" aria-label="Buscar">
        <IconSearch size={24} />
      </button>
    </form>
  );
}

async function Results({ searchParams }: { searchParams: SP }) {
  const { q = "", pagina } = await searchParams;
  const term = q.trim();
  if (!term) {
    return <p className="mt-8 text-muted">Digite uma palavra ou expressão. Ex.: reforma agrária, &quot;tarifa zero&quot;, greve -professores.</p>;
  }
  const page = Math.max(1, Number(pagina) || 1);
  const { articles, total } = await searchArticles(term, page);
  if (articles.length === 0) {
    return (
      <div className="mt-8">
        <EmptyState title="Nada encontrado">
          Nenhum texto com “{term}”. Tente outras palavras ou termos mais gerais.
        </EmptyState>
      </div>
    );
  }
  return (
    <div className="mt-8">
      <p className="mb-2 text-sm text-muted" role="status">
        {total} {total === 1 ? "resultado" : "resultados"} para “{term}”
      </p>
      {articles.map((a) => (
        <ArticleRow key={a.id} article={a} />
      ))}
      <Pagination page={page} total={total} perPage={PAGE_SIZE} base={`/busca?q=${encodeURIComponent(term)}`} />
    </div>
  );
}

export default function SearchPage({ searchParams }: { searchParams: SP }) {
  return (
    <div className="wrap max-w-3xl pt-8 pb-16 sm:pt-12">
      <h1 className="mb-6 font-display text-5xl leading-none">Busca</h1>
      <Suspense fallback={<Box />}>
        <SearchBox searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<div className="mt-8 flex flex-col gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-24" />)}</div>}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
