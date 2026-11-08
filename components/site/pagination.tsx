import Link from "next/link";

export function Pagination({ page, total, perPage, base }: { page: number; total: number; perPage: number; base: string }) {
  const pages = Math.ceil(total / perPage);
  if (pages <= 1) return null;
  const href = (p: number) => (p === 1 ? base : `${base}${base.includes("?") ? "&" : "?"}pagina=${p}`);
  return (
    <nav aria-label="Paginação" className="mt-12 flex items-center justify-between border-t border-rule-strong pt-4 text-sm font-semibold">
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev" className="inline-flex min-h-11 items-center hover:text-accent">
          ← Mais recentes
        </Link>
      ) : (
        <span />
      )}
      <span className="font-normal text-muted">
        Página {page} de {pages}
      </span>
      {page < pages ? (
        <Link href={href(page + 1)} rel="next" className="inline-flex min-h-11 items-center hover:text-accent">
          Mais antigas →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
