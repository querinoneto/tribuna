"use client";

import Link from "next/link";

export default function SiteError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="wrap flex flex-col items-center py-24 text-center" role="alert">
      <p className="kicker">Algo deu errado</p>
      <h1 className="mt-3 font-display text-5xl">Não conseguimos carregar esta página</h1>
      <p className="mt-3 max-w-md font-sans text-lg text-ink-soft">Pode ser uma instabilidade momentânea. Tente de novo em alguns segundos.</p>
      <div className="mt-8 flex gap-3">
        <button type="button" className="btn-primary h-12 px-6" onClick={reset}>
          Tentar de novo
        </button>
        <Link href="/" className="btn-secondary h-12 px-6">
          Ir para a capa
        </Link>
      </div>
    </div>
  );
}
