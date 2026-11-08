import { notFound } from "next/navigation";
import { getPage } from "@/lib/data/public";
import { formatDate } from "@/lib/format";

/** Página institucional (Sobre, Contato, Expediente, Privacidade), editável no painel. */
export async function InstitutionalPage({ slug }: { slug: string }) {
  const page = await getPage(slug);
  if (!page) notFound();
  return (
    <article className="wrap pt-8 pb-16 sm:pt-12">
      <header className="mx-auto mb-10 max-w-[680px] border-b border-rule-strong pb-6">
        <h1 className="font-display text-5xl leading-none sm:text-6xl">{page.title}</h1>
      </header>
      <div className="prose-tribuna mx-auto" dangerouslySetInnerHTML={{ __html: page.content_html }} />
      <p className="mx-auto mt-12 max-w-[680px] text-xs text-muted">Atualizado em {formatDate(page.updated_at)}.</p>
    </article>
  );
}

export async function institutionalMetadata(slug: string, fallback: string) {
  const page = await getPage(slug);
  return { title: page?.title ?? fallback };
}
