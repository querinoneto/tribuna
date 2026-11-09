import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { CONTENT_TAG } from "@/lib/revalidate";
import { createPublicClient } from "@/lib/supabase/public";
import type { ArticleCard, ArticleFull, Author, Page, Section } from "@/lib/types";

/*
 * Consultas do site público. Todas usam "use cache": o resultado entra na
 * página estática e é renovado (a) na hora, quando algo é publicado no
 * painel (etiqueta "conteudo"), e (b) a cada poucos minutos, o que faz os
 * textos agendados aparecerem no horário mesmo sem ninguém mexer no painel.
 *
 * Se o banco estiver indisponível, devolvem listas vazias em vez de derrubar
 * a página (o site mostra estados vazios bem desenhados).
 */

export const CARD_SELECT =
  "id, title, subtitle, slug, excerpt, cover_url, cover_alt, published_at, reading_minutes, featured, pinned, section:sections(name, slug), author:authors(name, slug, avatar_url, is_columnist, is_contributor)";

function setup() {
  cacheTag(CONTENT_TAG);
  cacheLife("jornal");
  return createPublicClient();
}

function log(where: string, error: unknown) {
  if (error) console.error(`[dados] ${where}:`, (error as { message?: string }).message ?? error);
}

const asCards = (rows: unknown) => (rows ?? []) as ArticleCard[];

export async function getSections(): Promise<Section[]> {
  "use cache";
  const db = setup();
  if (!db) return [];
  const { data, error } = await db.from("sections").select("id, name, slug, description, position").order("position");
  log("editorias", error);
  return (data ?? []) as Section[];
}

export type HomeData = {
  hero: ArticleCard | null;
  side: ArticleCard[];
  latest: ArticleCard[];
  special: ArticleCard | null;
  mostRead: ArticleCard[];
  opinion: ArticleCard[];
  blocks: { section: Section; articles: ArticleCard[] }[];
};

export async function getHomeData(): Promise<HomeData> {
  "use cache";
  const db = setup();
  const empty: HomeData = { hero: null, side: [], latest: [], special: null, mostRead: [], opinion: [], blocks: [] };
  if (!db) return empty;

  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [recentQ, featuredQ, pinnedQ, readQ, sectionsQ] = await Promise.all([
    db.from("articles").select(CARD_SELECT).order("published_at", { ascending: false }).limit(40),
    db.from("articles").select(CARD_SELECT).eq("featured", true).order("published_at", { ascending: false }).limit(1),
    db.from("articles").select(CARD_SELECT).eq("pinned", true).order("published_at", { ascending: false }).limit(4),
    db.from("articles").select(CARD_SELECT).gte("published_at", since).order("views", { ascending: false }).limit(5),
    db.from("sections").select("id, name, slug, description, position").order("position"),
  ]);
  [recentQ, featuredQ, pinnedQ, readQ, sectionsQ].forEach((q) => log("home", q.error));

  const recent = asCards(recentQ.data);
  const pinned = asCards(pinnedQ.data);
  const hero = asCards(featuredQ.data)[0] ?? recent[0] ?? null;
  const used = new Set<string>(hero ? [hero.id] : []);

  const special = pinned.find((a) => !used.has(a.id)) ?? null;
  if (special) used.add(special.id);

  const pick = (list: ArticleCard[], n: number, filter: (a: ArticleCard) => boolean = () => true) => {
    const out: ArticleCard[] = [];
    for (const a of list) {
      if (out.length >= n) break;
      if (!used.has(a.id) && filter(a)) {
        out.push(a);
        used.add(a.id);
      }
    }
    return out;
  };

  const notOpinion = (a: ArticleCard) => a.section?.slug !== "opiniao";
  const side = pick([...pinned, ...recent], 3, notOpinion);
  const opinion = recent.filter((a) => a.section?.slug === "opiniao" && !used.has(a.id)).slice(0, 4);
  opinion.forEach((a) => used.add(a.id));
  const latest = pick(recent, 4, notOpinion);

  const sections = (sectionsQ.data ?? []) as Section[];
  const blocks = sections
    .filter((s) => s.slug !== "opiniao")
    .map((section) => ({ section, articles: recent.filter((a) => a.section?.slug === section.slug && !used.has(a.id)).slice(0, 3) }))
    .filter((b) => b.articles.length > 0)
    .slice(0, 6);

  let mostRead = asCards(readQ.data);
  if (mostRead.length < 3) mostRead = recent.slice(0, 5);

  return { hero, side, latest, special, mostRead, opinion, blocks };
}

export async function getArticle(slug: string): Promise<ArticleFull | null> {
  "use cache";
  const db = setup();
  if (!db) return null;
  const { data, error } = await db
    .from("articles")
    .select(`${CARD_SELECT}, content_html, cover_caption, cover_credit, updated_at, status`)
    .eq("slug", slug)
    .maybeSingle();
  log("matéria", error);
  if (!data) return null;
  return data as unknown as ArticleFull;
}

