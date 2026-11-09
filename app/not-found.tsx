import Link from "next/link";
import { Wordmark } from "@/components/site/wordmark";

export const metadata = { title: "Página não encontrada", robots: { index: false } };

export default function NotFound() {
  return (
    <main id="conteudo" className="flex min-h-dvh flex-col">
      <div className="bg-band py-2 text-center text-xs text-band-ink">Erro 404</div>
      <div className="wrap flex flex-1 flex-col items-center justify-center py-16 text-center">
        <Link href="/" aria-label="Tribuna Socialista, página inicial">
          <Wordmark className="text-4xl sm:text-5xl" />
        </Link>
        <div className="my-10 h-1 w-24 bg-ink" aria-hidden />
        <p className="font-display text-[120px] leading-none text-accent sm:text-[160px]" aria-hidden>
          404
        </p>
        <h1 className="mt-4 font-sans text-3xl font-bold tracking-tight sm:text-4xl">Esta página saiu de circulação</h1>
        <p className="mt-3 max-w-md font-sans text-lg text-ink-soft">
          O endereço pode ter mudado ou o texto foi retirado do ar. Tente a busca ou volte à capa.
        </p>
        <form role="search" action="/busca" className="mt-8 flex w-full max-w-md border-b-2 border-rule-strong">
          <label htmlFor="q404" className="sr-only">
            Buscar no site
          </label>
          <input id="q404" name="q" type="search" placeholder="Buscar no jornal" className="h-12 flex-1 bg-transparent text-lg outline-offset-4" />
          <button type="submit" className="px-4 font-semibold">
            Buscar
          </button>
        </form>
        <Link href="/" className="btn-primary mt-8 h-12 px-6 text-base">
          Voltar à capa
        </Link>
      </div>
    </main>
  );
}
