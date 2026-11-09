import Link from "next/link";
import { articlePath, formatDateTime } from "@/lib/format";
import { sanitizeArticleHtml } from "@/lib/sanitize";
import type { ArticleFull } from "@/lib/types";
import { Cover } from "./cover";
import { NewsletterInline } from "./newsletter-form";
import { ShareButtons } from "./share-buttons";

/**
 * A matéria completa. Usada no site e na pré-visualização do painel, para
 * que a prévia seja exatamente igual ao que será publicado.
 */
export function ArticleView({ article, url }: { article: ArticleFull; url: string }) {
  const published = article.published_at ?? new Date(0).toISOString();
  return (
    <article>
      <header className="mx-auto flex max-w-[860px] flex-col items-center gap-5 px-4 pt-10 pb-8 text-center sm:px-8 sm:pt-16">
        {article.section && (
          <Link href={`/editoria/${article.section.slug}`} className="kicker flex items-center gap-3 hover:underline">
            <span aria-hidden className="h-0.5 w-8 bg-accent" />
            {article.section.name}
            <span aria-hidden className="h-0.5 w-8 bg-accent" />
          </Link>
        )}
        <h1 className="font-sans text-[30px] leading-[1.1] font-bold tracking-[-0.025em] text-balance sm:text-[42px] lg:text-[50px]">
          {article.title}
        </h1>
        {article.subtitle && (
          <p className="max-w-[680px] font-serif text-[19px] leading-snug text-ink-soft text-pretty sm:text-[23px]">{article.subtitle}</p>
        )}
        <div className="mt-1 flex items-center gap-3 text-left">
          {article.author?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={article.author.avatar_url} alt="" className="size-12 rounded-full object-cover" />
          ) : (
            <span aria-hidden className="flex size-12 items-center justify-center rounded-full bg-paper-2 font-display text-xl text-muted">
              {article.author?.name.charAt(0) ?? "T"}
            </span>
          )}
          <div className="flex flex-col text-sm">
            {article.author?.is_contributor ? (
              <span className="font-bold">{article.author.name}</span>
            ) : article.author ? (
              <Link href={`/autor/${article.author.slug}`} className="font-bold hover:text-accent">
                {article.author.name}
              </Link>
            ) : (
              <span className="font-bold">Redação</span>
            )}
            {article.author?.is_contributor && <span className="text-xs font-semibold tracking-[0.08em] text-accent uppercase">Colaborador externo</span>}
            <span className="text-muted">
              <time dateTime={published}>{formatDateTime(published)}</time> · {article.reading_minutes} min de leitura
            </span>
          </div>
        </div>
      </header>

      <figure className="wrap mb-10 max-w-[1040px] sm:mb-12">
        <Cover src={article.cover_url} alt={article.cover_alt} seed={article.id} ratio="16/9" sizes="(min-width: 1080px) 1000px, 100vw" priority />
        {(article.cover_caption || article.cover_credit) && (
          <figcaption className="flex flex-wrap justify-between gap-x-6 gap-y-1 border-b border-rule py-2.5 text-[13px] leading-normal text-muted">
            <span>{article.cover_caption}</span>
            {article.cover_credit && <span className="shrink-0 text-[11px] tracking-[0.1em] uppercase">{article.cover_credit}</span>}
          </figcaption>
        )}
      </figure>

      <div className="wrap flex justify-center gap-10">
        <aside aria-label="Compartilhar" className="sticky top-24 hidden h-fit w-14 shrink-0 flex-col items-center gap-2.5 lg:flex">
          <span className="text-[10px] font-bold tracking-[0.14em] text-muted">PARTILHE</span>
          <ShareButtons url={url} title={article.title} vertical />
        </aside>

        <div className="w-full max-w-[680px] min-w-0">
          <div className="prose-tribuna drop-cap" dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(article.content_html) }} />


          <div className="mt-6 flex flex-wrap items-center gap-3 lg:hidden">
            <span className="kicker text-muted">Compartilhe</span>
            <ShareButtons url={url} title={article.title} />
          </div>
        </div>
        <div aria-hidden className="hidden w-14 shrink-0 lg:block" />
      </div>

      <NewsletterInline />
    </article>
  );
}

export function articleUrl(siteUrl: string, a: { slug: string; published_at: string | null }) {
  return `${siteUrl}${articlePath(a)}`;
}
