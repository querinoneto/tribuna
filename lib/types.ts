export type Role = "admin" | "editor" | "colunista";
export type ArticleStatus = "draft" | "published" | "scheduled" | "archived";

export type Section = { id: string; name: string; slug: string; description: string | null; position: number };
export type Tag = { id: string; name: string; slug: string };
export type Author = {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  avatar_url: string | null;
  is_columnist: boolean;
  profile_id: string | null;
};

export type Article = {
  id: string;
  title: string;
  subtitle: string;
  slug: string;
  excerpt: string;
  content_json: unknown;
  content_html: string;
  cover_url: string | null;
  cover_alt: string;
  cover_caption: string;
  cover_credit: string;
  status: ArticleStatus;
  published_at: string | null;
  scheduled_at: string | null;
  featured: boolean;
  pinned: boolean;
  section_id: string | null;
  author_id: string | null;
  created_by: string | null;
  views: number;
  reading_minutes: number;
  created_at: string;
  updated_at: string;
};

/** Matéria pronta para exibição no site, com editoria, autor e tags. */
export type ArticleCard = Pick<
  Article,
  | "id"
  | "title"
  | "subtitle"
  | "slug"
  | "excerpt"
  | "cover_url"
  | "cover_alt"
  | "published_at"
  | "reading_minutes"
  | "featured"
  | "pinned"
> & {
  section: Pick<Section, "name" | "slug"> | null;
  author: Pick<Author, "name" | "slug" | "avatar_url"> | null;
};

export type ArticleFull = ArticleCard &
  Pick<Article, "content_html" | "cover_caption" | "cover_credit" | "updated_at" | "status"> & {
    tags: Pick<Tag, "name" | "slug">[];
  };

export type Page = { slug: string; title: string; content_html: string; content_json: unknown; updated_at: string };
