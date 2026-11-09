import { describe, expect, it } from "vitest";
import { buildConfirmation, buildDigest, esc, RESEND_UNSUBSCRIBE, weekKey, type DigestArticle } from "@/lib/newsletter/digest";

const art = (over: Partial<DigestArticle> = {}): DigestArticle => ({
  title: "Entregadores param as capitais",
  subtitle: "Paralisação começou no Nordeste.",
  slug: "entregadores-param",
  published_at: "2026-11-06T13:00:00Z",
  cover_url: "https://exemplo.test/capa.jpg",
  cover_alt: "Entregadores em protesto",
  reading_minutes: 4,
  section: { name: "Trabalho" },
  author: { name: "Redação" },
  ...over,
});

describe("resumo semanal por e-mail", () => {
  it("monta assunto, links e link de cancelamento do Resend", () => {
    const m = buildDigest([art(), art({ title: "Segundo texto", slug: "segundo", cover_url: null })], {
      now: new Date("2026-11-08T12:00:00Z"),
      unsubscribeUrl: RESEND_UNSUBSCRIBE,
    });
    expect(m.subject).toBe("Resumo da semana: Entregadores param as capitais");
    expect(m.html).toContain("/2026/11/entregadores-param");
    expect(m.html).toContain("/2026/11/segundo");
    expect(m.html).toContain(RESEND_UNSUBSCRIBE);
    expect(m.html).toContain("Política de Privacidade");
    expect(m.text).toContain("Cancelar assinatura: " + RESEND_UNSUBSCRIBE);
    expect(m.range).toBe("2 de novembro a 8 de novembro de 2026");
  });

  it("escapa HTML vindo dos títulos", () => {
    const m = buildDigest([art({ title: '<script>alert("x")</script>' })], { now: new Date("2026-11-08T12:00:00Z"), unsubscribeUrl: "#" });
    expect(m.html).not.toContain("<script>");
    expect(esc('"<a>&')).toBe("&quot;&lt;a&gt;&amp;");
  });

  it("e-mail de confirmação traz o link e explica como ignorar", () => {
    const c = buildConfirmation("https://site.test/assinatura/confirmar?token=abc");
    expect(c.html).toContain("https://site.test/assinatura/confirmar?token=abc");
    expect(c.text).toContain("ignore esta mensagem");
  });

  it("semana ISO no fuso do jornal", () => {
    expect(weekKey(new Date("2026-11-06T11:00:00Z"))).toBe("2026-W45");
    expect(weekKey(new Date("2026-11-09T12:00:00Z"))).toBe("2026-W46");
    // 23h de domingo em Maceió ainda é a mesma semana (já é segunda em UTC)
    expect(weekKey(new Date("2026-11-09T02:00:00Z"))).toBe("2026-W45");
    expect(weekKey(new Date("2027-01-01T12:00:00Z"))).toBe("2026-W53");
  });
});
