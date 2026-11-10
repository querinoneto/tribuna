"use client";

import { useSyncExternalStore } from "react";
import { IconMoon, IconSun } from "@/components/icons";

function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => obs.disconnect();
}
const isDark = () => document.documentElement.classList.contains("dark");

/** Alternador claro/escuro. O padrão é o claro; a escolha do leitor fica guardada no navegador. */
export function ThemeToggle({ className = "btn-ghost size-11 p-0" }: { className?: string }) {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);

  const toggle = () => {
    const next = !isDark();
    document.documentElement.classList.toggle("dark", next);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next ? "#121110" : "#faf8f5");
    try {
      localStorage.setItem("tema", next ? "escuro" : "claro");
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={className}
      aria-label={dark ? "Ativar modo claro" : "Ativar modo escuro"}
      title={dark ? "Modo claro" : "Modo escuro"}
    >
      {dark ? <IconSun /> : <IconMoon />}
    </button>
  );
}
