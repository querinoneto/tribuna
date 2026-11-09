"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type S = { name: string; slug: string };

const Arrow = ({ dir }: { dir: "left" | "right" }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={dir === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
  </svg>
);

/**
 * Menu da capa: as editorias (em preto) e, separadas por um filete, a área
 * de Opinião e as colunas com nome próprio (em vermelho). No celular, a lista
 * rola para o lado e ganha setas ‹ › nas pontas; no computador, fica
 * centralizada numa linha só (com setas, se um dia não couber).
 */
export function SectionScroller({ sections, columns = [] }: { sections: S[]; columns?: S[] }) {
  const editorias = sections.filter((s) => s.slug !== "opiniao");
  const opiniao = sections.find((s) => s.slug === "opiniao");
  const opinionItems = [
    ...(opiniao ? [{ name: opiniao.name, href: `/editoria/${opiniao.slug}` }] : []),
    ...columns.map((c) => ({ name: c.name, href: `/colunas/${c.slug}` })),
  ];
  const list = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const update = useCallback(() => {
    const el = list.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
  }, []);

  useEffect(() => {
    const el = list.current;
    if (!el) return;
    const raf = requestAnimationFrame(update);
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  const move = (dir: 1 | -1) => {
    const el = list.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: reduce ? "auto" : "smooth" });
  };

  // Setas só aparecem quando a lista não cabe (no celular, quase sempre; no computador, se houver muitas colunas)
  const arrow = "absolute top-0 bottom-0 z-10 flex w-10 items-center bg-paper text-ink transition-opacity duration-150";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => move(-1)}
        aria-label="Ver editorias anteriores"
        tabIndex={edges.start ? -1 : 0}
        className={`${arrow} left-0 justify-start ${edges.start ? "pointer-events-none opacity-0" : "opacity-100"}`}
      >
        <Arrow dir="left" />
      </button>
      <ul
        ref={list}
        className="flex gap-x-6 overflow-x-auto px-10 text-[12px] font-semibold tracking-[0.08em] whitespace-nowrap uppercase [scrollbar-width:none] sm:gap-x-6 sm:px-0 sm:text-[13px] xl:gap-x-7 [&::-webkit-scrollbar]:hidden [&>li:first-child]:ml-auto [&>li:last-child]:mr-auto"
      >
        {editorias.map((s) => (
          <li key={s.slug}>
            <Link href={`/editoria/${s.slug}`} className="block py-3.5 hover:text-accent">
              {s.name}
            </Link>
          </li>
        ))}
        {opinionItems.length > 0 && (
          <>
            <li aria-hidden className="flex items-center">
              <span className="h-4 w-px bg-rule-strong" />
            </li>
            {opinionItems.map((o) => (
              <li key={o.href}>
                <Link href={o.href} className="block py-3.5 text-accent hover:underline">
                  {o.name}
                </Link>
              </li>
            ))}
          </>
        )}
      </ul>
      <button
        type="button"
        onClick={() => move(1)}
        aria-label="Ver mais editorias"
        tabIndex={edges.end ? -1 : 0}
        className={`${arrow} right-0 justify-end ${edges.end ? "pointer-events-none opacity-0" : "opacity-100"}`}
      >
        <Arrow dir="right" />
      </button>
    </div>
  );
}
