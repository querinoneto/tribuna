import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { articlePath, formatDate } from "@/lib/format";
import {
  buildReport,
  formatDec,
  formatDuration,
  formatInt,
  PERIODS,
  type PeriodKey,
  type ProdArticle,
  type ProdAuthor,
} from "@/lib/production";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/page-header";
import { isOutdatedSchema, SchemaNotice } from "@/components/admin/schema-notice";

export const metadata = { title: "Produção dos colunistas" };

export default async function ProducaoPage({ searchParams }: PageProps<"/admin/producao">) {
  await requireRole("admin");
  const sp = (await searchParams) as { periodo?: string };
  const period = (PERIODS.find((p) => p.key === sp.periodo)?.key ?? "90") as PeriodKey;
  const periodLabel = PERIODS.find((p) => p.key === period)!.label;

  const supabase = await createClient();
  const { data: authors } = await supabase
    .from("authors")
    .select("id, name, slug, avatar_url")
    .eq("is_columnist", true)
    .order("name");
  const ids = (authors ?? []).map((a) => a.id);
  const load = (cols: string) => supabase.from("articles").select(cols).in("author_id", ids).limit(5000);
  let outdated = false;
  let articles: unknown[] = [];
  if (ids.length) {
    let res = await load("id, title, slug, status, in_review, review_note, submitted_at, published_at, created_at, views, reading_minutes, author_id");
    if (isOutdatedSchema(res.error)) {
      outdated = true;
      res = await load("id, title, slug, status, published_at, created_at, views, reading_minutes, author_id");
    }
    articles = ((res.data ?? []) as unknown as Record<string, unknown>[]).map((a) => ({ in_review: false, review_note: "", submitted_at: null, ...a }));
  }

  const r = buildReport({ authors: (authors ?? []) as ProdAuthor[], articles: articles as ProdArticle[], period });
  const maxMonth = Math.max(1, ...r.monthly.map((m) => m.count));

  const kpis = [
    { label: "Textos publicados", value: formatInt(r.totals.published), hint: periodLabel === "Tudo" ? "desde o início" : `nos últimos ${periodLabel}` },
    { label: "Leituras", value: formatInt(r.totals.views), hint: "dos textos publicados no período" },
    { label: "Leituras por texto", value: formatInt(r.totals.avgViews), hint: "média" },
    {
      label: "Colunistas ativos",
      value: `${r.totals.activeColumnists}/${r.totals.columnists}`,
      hint: "publicaram no período",
    },
    { label: "Textos por colunista", value: formatDec(r.totals.perColumnist), hint: "média no período" },
    { label: "Tempo de revisão", value: formatDuration(r.totals.avgReviewHours), hint: "do envio à publicação" },
    { label: "Em revisão agora", value: formatInt(r.totals.inReview), hint: "aguardando a coordenação", href: "/admin/textos?status=revisao" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader
        title="Produção"
        description="Indicadores de produtividade e resultado dos colunistas. Só o administrador vê esta página."
      />

      {outdated && <SchemaNotice />}
      <nav aria-label="Período" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {PERIODS.map((p) => {
          const on = p.key === period;
          return (
            <Link
              key={p.key}
              href={`/admin/producao?periodo=${p.key}`}
              aria-current={on ? "page" : undefined}
              className={`inline-flex min-h-10 shrink-0 items-center rounded-full border px-4 text-sm ${
                on ? "border-ink bg-ink font-semibold text-paper" : "border-rule bg-paper hover:border-ink"
              }`}
            >
              {p.label}
            </Link>
          );
        })}
      </nav>

      {r.totals.columnists === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-rule p-10 text-center">
          <p className="font-display text-2xl">Nenhum colunista ainda</p>
          <p className="mt-1 text-sm text-muted">
            Convide colunistas na área <Link href="/admin/usuarios" className="underline">Usuários</Link>. Os indicadores aparecem aqui quando eles começarem a publicar.
          </p>
        </div>
      ) : (
        <>
          <section aria-label="Indicadores gerais" className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {kpis.map((k) => {
              const body = (
                <>
                  <span className="block font-display text-3xl leading-none tabular-nums sm:text-4xl">{k.value}</span>
                  <span className="mt-2 block text-sm font-semibold">{k.label}</span>
                  <span className="block text-xs text-muted">{k.hint}</span>
                </>
              );
              return k.href ? (
                <Link key={k.label} href={k.href} className="rounded-lg border border-rule bg-paper p-4 hover:border-ink">
                  {body}
                </Link>
              ) : (
                <div key={k.label} className="rounded-lg border border-rule bg-paper p-4">
                  {body}
                </div>
              );
            })}
          </section>

          <section aria-labelledby="mensal" className="mt-8 rounded-lg border border-rule bg-paper p-4 sm:p-5">
            <h2 id="mensal" className="font-semibold">
              Publicações por mês <span className="font-normal text-muted">· últimos 12 meses</span>
            </h2>
            <div className="mt-4 flex h-40 items-end gap-1.5 sm:gap-3" role="img" aria-label={r.monthly.map((m) => `${m.label}: ${m.count}`).join("; ")}>
              {r.monthly.map((m) => (
                <div key={m.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-[11px] font-semibold tabular-nums">{m.count || ""}</span>
                  <div className="w-full rounded-t-sm bg-accent" style={{ height: `${(m.count / maxMonth) * 100}%`, minHeight: m.count ? 4 : 1, opacity: m.count ? 1 : 0.25 }} />
                  <span className="text-[10px] whitespace-nowrap text-muted sm:text-[11px]">{m.label}</span>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="por-colunista" className="mt-8">
            <h2 id="por-colunista" className="text-lg font-semibold">
              Por colunista <span className="text-sm font-normal text-muted">· {periodLabel === "Tudo" ? "desde o início" : `últimos ${periodLabel}`}</span>
            </h2>

            {/* Tabela (computador) */}
            <div className="mt-3 hidden overflow-x-auto rounded-lg border border-rule bg-paper lg:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-rule text-xs tracking-wide text-muted uppercase">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Colunista</th>
                    <th scope="col" className="px-3 py-3 text-right font-semibold">Publicados</th>
                    <th scope="col" className="px-3 py-3 text-right font-semibold">Leituras</th>
                    <th scope="col" className="px-3 py-3 text-right font-semibold">Média</th>
                    <th scope="col" className="px-3 py-3 text-right font-semibold">Em revisão</th>
                    <th scope="col" className="px-3 py-3 text-right font-semibold">Rascunhos</th>
                    <th scope="col" className="px-3 py-3 text-right font-semibold">Revisão leva</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Última publicação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule">
                  {r.columnists.map((c) => (
                    <tr key={c.author.id} className="align-top">
                      <td className="px-4 py-3">
                        <Link href={`/admin/textos?autor=${c.author.id}`} className="font-semibold hover:underline">
                          {c.author.name}
                        </Link>
                        <span className="block text-xs text-muted">{c.publishedTotal} publicados no total</span>
                        {c.topArticle && (
                          <span className="mt-1 block max-w-xs truncate text-xs text-muted">
                            Mais lido:{" "}
                            <a href={articlePath(c.topArticle)} target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-ink">
                              {c.topArticle.title}
                            </a>{" "}
                            ({formatInt(c.topArticle.views)})
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right text-base font-semibold tabular-nums">{c.publishedInPeriod}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatInt(c.viewsInPeriod)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatInt(c.avgViews)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{c.inReview || "—"}</td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {c.drafts || "—"}
                        {c.returned > 0 && <span className="block text-xs text-accent">{c.returned} devolvido{c.returned > 1 ? "s" : ""}</span>}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatDuration(c.avgReviewHours)}</td>
                      <td className="px-4 py-3">
                        {c.lastPublished ? (
                          <>
                            {formatDate(c.lastPublished)}
                            <Inactivity days={c.daysSinceLast!} />
                          </>
                        ) : (
                          <span className="text-muted">Nunca publicou</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cartões (celular e tablet) */}
            <ul className="mt-3 flex flex-col gap-3 lg:hidden">
              {r.columnists.map((c) => (
                <li key={c.author.id} className="rounded-lg border border-rule bg-paper p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <Link href={`/admin/textos?autor=${c.author.id}`} className="font-semibold hover:underline">
                      {c.author.name}
                    </Link>
                    <span className="text-xs text-muted">{c.publishedTotal} no total</span>
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <Stat label="Publicados" value={String(c.publishedInPeriod)} />
                    <Stat label="Leituras" value={formatInt(c.viewsInPeriod)} />
                    <Stat label="Média" value={formatInt(c.avgViews)} />
                    <Stat label="Em revisão" value={String(c.inReview)} />
                    <Stat label="Rascunhos" value={String(c.drafts)} />
                    <Stat label="Revisão leva" value={formatDuration(c.avgReviewHours)} />
                  </dl>
                  <p className="mt-3 text-xs text-muted">
                    {c.lastPublished ? (
                      <>
                        Última publicação: {formatDate(c.lastPublished)}
                        <Inactivity days={c.daysSinceLast!} />
                      </>
                    ) : (
                      "Nunca publicou"
                    )}
                    {c.returned > 0 && <span className="block text-accent">{c.returned} texto(s) devolvido(s) aguardando ajuste</span>}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {r.top.length > 0 && (
            <section aria-labelledby="mais-lidos" className="mt-8">
              <h2 id="mais-lidos" className="text-lg font-semibold">
                Mais lidos dos colunistas <span className="text-sm font-normal text-muted">· publicados no período</span>
              </h2>
              <ol className="mt-3 divide-y divide-rule rounded-lg border border-rule bg-paper">
                {r.top.map((t, i) => (
                  <li key={t.slug} className="flex items-baseline gap-3 px-4 py-3">
                    <span className="font-display text-2xl text-accent tabular-nums">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <a href={articlePath(t)} target="_blank" rel="noopener" className="font-semibold hover:underline">
                        {t.title}
                      </a>
                      <span className="block text-xs text-muted">
                        {t.author} · {formatDate(t.published_at)}
                      </span>
                    </span>
                    <span className="text-sm whitespace-nowrap tabular-nums">{formatInt(t.views)} leituras</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <p className="mt-8 text-xs text-muted">
            As leituras são contadas desde a publicação de cada texto (cada abertura da matéria no site soma uma). Por isso, textos mais antigos tendem a
            ter mais leituras. “Revisão leva” é o tempo médio entre o envio do colunista e a publicação.
          </p>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col-reverse rounded-md bg-paper-2 px-2 py-2">
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd className="text-lg leading-tight font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function Inactivity({ days }: { days: number }) {
  if (days < 1) return <span className="block text-xs text-muted">hoje</span>;
  const alert = days > 30;
  return (
    <span className={`block text-xs ${alert ? "font-semibold text-accent" : "text-muted"}`}>
      há {days} {days === 1 ? "dia" : "dias"}
      {alert ? " sem publicar" : ""}
    </span>
  );
}
