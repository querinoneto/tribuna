import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ hasAdminClient: false, createAdminClient: () => null }));

const { clip, cardSizes } = await import("@/lib/instagram/card");
const { buildCaption, cardUrl, isInstagramLoginToken } = await import("@/lib/instagram/service");

describe("card do Instagram", () => {
  it("corta textos longos na palavra, com reticências", () => {
    expect(clip("curto", 20)).toBe("curto");
    const r = clip("A greve dos trabalhadores dos Correios chega ao décimo dia", 30);
    expect(r.endsWith("…")).toBe(true);
    expect(r.length).toBeLessThanOrEqual(31);
    expect(r).not.toMatch(/\s…$/);
  });

  it("reduz a fonte conforme o título cresce", () => {
    expect(cardSizes("Título curto", "").titleSize).toBe(64);
    expect(cardSizes("x".repeat(100), "").titleSize).toBeLessThan(64);
    expect(cardSizes("x".repeat(130), "").titleSize).toBe(46);
  });
});

describe("legenda", () => {
  it("segue o formato: título: linha fina, primeiro parágrafo entre aspas e chamada", () => {
    const c = buildCaption(
      {
        title: "Greve dos metroviários",
        subtitle: "Categoria cobra reajuste.",
        content_html: '<h2>Intertítulo</h2><p> </p><p>A paralisação <strong>afeta</strong> as quatro&nbsp;linhas.</p><p>Segundo parágrafo.</p>',
      },
      "tribunasocialista.com.br",
    );
    expect(c).toBe('Greve dos metroviários: Categoria cobra reajuste.\n\n"A paralisação afeta as quatro linhas."\n\nLeia na íntegra em tribunasocialista.com.br');
  });

  it("sem linha fina nem parágrafo, fica só o título e a chamada", () => {
    expect(buildCaption({ title: "T", subtitle: null, content_html: "" }, "x.br")).toBe("T\n\nLeia na íntegra em x.br");
  });

  it("encurta parágrafos longos para caber no limite do Instagram", () => {
    const c = buildCaption({ title: "T", subtitle: "S", content_html: `<p>${"palavra ".repeat(600)}</p>` }, "x.br");
    expect(c.length).toBeLessThanOrEqual(2200);
    expect(c).toMatch(/…"\n\nLeia na íntegra em x\.br$/);
  });

  it("aponta o card para o endereço público do texto", () => {
    expect(cardUrl({ id: "abc", updated_at: "2026-11-09T10:00:00Z" })).toMatch(/\/instagram\/card\/abc\?v=/);
  });
});

describe("tipo de token", () => {
  it("separa o login do Instagram (IG…) do login unificado/Facebook (EAA…)", () => {
    expect(isInstagramLoginToken("IGQWRk123")).toBe(true);
    expect(isInstagramLoginToken("EAAGm0PX4ZCps")).toBe(false);
  });
});
