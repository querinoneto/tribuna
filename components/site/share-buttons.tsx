"use client";

import { useState } from "react";
import { IconCheck, IconLink, IconMail, IconWhatsApp, IconX } from "@/components/icons";

export function ShareButtons({ url, title, vertical = false }: { url: string; title: string; vertical?: boolean }) {
  const [copied, setCopied] = useState(false);
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const cls =
    "inline-flex size-11 items-center justify-center rounded-full border border-rule-strong text-ink transition-colors duration-150 hover:bg-ink hover:text-paper";

  return (
    <div className={`flex gap-2 ${vertical ? "flex-col" : "flex-row"}`}>
      <a className={cls} href={`https://wa.me/?text=${t}%20${u}`} target="_blank" rel="noopener noreferrer" aria-label="Compartilhar no WhatsApp">
        <IconWhatsApp />
      </a>
      <a className={cls} href={`https://x.com/intent/post?text=${t}&url=${u}`} target="_blank" rel="noopener noreferrer" aria-label="Compartilhar no X">
        <IconX />
      </a>
      <a className={cls} href={`mailto:?subject=${t}&body=${t}%0A%0A${u}`} aria-label="Enviar por e-mail">
        <IconMail />
      </a>
      <button
        type="button"
        className={cls}
        aria-label={copied ? "Link copiado" : "Copiar link"}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {}
        }}
      >
        {copied ? <IconCheck /> : <IconLink />}
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? "Link copiado" : ""}
      </span>
    </div>
  );
}
