/** Esqueletos de carregamento: mesma estrutura da página, sem "pulos". */
export function ArticleSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando matéria">
      <div className="mx-auto flex max-w-[860px] flex-col items-center gap-5 px-4 pt-10 pb-8 sm:pt-16">
        <div className="skeleton h-3 w-28" />
        <div className="skeleton h-12 w-full max-w-[720px]" />
        <div className="skeleton h-12 w-4/5 max-w-[600px]" />
        <div className="skeleton h-5 w-3/4 max-w-[560px]" />
        <div className="mt-2 flex items-center gap-3">
          <div className="skeleton size-12 rounded-full" />
          <div className="skeleton h-4 w-40" />
        </div>
      </div>
      <div className="wrap">
        <div className="skeleton aspect-[4/3] w-full sm:aspect-[21/9]" />
      </div>
      <div className="mx-auto mt-10 flex max-w-[680px] flex-col gap-3 px-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton h-4" style={{ width: `${90 - (i % 3) * 12}%` }} />
        ))}
      </div>
    </div>
  );
}

export function ListSkeleton({ title = true }: { title?: boolean }) {
  return (
    <div className="wrap py-10" aria-busy="true" aria-label="Carregando">
      {title && <div className="skeleton mb-8 h-12 w-64" />}
      <div className="grid gap-x-7 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <div className="skeleton aspect-video w-full" />
            <div className="skeleton h-3 w-20" />
            <div className="skeleton h-6 w-full" />
            <div className="skeleton h-6 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
