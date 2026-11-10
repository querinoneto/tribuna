/** Esqueleto do editor enquanto o texto é carregado. */
export default function EditorLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10" role="status" aria-live="polite">
      <span className="sr-only">Abrindo o editor…</span>
      <div aria-hidden className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <div className="skeleton h-9 w-28 rounded-md" />
          <div className="skeleton h-10 w-40 rounded-md" />
        </div>
        <div className="skeleton h-12 w-4/5 rounded" />
        <div className="skeleton h-6 w-3/5 rounded" />
        <div className="mt-4 flex flex-col gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={`skeleton h-4 rounded ${i % 3 === 2 ? "w-2/3" : "w-full"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
