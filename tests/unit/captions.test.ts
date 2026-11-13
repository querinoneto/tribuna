import { describe, expect, it } from "vitest";
import { sanitizeArticleHtml } from "@/lib/sanitize";

describe("legendas de imagens no corpo do texto", () => {
  it("mantém a imagem com legenda (figure + figcaption)", () => {
    const html = '<figure><img src="https://x.supabase.co/a.jpg" alt="Ato"><figcaption>Ato em Maceió.</figcaption></figure>';
    const out = sanitizeArticleHtml(html);
    expect(out).toContain('<figure><img src="https://x.supabase.co/a.jpg" alt="Ato"');
    expect(out).toContain("<figcaption>Ato em Maceió.</figcaption></figure>");
  });
  it("a legenda é só texto (sem HTML perigoso)", () => {
    const out = sanitizeArticleHtml('<figure><img src="https://x/a.jpg" alt=""><figcaption>Oi<script>alert(1)</script><img src=x onerror=alert(1)></figcaption></figure>');
    expect(out).not.toContain("<script");
    expect(out).not.toContain("onerror");
  });
});
