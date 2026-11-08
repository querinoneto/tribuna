"use client";

import { useEffect, useRef, useState } from "react";
import { IconArrowUp } from "@/components/icons";

/** Barra de progresso de leitura (topo) + botão "voltar ao topo". */
export function ReadingTools() {
  const bar = useRef<HTMLDivElement>(null);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = document.documentElement;
        const max = el.scrollHeight - el.clientHeight;
        const p = max > 0 ? Math.min(1, el.scrollTop / max) : 0;
        if (bar.current) bar.current.style.transform = `scaleX(${p})`;
        setShowTop(el.scrollTop > 900);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div aria-hidden className="fixed inset-x-0 top-0 z-50 h-[3px]">
        <div ref={bar} className="reading-progress h-full bg-accent" style={{ transform: "scaleX(0)" }} />
      </div>
      <button
        type="button"
        aria-label="Voltar ao topo"
        onClick={() => {
          const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
          document.getElementById("conteudo")?.focus({ preventScroll: true });
        }}
        className={`fixed right-4 bottom-4 z-40 inline-flex size-12 items-center justify-center rounded-full bg-accent text-accent-ink transition-all duration-200 hover:bg-accent-strong sm:right-8 sm:bottom-8 ${
          showTop ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
        }`}
      >
        <IconArrowUp />
      </button>
    </>
  );
}

/** Conta uma leitura (uma vez por sessão do navegador, por matéria). */
export function ViewCounter({ id }: { id: string }) {
  useEffect(() => {
    const key = `lida:${id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {}
    const body = JSON.stringify({ id });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/leitura", new Blob([body], { type: "application/json" }));
    else fetch("/api/leitura", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
  }, [id]);
  return null;
}
