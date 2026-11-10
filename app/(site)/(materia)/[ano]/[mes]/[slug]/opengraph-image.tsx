import { getArticle } from "@/lib/data/public";
import { SITE_NAME, SITE_URL } from "@/lib/env";
import { columnLabel } from "@/lib/format";
import { articleOgImage, OG_SIZE } from "@/lib/og";

/** Miniatura de compartilhamento de cada matéria (WhatsApp, redes sociais). */
export const size = OG_SIZE;
export const contentType = "image/jpeg";
export const alt = SITE_NAME;

export default async function Image({ params }: { params: Promise<{ ano: string; mes: string; slug: string }> }) {
  const { slug } = await params;
  const a = await getArticle(slug);
  return articleOgImage({
    title: a?.title ?? SITE_NAME,
    section: a?.column?.name ? columnLabel(a.column.name) : (a?.section?.name ?? null),
    author: a?.author?.name ?? null,
    cover_url: a?.cover_url ?? null,
    domain: new URL(SITE_URL).host.replace(/^www\./, ""),
  });
}
