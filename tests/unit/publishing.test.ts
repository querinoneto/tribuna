import { describe, expect, it } from "vitest";
import { canEditArticle, canManageUsers, canPublish, isPubliclyVisible, validateTransition } from "@/lib/permissions";
import { planTransition } from "@/lib/publishing";
import { sanitizeArticleHtml } from "@/lib/sanitize";
import { slugify } from "@/lib/slug";
import { articlePath, formatDate, readingTime } from "@/lib/format";
import { validateImageFile, type ArticleInput } from "@/lib/validation";

const NOW = new Date("2026-11-08T12:00:00Z");

const ready: ArticleInput = {
  title: "Assembleia aprova pauta",
  subtitle: "",
  slug: "assembleia-aprova-pauta",
  excerpt: "",
  content_json: null,
  content_html: "<p>Texto com conteúdo suficiente para publicar.</p>",
  cover_url: null,
  cover_alt: "",
  cover_caption: "",
  cover_credit: "",
  section_id: "00000000-0000-4000-8000-000000000001",
  author_id: "00000000-0000-4000-8000-000000000002",
  featured: false,
  pinned: false,
};

describe("permissões por papel (interface)", () => {
  it("toda a equipe publica; quem não está na equipe, não", () => {
    expect(canPublish("admin")).toBe(true);
    expect(canPublish("editor")).toBe(true);
    expect(canPublish("colunista")).toBe(true);
    expect(canPublish(null)).toBe(false);
  });

  it("só admin gerencia usuários", () => {
    expect(canManageUsers("admin")).toBe(true);
    expect(canManageUsers("editor")).toBe(false);
  });

  it("colunista edita só os próprios textos, inclusive publicados", () => {
    expect(canEditArticle("colunista", "u1", { created_by: "u1", status: "draft" })).toBe(true);
    expect(canEditArticle("colunista", "u1", { created_by: "u2", status: "draft" })).toBe(false);
    expect(canEditArticle("colunista", "u1", { created_by: "u1", status: "published" })).toBe(true);
    expect(canEditArticle("editor", "u1", { created_by: "u2", status: "published" })).toBe(true);
    expect(canEditArticle(null, "u1", { created_by: "u1", status: "draft" })).toBe(false);
  });
});

describe("fluxo de publicação e agendamento", () => {
  it("publicar pela primeira vez usa a hora atual", () => {
    const r = planTransition({ role: "editor", target: "published", input: ready, now: NOW });
    expect(r).toEqual({ ok: true, patch: { status: "published", scheduled_at: null, published_at: NOW.toISOString() } });
  });

  it("atualizar um texto publicado mantém a data original", () => {
    const original = "2026-11-01T10:00:00.000Z";
    const r = planTransition({ role: "editor", target: "published", input: ready, currentPublishedAt: original, now: NOW });
    expect(r.ok && r.patch.published_at).toBe(original);
  });

  it("colunista publica e agenda os próprios textos", () => {
    const pub = planTransition({ role: "colunista", target: "published", input: ready, now: NOW });
    const sch = planTransition({ role: "colunista", target: "scheduled", input: ready, scheduledAt: "2026-11-09T12:00:00Z", now: NOW });
    expect(pub.ok).toBe(true);
    expect(sch.ok).toBe(true);
    expect(planTransition({ role: "colunista", target: "draft", input: ready, now: NOW }).ok).toBe(true);
  });

  it("agendar exige data futura", () => {
    expect(validateTransition("editor", "scheduled", null, NOW)).toMatch(/data e a hora/);
    expect(validateTransition("editor", "scheduled", new Date("2026-11-08T11:00:00Z"), NOW)).toMatch(/futuro/);
    const r = planTransition({ role: "editor", target: "scheduled", input: ready, scheduledAt: "2026-11-09T12:00:00Z", now: NOW });
    expect(r).toEqual({ ok: true, patch: { status: "scheduled", scheduled_at: "2026-11-09T12:00:00.000Z" } });
  });

  it("não publica texto incompleto", () => {
    const r = planTransition({ role: "editor", target: "published", input: { ...ready, title: "", section_id: null }, now: NOW });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/título/);
    expect(!r.ok && r.error).toMatch(/editoria/);
  });

  it("capa sem texto alternativo impede a publicação", () => {
    const r = planTransition({ role: "editor", target: "published", input: { ...ready, cover_url: "https://x.supabase.co/a.jpg" }, now: NOW });
    expect(!r.ok && r.error).toMatch(/Texto alternativo/);
  });

  it("voltar para rascunho tira o texto do ar", () => {
    const r = planTransition({ role: "editor", target: "draft", input: ready, now: NOW });
    expect(r).toEqual({ ok: true, patch: { status: "draft", scheduled_at: null, published_at: null } });
  });

  it("visibilidade pública depende da data de publicação", () => {
    expect(isPubliclyVisible({ status: "published", published_at: "2026-11-08T11:00:00Z" }, NOW)).toBe(true);
    expect(isPubliclyVisible({ status: "scheduled", published_at: "2026-11-08T13:00:00Z" }, NOW)).toBe(false);
    expect(isPubliclyVisible({ status: "scheduled", published_at: "2026-11-08T11:59:00Z" }, NOW)).toBe(true);
    expect(isPubliclyVisible({ status: "draft", published_at: null }, NOW)).toBe(false);
    expect(isPubliclyVisible({ status: "archived", published_at: "2026-11-01T00:00:00Z" }, NOW)).toBe(false);
  });
});

