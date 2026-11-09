"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { IconClose, IconMenu, IconSearch } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { SITE_TAGLINE_LINES } from "@/lib/env";
import { SectionScroller } from "./section-scroller";
import { Wordmark } from "./wordmark";

type S = { name: string; slug: string };

/** Itens do menu lateral (botão de três listras). */
const MENU = [
  { href: "/", label: "Início" },
  { href: "/sobre", label: "Sobre" },
  { href: "/colunistas", label: "Colunistas" },
  { href: "/contato", label: "Contato" },
];

function SearchForm({ className = "", autoFocus = false, onDone }: { className?: string; autoFocus?: boolean; onDone?: () => void }) {
  const router = useRouter();
  return (
    <form
      role="search"
      action="/busca"
      className={`flex items-center border-b border-rule-strong ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
        if (q) {
          router.push(`/busca?q=${encodeURIComponent(q)}`);
          onDone?.();
        }
      }}
    >
      <label className="flex-1">
        <span className="sr-only">Buscar no site</span>
        <input name="q" type="search" placeholder="Buscar" autoFocus={autoFocus} className="h-10 w-full min-w-0 bg-transparent text-[15px] outline-offset-2" />
      </label>
      <button type="submit" aria-label="Buscar" className="inline-flex size-10 items-center justify-center">
        <IconSearch />
      </button>
    </form>
  );
}

export function HeaderShell({ sections, date, variant }: { sections: S[]; date: string; variant: "home" | "compact" }) {
  const isHome = variant === "home";
  const masthead = useRef<HTMLDivElement>(null);
  const [pastMasthead, setPastMasthead] = useState(false);
  const [menu, setMenu] = useState(false);

  // Na home, a barra compacta aparece depois que o cabeçalho grande sai da tela
  useEffect(() => {
    if (!isHome || !masthead.current) return;
    const obs = new IntersectionObserver(([e]) => setPastMasthead(!e.isIntersecting), { rootMargin: "-40px 0px 0px 0px" });
    obs.observe(masthead.current);
    return () => obs.disconnect();
  }, [isHome]);

  useEffect(() => {
    document.body.style.overflow = menu ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const showCompact = !isHome || pastMasthead;

  return (
    <>
      <a href="#conteudo" className="sr-only-focusable fixed top-2 left-2 z-[60] bg-ink px-4 py-2 text-paper">
        Pular para o conteúdo
      </a>

      {/* Tarja superior */}
      <div className="bg-band text-[12px] text-band-ink">
        <div className="wrap relative flex h-[34px] items-center justify-center">
          <span className="truncate px-10">{date}</span>
          <ThemeToggle className="absolute right-2 inline-flex size-9 items-center justify-center hover:text-band-accent sm:right-4 lg:right-6" />
        </div>
      </div>

      {/* Cabeçalho grande (home) */}
      {isHome && (
        <header ref={masthead} className="wrap pt-5 sm:pt-7">
          <div className="flex items-center justify-between gap-2 pb-4 sm:items-end sm:gap-6 sm:pb-[18px]">
            <div className="flex items-center gap-3 lg:flex-1">
              <button type="button" className="-ml-2 inline-flex size-11 shrink-0 items-center justify-center" aria-label="Abrir menu" onClick={() => setMenu(true)}>
                <IconMenu />
              </button>
              <p className="hidden text-xs leading-normal whitespace-nowrap text-muted xl:block">
                {SITE_TAGLINE_LINES[0]}
                <br />
                {SITE_TAGLINE_LINES[1]}
              </p>
            </div>
            <Link href="/" aria-label="Tribuna Socialista, página inicial">
              <h1 className="m-0">
                <Wordmark className="text-[30px] sm:text-[60px] lg:text-[80px] xl:text-[88px]" />
              </h1>
            </Link>
            <div className="flex justify-end lg:flex-1">
              <div className="hidden lg:block">
                <SearchForm className="w-44" />
              </div>
              <Link href="/busca" className="-mr-2 inline-flex size-11 items-center justify-center lg:hidden" aria-label="Buscar">
                <IconSearch size={20} />
              </Link>
            </div>
          </div>
          <nav aria-label="Editorias" className="border-t-4 border-b border-rule-strong">
            <SectionScroller sections={sections} />
          </nav>
        </header>
      )}

      {/* Barra compacta e fixa */}
      <div
        className={`${isHome ? "fixed inset-x-0" : "sticky"} top-0 z-40 border-b border-rule-strong bg-paper/95 backdrop-blur transition-transform duration-200 ${
          showCompact ? "translate-y-0" : "-translate-y-full"
        }`}
        aria-hidden={isHome && !pastMasthead ? true : undefined}
        inert={isHome && !pastMasthead ? true : undefined}
      >
        <div className="wrap flex h-14 items-center gap-3 sm:h-16">
          <button type="button" className="-ml-2 inline-flex size-11 items-center justify-center" aria-label="Abrir menu" onClick={() => setMenu(true)}>
            <IconMenu />
          </button>
          <nav aria-label="Editorias (atalho)" className="hidden flex-1 xl:block">
            <ul className="flex gap-5 text-[12px] font-semibold tracking-[0.08em] uppercase">
              {sections.slice(0, 4).map((s) => (
                <li key={s.slug}>
                  <Link href={`/editoria/${s.slug}`} className="hover:text-accent">
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <Link href="/" className="flex-1 text-center xl:flex-none" aria-label="Tribuna Socialista, página inicial">
            <Wordmark className="text-[24px] sm:text-[30px]" />
          </Link>
          <div className="hidden flex-1 justify-end xl:flex">
            <SearchForm className="w-48" />
          </div>
          <Link href="/busca" className="-mr-2 inline-flex size-11 items-center justify-center xl:hidden" aria-label="Buscar">
            <IconSearch size={20} />
          </Link>
        </div>
      </div>

      {/* Menu lateral: tela cheia no celular, painel à esquerda no computador */}
      {menu && (
        <div role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-[70] flex">
          <button type="button" aria-label="Fechar menu" tabIndex={-1} className="absolute inset-0 hidden bg-black/40 sm:block" onClick={() => setMenu(false)} />
          <div className="relative flex h-full w-full flex-col overflow-y-auto bg-paper sm:w-[380px] sm:border-r sm:border-rule-strong">
          <div className="flex h-14 items-center justify-between border-b border-rule-strong px-4 sm:h-16 sm:px-6">
            <Wordmark className="text-[24px]" />
            <button type="button" className="-mr-2 inline-flex size-11 items-center justify-center" aria-label="Fechar menu" onClick={() => setMenu(false)} autoFocus>
              <IconClose />
            </button>
          </div>
          <nav aria-label="Menu principal" className="px-4 py-4 sm:px-6">
            <ul className="flex flex-col">
              {MENU.map((m) => (
                <li key={m.href}>
                  <Link
                    href={m.href}
                    onClick={() => setMenu(false)}
                    className="block border-b border-rule py-4 font-sans text-2xl font-semibold tracking-[-0.01em] hover:text-accent"
                  >
                    {m.label}
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/publique" onClick={() => setMenu(false)} className="btn-primary mt-8 h-12 w-full text-base">
              Escreva e publique conosco
            </Link>
          </nav>
          </div>
        </div>
      )}
    </>
  );
}
