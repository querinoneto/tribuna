import type { Metadata } from "next";
import Link from "next/link";
import { getColumnistsOverview } from "@/lib/data/public";
import { articlePath } from "@/lib/format";
import { EmptyState } from "@/components/site/article-card";

export const metadata: Metadata = {
  title: "Colunistas",
  description: "As vozes que assinam colunas na Tribuna Socialista.",
};

export default async function ColumnistsPage() {
  const columnists = await getColumnistsOverview();
  return (
    <div className="wrap max-w-[760px] pt-10 pb-16 sm:pt-14">
      <header className="mb-8 text-center">
        <p className="kicker mb-3 flex items-center justify-center gap-3">
          <span aria-hidden className="h-0.5 w-7 bg-accent" />
          Opinião
          <span aria-hidden className="h-0.5 w-7 bg-accent" />
        </p>
        <h1 className="font-display text-4xl leading-none sm:text-5xl">Colunistas</h1>
        <p className="mx-auto mt-4 max-w-md font-sans text-[17px] leading-snug text-ink-soft">
          Militantes, pesquisadores e trabalhadores que disputam o debate público na Tribuna Socialista.
        </p>
      </header>

      {columnists.length === 0 ? (
        <EmptyState title="Em breve">Os colunistas da Tribuna Socialista aparecerão aqui.</EmptyState>
      ) : (
        <ul className="border-t-4 border-rule-strong">
          {columnists.map((c) => (
            <li key={c.id} className="group relative border-b border-rule">
              <article className="flex gap-4 py-6 sm:gap-6 sm:py-7">
                {c.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.avatar_url}
                    alt=""
                    className="size-16 shrink-0 rounded-full object-cover sm:size-20"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="flex size-16 shrink-0 items-center justify-center rounded-full bg-paper-2 font-display text-2xl text-muted sm:size-20 sm:text-3xl"
                  >
                    {c.name.charAt(0)}
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-[22px] leading-tight sm:text-2xl">
                    {/* O link cobre o cartão inteiro (área de toque maior no celular) */}
                    <Link href={`/autor/${c.slug}`} className="text-accent after:absolute after:inset-0 group-hover:underline">
                      {c.name}
                    </Link>
                  </h2>
                  {c.bio && <p className="mt-1.5 font-sans text-[14px] leading-relaxed text-ink-soft sm:text-[15px]">{c.bio}</p>}

                  <p className="mt-3 flex flex-col gap-y-1 text-[13px] text-muted sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2">
                    <span className="font-semibold text-ink-soft tabular-nums">
                      {c.total} {c.total === 1 ? "texto" : "textos"}
                    </span>
                    {c.latest && (
                      <>
                        <span aria-hidden className="hidden sm:inline">·</span>
                        <span className="min-w-0">
                          Mais recente:{" "}
                          <Link
                            href={articlePath(c.latest)}
                            className="relative z-10 font-medium text-ink underline decoration-rule underline-offset-[3px] hover:text-accent hover:decoration-accent"
                          >
                            {c.latest.title}
                          </Link>
                        </span>
                      </>
                    )}
                  </p>
                </div>

                <span
                  aria-hidden
                  className="hidden self-center text-xl text-muted transition-transform duration-200 group-hover:translate-x-1 group-hover:text-accent sm:block"
                >
                  →
                </span>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
