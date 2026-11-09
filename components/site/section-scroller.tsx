"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

type S = { name: string; slug: string };

const Arrow = ({ dir }: { dir: "left" | "right" }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={dir === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
  </svg>
);

/**
 * Menu suspenso "Colunas": abre ao passar o mouse (computador) ou ao tocar
 * (celular). A lista de editorias rola para o lado, então o painel é
 * posicionado em relação à tela (position: fixed) para não ser cortado.
 */
function ColumnsMenu({ columns }: { columns: S[] }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  const show = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    const r = btn.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom, left: r.left + r.width / 2 });
    setOpen(true);
  }, []);
  const hideSoon = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }, []);

  // Centraliza o painel sob o botão, sem deixar passar das bordas da tela
  useLayoutEffect(() => {
    const el = panel.current;
    if (!open || !pos || !el) return;
    const w = el.offsetWidth;
    const left = Math.max(8, Math.min(pos.left - w / 2, window.innerWidth - w - 8));
    el.style.left = `${left}px`;
    el.style.visibility = "visible";
  }, [open, pos]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btn.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!btn.current?.contains(t) && !document.getElementById("menu-colunas")?.contains(t)) setOpen(false);
    };
    window.addEventListener("scroll", close, { passive: true });
    window.addEventListener("resize", close);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("scroll", close);
      window.removeEventListener("resize", close);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <li onMouseEnter={show} onMouseLeave={hideSoon}>
      <button
        ref={btn}
        type="button"
        aria-expanded={open}
        aria-controls="menu-colunas"
        onClick={() => (open ? setOpen(false) : show())}
        className="flex items-center gap-1 py-3.5 font-semibold tracking-[inherit] text-accent uppercase hover:underline"
      >
        Colunas
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && pos && (
        <div
          id="menu-colunas"
          onMouseEnter={show}
          onMouseLeave={hideSoon}
          ref={panel}
          style={{ top: pos.top, left: 0, visibility: "hidden" }}
          className="fixed z-50 max-w-[calc(100vw-16px)] pt-1"
        >
          <ul className="min-w-56 border border-rule-strong bg-paper py-1.5 text-left normal-case shadow-lg">
            {columns.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/colunas/${c.slug}`}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-2.5 font-sans text-[15px] font-semibold tracking-normal text-ink hover:bg-paper-2 hover:text-accent"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

/**
 * Menu da capa: as editorias (em preto) e, separadas por um filete, a área
 * de Opinião e o menu suspenso "Colunas" (em vermelho). No celular, a lista
 * rola para o lado e ganha setas ‹ › nas pontas; no computador, fica
 * centralizada numa linha só (com setas, se um dia não couber).
 */
export function SectionScroller({ sections, columns = [] }: { sections: S[]; columns?: S[] }) {
  const editorias = sections.filter((s) => s.slug !== "opiniao");
  const opiniao = sections.find((s) => s.slug === "opiniao");
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
        {(opiniao || columns.length > 0) && (
          <>
            <li aria-hidden className="flex items-center">
              <span className="h-4 w-px bg-rule-strong" />
            </li>
            {opiniao && (
              <li>
                <Link href={`/editoria/${opiniao.slug}`} className="block py-3.5 text-accent hover:underline">
                  {opiniao.name}
                </Link>
              </li>
            )}
            {columns.length > 0 && <ColumnsMenu columns={columns} />}
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
