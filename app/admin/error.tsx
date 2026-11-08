"use client";

export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center" role="alert">
      <h1 className="font-display text-4xl">Algo deu errado</h1>
      <p className="mt-3 text-ink-soft">
        Não foi possível carregar esta tela. Seu trabalho salvo não foi perdido. Verifique a conexão e tente de novo.
      </p>
      <button type="button" className="btn-primary mt-6" onClick={reset}>
        Tentar de novo
      </button>
    </div>
  );
}