describe("segurança do conteúdo", () => {
  it("remove scripts, eventos e iframes estranhos", () => {
    const dirty =
      '<p onclick="alert(1)">Oi<script>alert(1)</script></p><img src="x" onerror="alert(1)"><iframe src="https://evil.com"></iframe><a href="javascript:alert(1)">x</a>';
    const clean = sanitizeArticleHtml(dirty);
    expect(clean).not.toMatch(/script|onclick|onerror|evil\.com|javascript:/);
    expect(clean).toContain("<p>Oi</p>");
  });

  it("mantém vídeos do YouTube e formatação do editor", () => {
    const html =
      '<h2>Título</h2><blockquote><p>Citação</p></blockquote><div data-youtube-video=""><iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"></iframe></div>';
    const clean = sanitizeArticleHtml(html);
    expect(clean).toContain("<h2>Título</h2>");
    expect(clean).toContain("<blockquote>");
    expect(clean).toContain("youtube-nocookie.com/embed/dQw4w9WgXcQ");
  });

  it("links externos abrem em nova aba com rel seguro", () => {
    expect(sanitizeArticleHtml('<a href="https://exemplo.org">x</a>')).toContain('rel="noopener noreferrer nofollow"');
  });

  it("uploads: só imagens de até 5 MB", () => {
    expect(validateImageFile({ type: "image/jpeg", size: 1000 })).toBeNull();
    expect(validateImageFile({ type: "application/pdf", size: 1000 })).toMatch(/Formato/);
    expect(validateImageFile({ type: "image/png", size: 6 * 1024 * 1024 })).toMatch(/5 MB/);
  });
});

describe("formatação em português", () => {
  it("gera endereços sem acentos", () => {
    expect(slugify("Reforma Agrária: o que muda em 2027?")).toBe("reforma-agraria-o-que-muda-em-2027");
  });
  it("datas por extenso", () => {
    expect(formatDate("2026-11-08T15:00:00Z")).toBe("8 de novembro de 2026");
  });
  it("URL da matéria usa ano e mês no fuso do jornal", () => {
    // 1h da manhã de 1º de dezembro em UTC ainda é 30 de novembro em Maceió
    expect(articlePath({ slug: "x", published_at: "2026-12-01T01:00:00Z" })).toBe("/2026/11/x");
  });
  it("tempo de leitura", () => {
    expect(readingTime(`<p>${"palavra ".repeat(600)}</p>`)).toBe(3);
  });
});
