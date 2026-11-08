"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { IconClose, IconExternal, IconMenu, IconSidebar } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { ROLE_LABEL } from "@/lib/permissions";
import type { Role } from "@/lib/types";

type NavItem = { href: string; label: string; roles?: Role[] };
const NAV: NavItem[] = [
  { href: "/admin", label: "Painel" },
  { href: "/admin/textos", label: "Textos" },
  { href: "/admin/midia", label: "Mídia" },
  { href: "/admin/envios", label: "Envios de leitores", roles: ["admin", "editor"] },
  { href: "/admin/editorias", label: "Editorias", roles: ["admin", "editor"] },
  { href: "/admin/tags", label: "Tags", roles: ["admin", "editor"] },
  { href: "/admin/colunistas", label: "Colunistas", roles: ["admin", "editor"] },
  { href: "/admin/paginas", label: "Páginas", roles: ["admin", "editor"] },
  { href: "/admin/newsletter", label: "Newsletter", roles: ["admin"] },
  { href: "/admin/usuarios", label: "Usuários", roles: ["admin"] },
];

type Staff = { name: string; email: string; role: Role; avatarUrl: string | null };

const COLLAPSED_KEY = "painel-recolhido";
function subscribeCollapsed(cb: () => void) {
  window.addEventListener(COLLAPSED_KEY, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(COLLAPSED_KEY, cb);
    window.removeEventListener("storage", cb);
  };
}
function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function AdminShell({ staff, children }: { staff: Staff; children: React.ReactNode }) {
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);
  // A gaveta guarda em qual página foi aberta: ao navegar, fecha sozinha.
  const [drawerAt, setDrawerAt] = useState<string | null>(null);
  const drawer = drawerAt === pathname;
  const setDrawer = (open: boolean) => setDrawerAt(open ? pathname : null);

  const toggle = () => {
    try {
      localStorage.setItem(COLLAPSED_KEY, collapsed ? "0" : "1");
    } catch {}
    window.dispatchEvent(new Event(COLLAPSED_KEY));
  };

  const items = NAV.filter((i) => !i.roles || i.roles.includes(staff.role));
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  // O editor de texto ocupa a tela toda: escondemos a barra lateral nele
  const focusMode = /^\/admin\/textos\/[^/]+$/.test(pathname) && pathname !== "/admin/textos/novo";

  const nav = (
    <nav aria-label="Painel" className="flex flex-col gap-0.5">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={isActive(i.href) ? "page" : undefined}
          className={`flex min-h-10 items-center rounded-md px-3 text-sm transition-colors ${
            isActive(i.href) ? "bg-accent/10 font-semibold text-accent" : "text-ink-soft hover:bg-paper-2 hover:text-ink"
          }`}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );

  const footer = (
    <div className="flex flex-col gap-3 border-t border-rule pt-4">
      <div className="flex items-center gap-3 px-1">
        <div
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-paper"
        >
          {staff.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 text-sm">
          <p className="truncate font-semibold">{staff.name}</p>
          <p className="text-xs text-muted">{ROLE_LABEL[staff.role]}</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <a href="/" target="_blank" className="btn-ghost flex-1 justify-start px-2 text-xs" rel="noopener">
          <IconExternal size={14} /> Ver o site
        </a>
        <ThemeToggle />
        <form action="/auth/sair" method="post">
          <button type="submit" className="btn-ghost px-2 text-xs">
            Sair
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-dvh bg-paper-2/40">
      {/* Barra lateral (computador) */}
      {!focusMode && !collapsed && (
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-4 border-r border-rule bg-paper p-3 lg:flex">
          <div className="flex items-center justify-between px-2 pt-1">
            <Link href="/admin" className="font-display text-2xl">
              Tribuna
            </Link>
            <button type="button" onClick={toggle} className="btn-ghost size-9 p-0" aria-label="Recolher barra lateral">
              <IconSidebar />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">{nav}</div>
          {footer}
        </aside>
      )}

      {/* Gaveta (celular) */}
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu do painel">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Fechar menu"
            onClick={() => setDrawer(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col gap-4 bg-paper p-3">
            <div className="flex items-center justify-between px-2 pt-1">
              <span className="font-display text-2xl">Tribuna</span>
              <button type="button" onClick={() => setDrawer(false)} className="btn-ghost size-10 p-0" aria-label="Fechar menu">
                <IconClose />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{nav}</div>
            {footer}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {!focusMode && (
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-rule bg-paper px-2 lg:hidden">
            <button type="button" onClick={() => setDrawer(true)} className="btn-ghost size-11 p-0" aria-label="Abrir menu">
              <IconMenu />
            </button>
            <Link href="/admin" className="font-display text-xl">
              Tribuna
            </Link>
          </header>
        )}
        {!focusMode && collapsed && (
          <button
            type="button"
            onClick={toggle}
            className="btn-ghost fixed top-3 left-3 z-30 hidden size-9 border border-rule bg-paper p-0 lg:inline-flex"
            aria-label="Mostrar barra lateral"
          >
            <IconSidebar />
          </button>
        )}
        <main id="conteudo" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
