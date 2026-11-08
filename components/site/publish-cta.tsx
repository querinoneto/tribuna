import Link from "next/link";

/** Convite "Escreva e publique conosco" (fim das matérias). */
export function PublishCta() {
  return (
    <section aria-labelledby="publique-titulo" className="border-t border-rule bg-paper-2">
      <div className="wrap flex flex-wrap items-center gap-x-14 gap-y-6 py-14">
        <div className="flex-[1_1_420px]">
          <span className="kicker">Colabore</span>
          <h2 id="publique-titulo" className="mt-2.5 mb-2 font-display text-3xl leading-tight sm:text-4xl">
            Escreva e publique conosco
          </h2>
          <p className="font-serif text-lg text-ink-soft">
            Tem uma análise, uma denúncia ou uma reflexão que precisa ser lida? Envie seu texto para a redação da Tribuna.
          </p>
        </div>
        <div className="flex-[0_1_auto]">
          <Link href="/publique" className="btn-primary h-[52px] px-7 text-[15px]">
            Enviar meu texto
          </Link>
        </div>
      </div>
    </section>
  );
}
