import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ hasAdminClient: false, createAdminClient: () => null }));

const { clip, cardSizes } = await import("@/lib/instagram/card");
const { buildCaption, cardUrl } = await import("@/lib/instagram/service");

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
  it("traz título, linha fina, autor, chamada e hashtags sem acento", () => {
    const c = buildCaption({ title: "Título", subtitle: "Linha fina", section: { name: "Meio Ambiente" }, author: { name: "Maria Souza" } });
    expect(c).toContain("Título\n\nLinha fina\n\nPor Maria Souza.");
    expect(c).toContain("link na bio");
    expect(c).toContain("#TribunaSocialista #MeioAmbiente");
  });

  it("assina como Redação quando não há autor e omite linha fina vazia", () => {
    const c = buildCaption({ title: "T", subtitle: null, section: null, author: null });
    expect(c.startsWith("T\n\nPor Redação.")).toBe(true);
    expect(c).not.toContain("#MeioAmbiente");
  });

  it("aponta o card para o endereço público do texto", () => {
    expect(cardUrl({ id: "abc", updated_at: "2026-11-09T10:00:00Z" })).toMatch(/\/instagram\/card\/abc\?v=/);
  });
});
