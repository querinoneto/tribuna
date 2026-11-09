import Link from "next/link";
import { articlePath } from "@/lib/format";
import type { ArticleCard as Card } from "@/lib/types";
import { Cover } from "./cover";

/** Rótulo acima do título: a coluna (quando o texto é de uma coluna com nome) ou a editoria. */
export function kickerOf(article: Pick<Card, "section" | "column">): { name: string; href: string } | null {
  if (article.column) return { name: article.column.name, href: `/colunas/${article.column.slug}` };
  if (article.section) return { name: article.section.name, href: `/editoria/${article.section.slug}` };
  return null;
}

export function Kicker({ article, className = "" }: { article: Card; className?: string }) {
  const k = kickerOf(article);
  if (!k) return null;
  // O nome da coluna é só um rótulo nas listas; o link para a coluna fica na matéria
  if (article.column) return <span className={`kicker ${className}`}>{k.name}</span>;
  return (
    <Link href={k.href} className={`kicker hover:underline ${className}`}>
      {k.name}
    </Link>
  );
}

export function Byline({ article, className = "" }: { article: Card; className?: string }) {
  return (
    <p className={`text-xs text-muted ${className}`}>
      {article.author && (
        <>
          {article.author.is_contributor ? (
            <span className="font-semibold text-ink-soft">{article.author.name}</span>
          ) : (
            <Link href={`/autor/${article.author.slug}`} className="font-semibold text-ink-soft hover:text-accent">
              {article.author.name}
            </Link>
          )}
          <span aria-hidden> · </span>
        </>
      )}
      {article.reading_minutes} min de leitura
    </p>
  );
}

/** Card padrão: imagem 16:9, editoria, título, linha fina, autor e tempo de leitura. */
export function ArticleCard({ article, showDek = true, headingLevel = 3 }: { article: Card; showDek?: boolean; headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? "h2" : "h3";
  const href = articlePath(article);
  return (
    <article className="group flex flex-col gap-2.5">
      <Link href={href} tabIndex={-1} aria-hidden>
        <Cover src={article.cover_url} alt={article.cover_alt} seed={article.id} sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" />
      </Link>
      <Kicker article={article} />
      <H className="font-sans text-lg leading-snug font-bold tracking-[-0.01em]">
        <Link href={href} className="headline-link">
          {article.title}
        </Link>
      </H>
      {showDek && article.subtitle && <p className="font-sans text-base leading-snug text-ink-soft">{article.subtitle}</p>}
      <Byline article={article} />
    </article>
  );
}

/** Linha compacta para listas no celular: texto à esquerda, miniatura à direita. */
export function ArticleRow({ article }: { article: Card }) {
  const href = articlePath(article);
  return (
    <article className="flex gap-4 border-b border-rule py-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Kicker article={article} className="text-[10px]" />
        <h3 className="font-sans text-base leading-snug font-bold">
          <Link href={href} className="headline-link">
            {article.title}
          </Link>
        </h3>
        <Byline article={article} className="text-[11px]" />
      </div>
      <Link href={href} tabIndex={-1} aria-hidden className="w-24 shrink-0 sm:w-32">
        <Cover src={article.cover_url} alt="" seed={article.id} ratio="1/1" sizes="128px" />
      </Link>
    </article>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="border border-dashed border-rule px-6 py-16 text-center">
      <p className="font-display text-3xl">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-sm text-muted">{children}</div>}
    </div>
  );
}
