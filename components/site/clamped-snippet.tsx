"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";

/**
 * Trecho do texto limitado a N linhas, terminando com "… Ler mais" na
 * última linha. Ajusta-se à largura da tela (recalcula ao redimensionar).
 */
export function ClampedSnippet({ text, href, lines = 5, label }: { text: string; href: string; lines?: number; label: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [shown, setShown] = useState<string | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 24;
      const max = lineHeight * lines + 2;
      const span = el.querySelector<HTMLSpanElement>("[data-texto]");
      if (!span) return;
      // Cabe inteiro?
      span.textContent = text;
      if (el.scrollHeight <= max) return setShown(text);
      // Busca binária pelo maior trecho (em palavras) que cabe com "… Ler mais"
      const words = text.split(" ");
      let lo = 1;
      let hi = words.length;
      while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        span.textContent = `${words.slice(0, mid).join(" ")}…`;
        if (el.scrollHeight <= max) lo = mid;
        else hi = mid - 1;
      }
      const result = `${words.slice(0, lo).join(" ").replace(/[\s,;:.–-]+$/, "")}…`;
      span.textContent = result;
      setShown(result);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, lines]);

  return (
    <p ref={ref} className="text-justify hyphens-auto font-sans text-[15px] leading-relaxed text-ink-soft" style={shown === null ? { WebkitLineClamp: lines, display: "-webkit-box", WebkitBoxOrient: "vertical", overflow: "hidden" } : undefined}>
      <span data-texto>{shown ?? text}</span>{" "}
      <Link href={href} aria-label={label} className="font-semibold whitespace-nowrap text-accent hover:underline">
        Ler mais
      </Link>
    </p>
  );
}
