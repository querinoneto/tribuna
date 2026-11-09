import { describe, expect, it } from "vitest";
import { applyRoleRules, type Current } from "@/lib/article-rules";
import type { ArticleInput } from "@/lib/validation";

const base = (over: Partial<ArticleInput> = {}): ArticleInput => ({
  title: "Um título novo",
  subtitle: "",
  slug: "slug-forjado",
  content_json: null,
  content_html: "<p>texto</p>",
  cover_url: null,
  cover_alt: "",
  cover_credit: "",
  section_id: "11111111-1111-4111-8111-111111111111",
  column_id: null,
  author_id: "22222222-2222-4222-8222-222222222222",
  featured: true,
  pinned: true,
  ...over,
});
const draft: Current = { slug: "rascunho-abc", status: "draft", author_id: "33333333-3333-4333-8333-333333333333", published_at: null };
const live: Current = { slug: "slug-original", status: "published", author_id: draft.author_id, published_at: "2026-11-01T10:00:00Z" };

describe("regras por papel no salvamento", () => {
  it("colunista: não muda manchete, fixação, autor nem URL de texto no ar", () => {
    const cols = applyRoleRules("colunista", base(), live);
    expect(cols).not.toHaveProperty("featured");
    expect(cols).not.toHaveProperty("pinned");
    expect(cols.author_id).toBe(live.author_id);
    expect(cols.slug).toBe("slug-original");
  });

  it("colunista: o endereço do rascunho nasce do título, não do que o navegador enviou", () => {
    expect(applyRoleRules("colunista", base(), draft).slug).toBe("um-titulo-novo");
  });

  it("coordenação troca o autor, mas não a URL nem os destaques", () => {
    const cols = applyRoleRules("editor", base(), live);
    expect(cols.author_id).toBe("22222222-2222-4222-8222-222222222222");
    expect(cols.slug).toBe("slug-original");
    expect(cols).not.toHaveProperty("featured");
  });

  it("administrador muda tudo", () => {
    const cols = applyRoleRules("admin", base(), live);
    expect(cols.slug).toBe("slug-forjado");
    expect(cols.featured).toBe(true);
    expect(cols.pinned).toBe(true);
    expect(cols.author_id).toBe("22222222-2222-4222-8222-222222222222");
  });

  it("texto de coluna não tem editoria, para qualquer papel", () => {
    for (const role of ["admin", "editor", "colunista"] as const) {
      expect(applyRoleRules(role, base({ column_id: "44444444-4444-4444-8444-444444444444" }), draft).section_id).toBeNull();
    }
  });

  it("não envia legenda nem resumo quando o painel não manda", () => {
    const cols = applyRoleRules("colunista", base(), draft);
    expect(cols).not.toHaveProperty("excerpt");
    expect(cols).not.toHaveProperty("cover_caption");
  });
});
