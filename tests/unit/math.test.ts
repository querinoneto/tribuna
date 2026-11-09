import { describe, expect, it } from "vitest";
import { renderMath } from "@/lib/math";
import { sanitizeArticleHtml } from "@/lib/sanitize";

describe("fórmulas em LaTeX", () => {
  it("desenha fórmulas na linha e em destaque", () => {
    const html = sanitizeArticleHtml(
      '<p>A energia é <span data-latex="E = mc^2" data-type="inline-math"></span>.</p><div data-latex="\\frac{a}{b}" data-type="block-math"></div>',
    );
    const out = renderMath(html);
    expect(out).toContain('class="math-inline"');
    expect(out).toContain('class="math-block"');
    expect(out).toContain("katex");
    expect(out).not.toContain("data-latex");
  });

  it("não deixa passar HTML escondido no código da fórmula", () => {
    const html = sanitizeArticleHtml('<span data-type="inline-math" data-latex="x<img src=x onerror=alert(1)>"></span>');
    const out = renderMath(html);
    expect(out).not.toMatch(/<img/);
    expect(out).toContain("&lt;img");
  });

  it("fórmula com erro não quebra a página", () => {
    const out = renderMath(sanitizeArticleHtml('<span data-type="inline-math" data-latex="\\frac{a"></span>'));
    expect(out).toContain("katex");
  });

  it("textos sem fórmula ficam iguais", () => {
    expect(renderMath("<p>Olá</p>")).toBe("<p>Olá</p>");
  });
});
