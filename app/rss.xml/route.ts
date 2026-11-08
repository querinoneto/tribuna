import { getFeedArticles } from "@/lib/data/public";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/env";
import { articlePath } from "@/lib/format";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const cdata = (s: string) => `<![CDATA[${s.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;

/** Feed RSS 2.0 com as 30 matérias mais recentes. */
export async function GET() {
  const articles = await getFeedArticles(30);
  const items = articles
    .map((a) => {
      const url = `${SITE_URL}${articlePath(a)}`;
      return `    <item>
      <title>${esc(a.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(a.published_at!).toUTCString()}</pubDate>
      ${a.author ? `<dc:creator>${esc(a.author.name)}</dc:creator>` : ""}
      ${a.section ? `<category>${esc(a.section.name)}</category>` : ""}
      <description>${cdata(a.excerpt || a.subtitle || "")}</description>
      <content:encoded>${cdata(a.content_html)}</content:encoded>
      ${a.cover_url ? `<enclosure url="${esc(a.cover_url)}" type="image/jpeg" length="0" />` : ""}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${esc(SITE_NAME)}</title>
    <link>${SITE_URL}</link>
    <description>${esc(SITE_DESCRIPTION)}</description>
    <language>pt-BR</language>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
