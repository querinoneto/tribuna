import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { isSelectableAuthor } from "@/lib/authors";

describe("quem pode ser escolhido como autor", () => {
  it("só quem tem conta ativa no painel", () => {
    expect(isSelectableAuthor({ profile_id: "p", is_contributor: false, revoked_at: null })).toBe(true);
    expect(isSelectableAuthor({ profile_id: null, is_contributor: true, revoked_at: null })).toBe(false); // leitor colaborador
    expect(isSelectableAuthor({ profile_id: null, is_contributor: false, revoked_at: null })).toBe(false); // sem conta (ex.: antiga Redação)
    expect(isSelectableAuthor({ profile_id: "p", is_contributor: false, revoked_at: "2026-11-01" })).toBe(false); // perdeu o acesso
  });
});
