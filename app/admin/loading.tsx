/**
 * Mostrado na hora em que se clica num item do painel, enquanto o servidor
 * prepara a página (antes, a tela ficava parada até tudo chegar).
 */
export default function AdminLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10" role="status" aria-live="polite">
      <span className="sr-only">Carregando…</span>
      <div aria-hidden className="flex flex-col gap-6">
        <div className="flex items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="skeleton h-4 w-24 rounded" />
            <div className="skeleton h-9 w-48 rounded" />
          </div>
          <div className="skeleton h-12 w-36 rounded-md" />
        </div>
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-lg" />
          ))}
        </div>
        <div className="flex flex-col divide-y divide-rule rounded-lg border border-rule bg-paper">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-4">
              <div className="skeleton h-5 flex-1 rounded" />
              <div className="skeleton h-5 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
