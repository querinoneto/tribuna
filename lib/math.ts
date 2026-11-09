import katex from "katex";

/**
 * Transforma as fórmulas salvas pelo editor (<span data-type="inline-math"
 * data-latex="…"> e <div data-type="block-math" …>) em fórmulas prontas,
 * desenhadas pelo KaTeX no servidor. Deve rodar DEPOIS da limpeza do HTML:
 * o KaTeX gera a marcação a partir do código LaTeX, sem aceitar HTML.
 */
const MATH_NODE = /<(span|div)\b([^>]*\bdata-type="(inline|block)-math"[^>]*)>\s*<\/\1>/g;

const decode = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&amp;/g, "&");

export function renderMath(html: string): string {
  if (!html.includes("-math")) return html;
  return html.replace(MATH_NODE, (whole, _tag: string, attrs: string, kind: "inline" | "block") => {
    const latex = decode(/\bdata-latex="([^"]*)"/.exec(attrs)?.[1] ?? "").trim();
    if (!latex) return "";
    const display = kind === "block";
    const out = katex.renderToString(latex, { displayMode: display, throwOnError: false, strict: "ignore", trust: false, output: "htmlAndMathml" });
    return display ? `<div class="math-block">${out}</div>` : `<span class="math-inline">${out}</span>`;
  });
}
