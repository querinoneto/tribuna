import type { MetadataRoute } from "next";
import { getSitemapData } from "@/lib/data/public";
import { SITE_URL } from "@/lib/env";
import { articlePath } from "@/lib/format";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { articles, sections, authors, columns } = await getSitemapData();
  const pages = ["sobre", "contato", "expediente", "privacidade", "termos-de-colaboracao", "colunistas", "publique"];
  return [
    { url: SITE_URL, changeFrequency: "hourly", priority: 1 },
    ...sections.map((s) => ({ url: `${SITE_URL}/editoria/${s.slug}`, changeFrequency: "hourly" as const, priority: 0.8 })),
    ...articles.map((a) => ({ url: `${SITE_URL}${articlePath(a)}`, lastModified: a.updated_at, priority: 0.7 })),
    ...columns.map((c) => ({ url: `${SITE_URL}/colunas/${c.slug}`, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...authors.map((a) => ({ url: `${SITE_URL}/autor/${a.slug}`, changeFrequency: "weekly" as const, priority: 0.5 })),
    ...pages.map((p) => ({ url: `${SITE_URL}/${p}`, changeFrequency: "monthly" as const, priority: 0.3 })),
  ];
}
