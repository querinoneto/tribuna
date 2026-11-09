import { describe, expect, it } from "vitest";
import { buildReport, formatDuration, type ProdArticle } from "@/lib/production";

const now = new Date("2026-11-08T15:00:00Z");
const ago = (days: number, hours = 0) => new Date(now.getTime() - days * 86_400_000 - hours * 3_600_000).toISOString();
let n = 0;
function art(p: Partial<ProdArticle>): ProdArticle {
  n++;
  return {
    id: `a${n}`,
    title: `Texto ${n}`,
    slug: `texto-${n}`,
    status: "published",
    in_review: false,
    review_note: "",
    submitted_at: null,
    published_at: ago(1),
    created_at: ago(2),
    views: 0,
    reading_minutes: 4,
    author_id: "ana",
    ...p,
  };
}
const authors = [
  { id: "ana", name: "Ana", slug: "ana", avatar_url: null },
  { id: "beto", name: "Beto", slug: "beto", avatar_url: null },
];

describe("indicadores de produção", () => {
  const articles = [
    art({ views: 100, published_at: ago(5), submitted_at: ago(5, 10) }),
    art({ views: 50, published_at: ago(10), submitted_at: ago(12) }),
    art({ views: 999, published_at: ago(200) }),
    art({ status: "draft", in_review: true, published_at: null, submitted_at: ago(1) }),
    art({ status: "draft", review_note: "Ajuste o título", published_at: null }),
    art({ author_id: "beto", views: 30, published_at: ago(40) }),
    art({ author_id: "redacao", views: 5000, published_at: ago(2) }),
  ];

  it("conta só textos de colunistas publicados no período", () => {
    const r = buildReport({ authors, articles, period: "30", now });
    expect(r.totals.published).toBe(2);
    expect(r.totals.views).toBe(150);
    expect(r.totals.avgViews).toBe(75);
    expect(r.totals.activeColumnists).toBe(1);
    expect(r.totals.inReview).toBe(1);
  });

  it("calcula os números de cada colunista", () => {
    const r = buildReport({ authors, articles, period: "90", now });
    const ana = r.columnists.find((c) => c.author.id === "ana")!;
    expect(ana.publishedInPeriod).toBe(2);
    expect(ana.publishedTotal).toBe(3);
    expect(ana.inReview).toBe(1);
    expect(ana.drafts).toBe(1);
    expect(ana.returned).toBe(1);
    expect(ana.daysSinceLast).toBe(5);
    expect(ana.avgReviewHours).toBe(29); // (10 h + 48 h) / 2
    expect(ana.topArticle?.views).toBe(100);
    expect(r.columnists[0].author.id).toBe("ana");
    expect(r.columnists.find((c) => c.author.id === "beto")!.publishedInPeriod).toBe(1);
  });

  it("período “Tudo” inclui textos antigos", () => {
    const r = buildReport({ authors, articles, period: "tudo", now });
    expect(r.totals.published).toBe(4);
  });

  it("monta 12 meses de publicações terminando no mês atual", () => {
    const r = buildReport({ authors, articles, period: "30", now });
    expect(r.monthly).toHaveLength(12);
    expect(r.monthly.at(-1)!.key).toBe("2026-11");
    expect(r.monthly.reduce((s, m) => s + m.count, 0)).toBe(4);
  });

  it("formata a duração da revisão", () => {
    expect(formatDuration(null)).toBe("—");
    expect(formatDuration(0.5)).toBe("menos de 1 h");
    expect(formatDuration(29)).toBe("29 h");
    expect(formatDuration(72)).toBe("3 dias");
  });
});
