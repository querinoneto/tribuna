import { describe, expect, it } from "vitest";
import { renderFootnotes } from "@/lib/footnotes";
import { sanitizeArticleHtml } from "@/lib/sanitize";

describe("notas de rodapé", () => {
  it("numera as chamadas e monta a lista Notas no fim", () => {
    const html = sanitizeArticleHtml(
      '<p>Primeira<span data-type="footnote" data-note="MARX, Karl. O Capital."></span> e segunda<span data-type="footnote" data-note="Ver https://exemplo.org/a."></span>.</p>',
    );
    const out = renderFootnotes(html);
    expect(out).toContain('<a href="#nota-1" id="chamada-1"');
    expect(out).toContain('<a href="#nota-2" id="chamada-2"');
    expect(out).toContain('<li id="nota-1">MARX, Karl. O Capital.');
    expect(out).toContain('<a href="https://exemplo.org/a" target="_blank"');
    expect(out).toMatch(/<h2 id="notas-titulo">Notas<\/h2>/);
  });
  it("trata o texto da nota como texto puro (sem HTML)", () => {
    const html = sanitizeArticleHtml('<p>x<span data-type="footnote" data-note="&lt;img src=x onerror=alert(1)&gt;"></span></p>');
    const out = renderFootnotes(html);
    expect(out).not.toContain("<img");
    expect(out).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });
  it("não mexe em texto sem notas e ignora nota vazia", () => {
    expect(renderFootnotes("<p>oi</p>")).toBe("<p>oi</p>");
    expect(renderFootnotes('<p>oi<span data-type="footnote" data-note=""></span></p>')).toBe("<p>oi</p>");
  });
});
