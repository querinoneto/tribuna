import Link from "next/link";
import { getHomeData } from "@/lib/data/public";
import { articlePath } from "@/lib/format";
import { ArticleCard, ArticleRow, Byline, EmptyState, Kicker } from "@/components/site/article-card";
import { Cover } from "@/components/site/cover";

export default async function HomePage() {
  const { hero, side, latest, special, mostRead, opinion, blocks } = await getHomeData();

  if (!hero) {
    return (
      <div className="wrap py-16">
        <EmptyState title="Em breve, as primeiras matérias">
          O jornal ainda não publicou nenhum texto. Volte em breve ou faça sua assinatura para ser avisado.
        </EmptyState>
      </div>
    );
  }

  return (
    <>
      {/* ------------------------- Destaques ------------------------- */}
      <section aria-label="Destaques" className="wrap pt-6 pb-10 sm:pt-8">
        <div className="flex flex-col gap-7 lg:grid lg:grid-cols-[1fr_2.2fr_1fr] lg:gap-0">
          {/* Coluna esquerda */}
          <div className="order-2 flex flex-col lg:order-1 lg:pr-7">
            {side.map((a, i) => (
              <article key={a.id} className={`${i > 0 ? "border-t border-rule pt-5" : ""} pb-5`}>
                {/* Computador: imagem em cima. Celular: miniatura à esquerda do título */}
                <div className="flex items-start gap-3.5 lg:flex-col lg:gap-3">
                  <Link href={articlePath(a)} tabIndex={-1} aria-hidden className="w-[38%] max-w-40 shrink-0 lg:w-full lg:max-w-none">
                    <Cover src={a.cover_url} alt={a.cover_alt} seed={a.id} ratio="16/9" sizes="(min-width: 1024px) 25vw, 40vw" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Kicker article={a} />
                    <h2 className="mt-1.5 font-sans text-base leading-[1.25] font-bold tracking-[-0.01em] sm:text-lg lg:mt-2">
                      <Link href={articlePath(a)} className="headline-link">
                        {a.title}
                      </Link>
                    </h2>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Manchete */}
          <article className="order-1 lg:order-2 lg:border-l lg:border-rule lg:px-7">
            <Link href={articlePath(hero)} tabIndex={-1} aria-hidden className="-mx-4 mb-5 block sm:mx-0">
              <Cover src={hero.cover_url} alt={hero.cover_alt} seed={hero.id} ratio="16/10" sizes="(min-width: 1024px) 55vw, 100vw" priority />
            </Link>
            <div className="mb-3 flex items-center gap-2.5">
              <span aria-hidden className="h-0.5 w-7 bg-accent" />
              <Kicker article={hero} />
            </div>
            <h2 className="font-sans text-[28px] leading-[1.08] font-bold tracking-[-0.025em] text-balance sm:text-[36px] lg:text-[42px]">
              <Link href={articlePath(hero)} className="headline-link">
                {hero.title}
              </Link>
            </h2>
            {hero.subtitle && <p className="mt-3.5 font-sans text-[17px] leading-snug text-ink-soft sm:text-[19px]">{hero.subtitle}</p>}
            <Byline article={hero} className="mt-3.5 text-[13px]" />
          </article>

          {/* Mais lidas */}
          <aside aria-labelledby="mais-lidas" className="order-3 lg:border-l lg:border-rule lg:pl-7">
            <h2 id="mais-lidas" className="border-b-2 border-rule-strong pb-2.5 font-display text-2xl">
              Mais lidas
            </h2>
            <ol>
              {mostRead.map((a, i) => (
                <li key={a.id} className="flex gap-3.5 border-b border-rule py-3.5">
                  <span aria-hidden className="min-w-[22px] font-display text-[30px] leading-none text-accent">
                    {i + 1}
                  </span>
                  <div className="flex flex-col gap-1">
                    {a.section && <span className="kicker text-[10px] text-muted">{a.section.name}</span>}
                    <Link href={articlePath(a)} className="headline-link font-sans text-[15px] leading-snug font-semibold">
                      {a.title}
                    </Link>
                  </div>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </section>

      {/* ------------------------- Últimas ------------------------- */}
      {latest.length > 0 && (
        <section aria-labelledby="ultimas" className="wrap pb-14">
          <h2 id="ultimas" className="rule-title mb-6 flex items-baseline justify-between">
            Últimas
          </h2>
          <div className="hidden grid-cols-2 gap-x-7 gap-y-8 sm:grid lg:grid-cols-4">
            {latest.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
          <div className="sm:hidden">
            {latest.map((a) => (
              <ArticleRow key={a.id} article={a} />
            ))}
          </div>
        </section>
      )}

      {/* ------------------------- Opinião ------------------------- */}
      {opinion.length > 0 && (
        <section aria-labelledby="opiniao" className="bg-band text-band-ink">
          <div className="wrap py-10 sm:py-14">
            <div className="mb-8 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-band-rule pb-5">
              <h2 id="opiniao" className="font-display text-[32px] leading-none sm:text-[40px]">
                Opinião
              </h2>
              <span className="hidden font-sans text-base text-band-muted sm:inline">Vozes que disputam o debate público</span>
              <Link href="/editoria/opiniao" className="ml-auto text-[13px] font-semibold text-band-accent hover:underline">
                Ver todas →
              </Link>
            </div>
            <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-y-8 sm:overflow-visible sm:px-0 lg:grid-cols-4">
              {opinion.map((a) => (
                <article
                  key={a.id}
                  className="flex w-64 shrink-0 snap-start flex-col gap-3.5 border border-band-rule p-5 sm:w-auto sm:border-0 sm:border-l sm:px-6 sm:py-0"
                >
                  {a.author?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.author.avatar_url} alt="" className="size-[72px] rounded-full object-cover grayscale" />
                  ) : (
                    <span aria-hidden className="flex size-[72px] items-center justify-center rounded-full bg-[#3a3633] font-display text-3xl text-band-muted">
                      {a.author?.name.charAt(0) ?? "T"}
                    </span>
                  )}
                  {a.author &&
                    (a.author.is_contributor ? (
                      <span className="text-[13px] font-bold tracking-[0.06em] text-band-accent uppercase">{a.author.name}</span>
                    ) : (
                      <Link href={`/autor/${a.author.slug}`} className="text-[13px] font-bold tracking-[0.06em] text-band-accent uppercase hover:underline">
                        {a.author.name}
                      </Link>
                    ))}
                  <h3 className="font-sans text-lg leading-snug font-semibold sm:text-xl">
                    <Link href={articlePath(a)} className="headline-link">
                      {a.title}
                    </Link>
                  </h3>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ------------------------- Especial ------------------------- */}
      {special && (
        <section aria-labelledby="especial" className="bg-[#b3201f] text-white">
          <div className="wrap flex flex-col items-center gap-8 py-10 sm:py-14 lg:flex-row lg:gap-12">
            <div className="flex flex-1 flex-col gap-4">
              <span className="text-xs font-bold tracking-[0.18em] uppercase">
                Especial{special.section ? ` · ${special.section.name}` : ""}
              </span>
              <h2 id="especial" className="font-display text-[30px] leading-[1.05] sm:text-[44px]">
                {special.title}
              </h2>
              {special.subtitle && <p className="font-sans text-lg leading-normal text-[#fbe3e2] sm:text-xl">{special.subtitle}</p>}
              <Link href={articlePath(special)} className="mt-1.5 self-start border-[1.5px] border-white px-5 py-3.5 text-sm font-semibold transition-colors hover:bg-white hover:text-[#b3201f]">
                Ler a reportagem
              </Link>
            </div>
            <Link href={articlePath(special)} tabIndex={-1} aria-hidden className="w-full flex-[1.3]">
              <Cover src={special.cover_url} alt={special.cover_alt} seed={special.id} ratio="4/3" sizes="(min-width: 1024px) 55vw, 100vw" />
            </Link>
          </div>
        </section>
      )}

      {/* ------------------------- Blocos por editoria ------------------------- */}
      {blocks.length > 0 && (
        <section aria-label="Editorias" className="wrap py-14">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
            {blocks.map(({ section, articles: [lead, ...rest] }) => (
              <section key={section.slug} aria-labelledby={`bloco-${section.slug}`} className="flex flex-col border-t-4 border-rule-strong pt-3">
                <h2 id={`bloco-${section.slug}`} className="mb-4 flex items-baseline justify-between font-display text-2xl">
                  <Link href={`/editoria/${section.slug}`} className="hover:text-accent">
                    {section.name}
                  </Link>
                  <span aria-hidden className="font-sans text-lg text-accent">→</span>
                </h2>
                <Link href={articlePath(lead)} tabIndex={-1} aria-hidden className="mb-3.5">
                  <Cover src={lead.cover_url} alt={lead.cover_alt} seed={lead.id} sizes="(min-width: 1024px) 33vw, 100vw" />
                </Link>
                <h3 className="mb-3.5 font-sans text-xl leading-tight font-bold tracking-[-0.015em]">
                  <Link href={articlePath(lead)} className="headline-link">
                    {lead.title}
                  </Link>
                </h3>
                {rest.map((a) => (
                  <Link key={a.id} href={articlePath(a)} className="headline-link border-t border-rule py-3 font-sans text-[15px] leading-snug font-medium">
                    {a.title}
                  </Link>
                ))}
              </section>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
