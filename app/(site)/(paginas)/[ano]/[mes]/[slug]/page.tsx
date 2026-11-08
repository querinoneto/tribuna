import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import { getArticle, getRecentArticleParams, getRelated } from "@/lib/data/public";
import { SITE_NAME, SITE_URL } from "@/lib/env";
import { articlePath, yearMonth } from "@/lib/format";
import { stripHtml } from "@/lib/sanitize";
import { ArticleCard } from "@/components/site/article-card";
import { ArticleView, articleUrl } from "@/components/site/article-view";
import { ReadingTools, ViewCounter } from "@/components/site/reading-tools";
import { ArticleSkeleton } from "@/components/site/skeletons";

type Params = { ano: string; mes: string; slug: string };

/** As 100 matérias mais recentes saem prontas do build; as outras, na primeira visita. */
export async function generateStaticParams(): Promise<Params[]> {
  const list = await getRecentArticleParams(100);
  const params = list.map((a) => ({ ...yearMonth(a.published_at), slug: a.slug }));
  // Sem banco no build, gera ao menos um caminho "vazio" (vira 404); o resto é gerado sob demanda
  return params.length ? params : [{ ano: "2026", mes: "01", slug: "exemplo" }];
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const a = await getArticle(slug);
  if (!a) return { title: "Página não encontrada" };
  const url = articleUrl(SITE_URL, a);
  const description = a.excerpt || a.subtitle || stripHtml(a.content_html).slice(0, 160);
  const images = a.cover_url
    ? [{ url: a.cover_url, alt: a.cover_alt }]
    : [{ url: "/og-default.png", width: 1200, height: 630, alt: SITE_NAME }];
  return {
    title: a.title,
    description,
    alternates: { canonical: url },
    authors: a.author ? [{ name: a.author.name, url: `${SITE_URL}/autor/${a.author.slug}` }] : undefined,
    openGraph: {
      type: "article",
      url,
      title: a.title,
      description,
      siteName: SITE_NAME,
      locale: "pt_BR",
      publishedTime: a.published_at ?? undefined,
      modifiedTime: a.updated_at,
      section: a.section?.name,
      tags: a.tags.map((t) => t.name),
      authors: a.author ? [a.author.name] : undefined,
      images,
    },
    twitter: { card: "summary_large_image", title: a.title, description, images: [images[0].url] },
  };
}

async function Article({ params }: { params: Promise<Params> }) {
  const { ano, mes, slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();

  // Endereço canônico: corrige ano/mês errados (ex.: link antigo)
  const canonical = articlePath(article);
  if (canonical !== `/${ano}/${mes}/${slug}`) permanentRedirect(canonical);

  const url = articleUrl(SITE_URL, article);
  const related = await getRelated(article.id, article.section?.slug ?? null);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.excerpt || article.subtitle || undefined,
    image: article.cover_url ? [article.cover_url] : undefined,
    datePublished: article.published_at,
    dateModified: article.updated_at,
    articleSection: article.section?.name,
    keywords: article.tags.map((t) => t.name).join(", ") || undefined,
    inLanguage: "pt-BR",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    author: article.author
      ? { "@type": "Person", name: article.author.name, url: `${SITE_URL}/autor/${article.author.slug}` }
      : { "@type": "Organization", name: SITE_NAME },
    publisher: { "@type": "NewsMediaOrganization", name: SITE_NAME, url: SITE_URL, logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.svg` } },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <ReadingTools />
      <ViewCounter id={article.id} />
      <ArticleView article={article} url={url} />

      {related.length > 0 && (
        <section aria-labelledby="leia-tambem" className="wrap mt-16 pb-16 sm:mt-20">
          <h2 id="leia-tambem" className="rule-title mb-6">
            Leia também
          </h2>
          <div className="grid gap-x-7 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((a) => (
              <ArticleCard key={a.id} article={a} showDek={false} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

export default function ArticlePage({ params }: { params: Promise<Params> }) {
  return (
    <Suspense fallback={<ArticleSkeleton />}>
      <Article params={params} />
    </Suspense>
  );
}
