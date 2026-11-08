"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { IconClose, IconMenu, IconSearch } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { SITE_TAGLINE } from "@/lib/env";
import { Wordmark } from "./wordmark";

type S = { name: string; slug: string };

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
        <div className="wrap flex h-[34px] items-center justify-between gap-4">
          <span className="truncate">{date}</span>
          <nav aria-label="Atalhos" className="hidden items-center gap-5 sm:flex">
            <a href="#newsletter" className="hover:text-band-accent">Newsletter</a>
            <Link href="/colunistas" className="hover:text-band-accent">Colunistas</Link>
            <Link href="/sobre" className="hover:text-band-accent">Sobre</Link>
          </nav>
          <ThemeToggle className="-mr-2 inline-flex size-9 items-center justify-center hover:text-band-accent" />
        </div>
      </div>

      {/* Cabeçalho grande (home) */}
      {isHome && (
        <header ref={masthead} className="wrap pt-5 sm:pt-7">
          <div className="flex items-center justify-between gap-6 pb-4 sm:items-end sm:pb-[18px]">
            <button type="button" className="-ml-2 inline-flex size-11 items-center justify-center lg:hidden" aria-label="Abrir menu" onClick={() => setMenu(true)}>
              <IconMenu />
            </button>
            <p className="hidden flex-1 text-xs leading-normal text-muted lg:block">
              {SITE_TAGLINE.split(", ")[0]},<br />
              {SITE_TAGLINE.split(", ")[1]}
            </p>
            <Link href="/" aria-label="Tribuna Socialista, página inicial">
              <h1 className="m-0">
                <Wordmark className="text-[34px] sm:text-[64px] lg:text-[96px]" />
              </h1>
            </Link>
            <div className="hidden flex-1 justify-end lg:flex">
              <SearchForm className="w-52" />
            </div>
            <Link href="/busca" className="-mr-2 inline-flex size-11 items-center justify-center lg:hidden" aria-label="Buscar">
              <IconSearch size={20} />
            </Link>
          </div>
          <nav aria-label="Editorias" className="border-t-4 border-b border-rule-strong">
            <ul className="-mx-4 flex gap-x-6 overflow-x-auto px-4 text-[12px] font-semibold tracking-[0.1em] whitespace-nowrap uppercase sm:mx-0 sm:flex-wrap sm:justify-center sm:gap-x-9 sm:overflow-visible sm:px-0 sm:text-[13px]">
              {sections.map((s) => (
                <li key={s.slug}>
                  <Link href={`/editoria/${s.slug}`} className={`block py-3.5 hover:text-accent ${s.slug === "opiniao" ? "text-accent" : ""}`}>
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
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

      {/* Menu em tela cheia (celular) */}
      {menu && (
        <div role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-[70] flex flex-col overflow-y-auto bg-paper">
          <div className="wrap flex h-14 items-center justify-between border-b border-rule-strong sm:h-16">
            <Wordmark className="text-[24px]" />
            <button type="button" className="-mr-2 inline-flex size-11 items-center justify-center" aria-label="Fechar menu" onClick={() => setMenu(false)} autoFocus>
              <IconClose />
            </button>
          </div>
          <div className="wrap flex flex-1 flex-col gap-8 py-6">
            <SearchForm onDone={() => setMenu(false)} />
            <nav aria-label="Editorias">
              <ul className="flex flex-col">
                <li>
                  <Link href="/" className="block border-b border-rule py-3 font-display text-3xl" onClick={() => setMenu(false)}>
                    Início
                  </Link>
                </li>
                {sections.map((s) => (
                  <li key={s.slug}>
                    <Link
                      href={`/editoria/${s.slug}`}
                      onClick={() => setMenu(false)}
                      className="block border-b border-rule py-3 font-display text-3xl hover:text-accent"
                    >
                      {s.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label="O jornal" className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
              <Link href="/colunistas" onClick={() => setMenu(false)}>Colunistas</Link>
              <Link href="/sobre" onClick={() => setMenu(false)}>Sobre</Link>
              <Link href="/expediente" onClick={() => setMenu(false)}>Expediente</Link>
              <Link href="/contato" onClick={() => setMenu(false)}>Contato</Link>
            </nav>
            <div className="mt-auto flex items-center gap-3 border-t border-rule pt-4 text-sm">
              <ThemeToggle className="inline-flex size-11 items-center justify-center rounded-full border border-rule" />
              <span className="text-muted">Alternar modo claro/escuro</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