export async function getRelated(articleId: string, sectionSlug: string | null): Promise<ArticleCard[]> {
  "use cache";
  const db = setup();
  if (!db) return [];
  let list: ArticleCard[] = [];
  if (sectionSlug) {
    const { data: s } = await db.from("sections").select("id").eq("slug", sectionSlug).maybeSingle();
    if (s) {
      const { data, error } = await db
        .from("articles")
        .select(CARD_SELECT)
        .eq("section_id", s.id)
        .neq("id", articleId)
        .order("published_at", { ascending: false })
        .limit(4);
      log("leia também", error);
      list = asCards(data);
    }
  }
  if (list.length < 4) {
    const { data: more } = await db.from("articles").select(CARD_SELECT).neq("id", articleId).order("published_at", { ascending: false }).limit(8);
    const seen = new Set(list.map((a) => a.id));
    list = [...list, ...asCards(more).filter((a) => !seen.has(a.id))].slice(0, 4);
  }
  return list;
}

export const PAGE_SIZE = 12;

export async function getSectionPage(slug: string, page: number) {
  "use cache";
  const db = setup();
  if (!db) return null;
  const { data: section } = await db.from("sections").select("id, name, slug, description, position").eq("slug", slug).maybeSingle();
  if (!section) return null;
  const from = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await db
    .from("articles")
    .select(CARD_SELECT, { count: "exact" })
    .eq("section_id", section.id)
    .order("published_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  log("editoria", error);
  return { section: section as Section, articles: asCards(data), total: count ?? 0 };
}

export async function getAuthorPage(slug: string, page: number) {
  "use cache";
  const db = setup();
  if (!db) return null;
  const { data: author } = await db.from("authors").select("id, name, slug, bio, avatar_url, is_columnist, is_contributor, profile_id").eq("slug", slug).maybeSingle();
  // Colaboradores externos não têm página com o histórico de textos
  if (!author || author.is_contributor) return null;
  const from = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await db
    .from("articles")
    .select(CARD_SELECT, { count: "exact" })
    .eq("author_id", author.id)
    .order("published_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  log("autor", error);
  return { author: author as Author, articles: asCards(data), total: count ?? 0 };
}

export async function getColumnists(): Promise<Author[]> {
  "use cache";
  const db = setup();
  if (!db) return [];
  const { data, error } = await db.from("authors").select("id, name, slug, bio, avatar_url, is_columnist, is_contributor, profile_id").eq("is_columnist", true).order("name");
  log("colunistas", error);
  return (data ?? []) as Author[];
}

export type ColumnistSummary = Author & {
  total: number;
  latest: { title: string; slug: string; published_at: string } | null;
};

/** Colunistas com o número de textos publicados e o texto mais recente. */
export async function getColumnistsOverview(): Promise<ColumnistSummary[]> {
  "use cache";
  const db = setup();
  if (!db) return [];
  const { data: authors, error } = await db
    .from("authors")
    .select("id, name, slug, bio, avatar_url, is_columnist, is_contributor, profile_id")
    .eq("is_columnist", true)
    .order("name");
  log("colunistas", error);
  const list = (authors ?? []) as Author[];
  if (!list.length) return [];
  // A política de leitura pública só devolve textos já publicados
  const { data: arts } = await db
    .from("articles")
    .select("author_id, title, slug, published_at")
    .in("author_id", list.map((a) => a.id))
    .order("published_at", { ascending: false })
    .limit(2000);
  const rows = (arts ?? []) as { author_id: string; title: string; slug: string; published_at: string }[];
  return list.map((a) => {
    const mine = rows.filter((r) => r.author_id === a.id);
    return { ...a, total: mine.length, latest: mine[0] ? { title: mine[0].title, slug: mine[0].slug, published_at: mine[0].published_at } : null };
  });
}

export async function searchArticles(q: string, page: number) {
  "use cache";
  cacheTag(CONTENT_TAG);
  cacheLife("minutes");
  const db = createPublicClient();
  if (!db || !q.trim()) return { articles: [] as ArticleCard[], total: 0 };
  const from = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await db
    .rpc("search_articles", { q: q.slice(0, 120) }, { count: "exact" })
    .select(CARD_SELECT)
    .range(from, from + PAGE_SIZE - 1);
  log("busca", error);
  return { articles: asCards(data), total: count ?? 0 };
}

export async function getPage(slug: string): Promise<Page | null> {
  "use cache";
  const db = setup();
  if (!db) return null;
  const { data, error } = await db.from("pages").select("slug, title, content_html, content_json, updated_at").eq("slug", slug).maybeSingle();
  log("página", error);
  return (data as Page) ?? null;
}

export async function getSitemapData() {
  "use cache";
  const db = setup();
  if (!db) return { articles: [], sections: [], authors: [] };
  const [a, s, au] = await Promise.all([
    db.from("articles").select("slug, published_at, updated_at").order("published_at", { ascending: false }).limit(5000),
    db.from("sections").select("slug"),
    db.from("authors").select("slug").eq("is_contributor", false),
  ]);
  return {
    articles: (a.data ?? []) as { slug: string; published_at: string; updated_at: string }[],
    sections: (s.data ?? []) as { slug: string }[],
    authors: (au.data ?? []) as { slug: string }[],
  };
}

/** Matérias recentes para pré-renderizar no build (as demais são geradas na 1ª visita). */
export async function getRecentArticleParams(limit = 100) {
  "use cache";
  const db = setup();
  if (!db) return [];
  const { data } = await db.from("articles").select("slug, published_at").order("published_at", { ascending: false }).limit(limit);
  return (data ?? []) as { slug: string; published_at: string }[];
}
