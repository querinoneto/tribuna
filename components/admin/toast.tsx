"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { IconCheck, IconClose } from "@/components/icons";

type Toast = { id: number; tone: "success" | "error"; text: string };
const Ctx = createContext<(tone: Toast["tone"], text: string) => void>(() => {});

/** Mensagens rápidas de sucesso e erro, anunciadas a leitores de tela. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((tone: Toast["tone"], text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 8000 : 4000);
  }, []);

  return (
    <Ctx.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:right-4 sm:left-auto sm:items-end"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className={`pointer-events-auto flex max-w-md items-start gap-3 rounded-md px-4 py-3 text-sm shadow-lg ${
              t.tone === "error" ? "bg-accent text-accent-ink" : "bg-ink text-paper"
            }`}
          >
            {t.tone === "success" && <IconCheck className="mt-0.5 shrink-0" />}
            <span className="flex-1 leading-snug">{t.text}</span>
            <button
              type="button"
              aria-label="Fechar aviso"
              className="-m-1 p-1 opacity-80 hover:opacity-100"
              onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))}
            >
              <IconClose size={16} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  return useContext(Ctx);
}
