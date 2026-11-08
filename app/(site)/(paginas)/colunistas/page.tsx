import type { Metadata } from "next";
import Link from "next/link";
import { getColumnists } from "@/lib/data/public";
import { EmptyState } from "@/components/site/article-card";

export const metadata: Metadata = {
  title: "Colunistas",
  description: "As vozes que assinam colunas na Tribuna Socialista.",
};

export default async function ColumnistsPage() {
  const columnists = await getColumnists();
  return (
    <div className="wrap pt-8 pb-16 sm:pt-12">
      <header className="mb-10 border-b border-rule-strong pb-6">
        <h1 className="font-display text-4xl leading-none sm:text-5xl">Colunistas</h1>
        <p className="mt-3 font-serif text-lg text-ink-soft sm:text-xl">Vozes que disputam o debate público.</p>
      </header>
      {columnists.length === 0 ? (
        <EmptyState title="Em breve">Os colunistas da Tribuna aparecerão aqui.</EmptyState>
      ) : (
        <ul className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {columnists.map((c) => (
            <li key={c.id} className="flex gap-4">
              {c.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.avatar_url} alt="" className="size-20 shrink-0 rounded-full object-cover grayscale" />
              ) : (
                <span aria-hidden className="flex size-20 shrink-0 items-center justify-center rounded-full bg-paper-2 font-display text-3xl text-muted">
                  {c.name.charAt(0)}
                </span>
              )}
              <div>
                <h2 className="font-display text-2xl leading-tight">
                  <Link href={`/autor/${c.slug}`} className="hover:text-accent">
                    {c.name}
                  </Link>
                </h2>
                {c.bio && <p className="mt-1 line-clamp-3 font-serif text-base leading-snug text-ink-soft">{c.bio}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
