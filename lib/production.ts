import { yearMonth } from "./format";

/**
 * Indicadores de produção dos colunistas (painel “Produção”, só para o
 * administrador). Funções puras: recebem as linhas do banco e devolvem os
 * números já calculados. Testadas em tests/unit/production.test.ts.
 */

export type ProdArticle = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "scheduled" | "archived";
  in_review: boolean;
  review_note: string;
  submitted_at: string | null;
  published_at: string | null;
  created_at: string;
  views: number;
  reading_minutes: number;
  author_id: string | null;
};

export type ProdAuthor = { id: string; name: string; slug: string; avatar_url: string | null };

export const PERIODS = [
  { key: "30", label: "30 dias", days: 30 },
  { key: "90", label: "90 dias", days: 90 },
  { key: "365", label: "12 meses", days: 365 },
  { key: "tudo", label: "Tudo", days: null },
] as const;
export type PeriodKey = (typeof PERIODS)[number]["key"];

const DAY = 86_400_000;

function isPublished(a: ProdArticle, now: Date) {
  return (a.status === "published" || a.status === "scheduled") && a.published_at !== null && new Date(a.published_at) <= now;
}

function inPeriod(iso: string | null, since: Date | null) {
  return iso !== null && (since === null || new Date(iso) >= since);
}

/** Tempo entre o envio para revisão e a publicação, em horas. */
function reviewHours(a: ProdArticle): number | null {
  if (!a.submitted_at || !a.published_at) return null;
  const h = (new Date(a.published_at).getTime() - new Date(a.submitted_at).getTime()) / 3_600_000;
  return h >= 0 ? h : null;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);

export type ColumnistStats = {
  author: ProdAuthor;
  publishedInPeriod: number;
  viewsInPeriod: number;
  avgViews: number | null;
  publishedTotal: number;
  inReview: number;
  drafts: number;
  returned: number;
  lastPublished: string | null;
  daysSinceLast: number | null;
  avgReviewHours: number | null;
  avgReadingMinutes: number | null;
  topArticle: { title: string; slug: string; published_at: string; views: number } | null;
};

export type ProductionReport = {
  since: Date | null;
  totals: {
    columnists: number;
    activeColumnists: number;
    published: number;
    views: number;
    avgViews: number | null;
    inReview: number;
    avgReviewHours: number | null;
    perColumnist: number | null;
  };
  monthly: { key: string; label: string; count: number }[];
  columnists: ColumnistStats[];
  top: { title: string; slug: string; published_at: string; views: number; author: string }[];
};

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function buildReport(params: {
  authors: ProdAuthor[];
  articles: ProdArticle[];
  period: PeriodKey;
  now?: Date;
}): ProductionReport {
  const now = params.now ?? new Date();
  const days = PERIODS.find((p) => p.key === params.period)?.days ?? null;
  const since = days === null ? null : new Date(now.getTime() - days * DAY);
  const ids = new Set(params.authors.map((a) => a.id));
  const mine = params.articles.filter((a) => a.author_id !== null && ids.has(a.author_id));

  const columnists: ColumnistStats[] = params.authors.map((author) => {
    const list = mine.filter((a) => a.author_id === author.id);
    const published = list.filter((a) => isPublished(a, now));
    const recent = published.filter((a) => inPeriod(a.published_at, since));
    const views = recent.reduce((s, a) => s + (a.views ?? 0), 0);
    const last = published.map((a) => a.published_at!).sort().at(-1) ?? null;
    const top = [...recent].sort((a, b) => b.views - a.views)[0];
    return {
      author,
      publishedInPeriod: recent.length,
      viewsInPeriod: views,
      avgViews: recent.length ? views / recent.length : null,
      publishedTotal: published.length,
      inReview: list.filter((a) => a.in_review && a.status === "draft").length,
      drafts: list.filter((a) => a.status === "draft" && !a.in_review).length,
      returned: list.filter((a) => a.status === "draft" && !a.in_review && a.review_note.trim() !== "").length,
      lastPublished: last,
      daysSinceLast: last ? Math.floor((now.getTime() - new Date(last).getTime()) / DAY) : null,
      avgReviewHours: avg(recent.map(reviewHours).filter((h): h is number => h !== null)),
      avgReadingMinutes: avg(recent.map((a) => a.reading_minutes)),
      topArticle: top ? { title: top.title, slug: top.slug, published_at: top.published_at!, views: top.views } : null,
    };
  });

  columnists.sort(
    (a, b) =>
      b.publishedInPeriod - a.publishedInPeriod ||
      b.viewsInPeriod - a.viewsInPeriod ||
      a.author.name.localeCompare(b.author.name, "pt-BR"),
  );

  const recentAll = mine.filter((a) => isPublished(a, now) && inPeriod(a.published_at, since));
  const viewsAll = recentAll.reduce((s, a) => s + (a.views ?? 0), 0);

  // Publicações por mês nos últimos 12 meses (sempre, independentemente do período)
  const monthly: ProductionReport["monthly"] = [];
  const { ano, mes } = yearMonth(now);
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(Number(ano), Number(mes) - 1 - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    monthly.push({ key, label: `${MONTHS[d.getUTCMonth()]}/${String(d.getUTCFullYear()).slice(2)}`, count: 0 });
  }
  const byKey = new Map(monthly.map((m) => [m.key, m]));
  for (const a of mine) {
    if (!isPublished(a, now)) continue;
    const ym = yearMonth(a.published_at!);
    const m = byKey.get(`${ym.ano}-${ym.mes}`);
    if (m) m.count++;
  }

  const names = new Map(params.authors.map((a) => [a.id, a.name]));
  const top = [...recentAll]
    .sort((a, b) => b.views - a.views)
    .slice(0, 5)
    .map((a) => ({ title: a.title, slug: a.slug, published_at: a.published_at!, views: a.views, author: names.get(a.author_id!) ?? "" }));

  const active = columnists.filter((c) => c.publishedInPeriod > 0).length;

  return {
    since,
    totals: {
      columnists: params.authors.length,
      activeColumnists: active,
      published: recentAll.length,
      views: viewsAll,
      avgViews: recentAll.length ? viewsAll / recentAll.length : null,
      inReview: mine.filter((a) => a.in_review && a.status === "draft").length,
      avgReviewHours: avg(recentAll.map(reviewHours).filter((h): h is number => h !== null)),
      perColumnist: params.authors.length ? recentAll.length / params.authors.length : null,
    },
    monthly,
    columnists,
    top,
  };
}

/** "3 h", "2 dias" */
export function formatDuration(hours: number | null): string {
  if (hours === null) return "—";
  if (hours < 1) return "menos de 1 h";
  if (hours < 48) return `${Math.round(hours)} h`;
  return `${Math.round(hours / 24)} dias`;
}

const intFmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const decFmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
export const formatInt = (n: number | null) => (n === null ? "—" : intFmt.format(n));
export const formatDec = (n: number | null) => (n === null ? "—" : decFmt.format(n));
