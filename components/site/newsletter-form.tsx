"use client";

import Link from "next/link";
import { useActionState, useId } from "react";
import { subscribe, type NewsletterState } from "@/app/actions/newsletter";

function Form({ dark = false, compact = false }: { dark?: boolean; compact?: boolean }) {
  const [state, action, pending] = useActionState<NewsletterState, FormData>(subscribe, {});
  const id = useId();

  if (state.ok) {
    return (
      <p role="status" className={`font-serif text-lg ${dark ? "text-band-ink" : ""}`}>
        {state.message}
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-2" noValidate>
      <div className={`flex flex-wrap gap-2 ${compact ? "flex-col" : ""}`}>
        <label htmlFor={id} className="sr-only">
          Seu e-mail
        </label>
        <input
          id={id}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="seu@email.com"
          aria-describedby={state.message ? `${id}-msg` : undefined}
          className={`h-[52px] min-w-0 flex-[1_1_220px] border px-4 text-base outline-offset-2 ${
            dark ? "border-band-rule bg-[#262422] text-band-ink placeholder:text-band-muted" : "border-rule-strong bg-paper text-ink"
          }`}
        />
        {/* armadilha para robôs */}
        <input type="text" name="site" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
        <button
          type="submit"
          disabled={pending}
          className={`h-[52px] px-7 text-[15px] font-semibold transition-colors duration-150 disabled:opacity-60 ${
            dark ? "bg-accent text-white hover:bg-accent-strong" : "bg-ink text-paper hover:bg-accent"
          }`}
        >
          {pending ? "Enviando…" : "Quero receber"}
        </button>
      </div>
      {state.message && (
        <p id={`${id}-msg`} role="alert" className={`text-sm ${dark ? "text-band-accent" : "text-accent"}`}>
          {state.message}
        </p>
      )}
      <p className={`text-xs ${dark ? "text-band-muted" : "text-muted"}`}>
        Ao se inscrever, você concorda com a nossa{" "}
        <Link href="/privacidade" className="underline underline-offset-2 hover:text-accent">
          Política de privacidade
        </Link>
        .
      </p>
    </form>
  );
}

/** Bloco grande da home/rodapé. */
export function NewsletterBlock() {
  return (
    <section aria-labelledby="nl-titulo" className="border-t border-rule bg-paper-2">
      <div className="wrap flex flex-wrap items-center gap-x-14 gap-y-8 py-14">
        <div className="flex-[1_1_380px]">
          <span className="kicker">Newsletter</span>
          <h2 id="nl-titulo" className="mt-2.5 mb-2 font-display text-3xl leading-tight sm:text-4xl">
            O essencial da semana, direto no seu <span className="whitespace-nowrap">e-mail</span>.
          </h2>
          <p className="font-serif text-lg text-ink-soft">Sem algoritmo decidindo o que você lê. Cancele quando quiser.</p>
        </div>
        <div className="flex-[1_1_380px]">
          <Form />
        </div>
      </div>
    </section>
  );
}

/** Convite no fim da matéria. */
export function NewsletterInline() {
  return (
    <aside aria-label="Newsletter" className="mt-12 bg-band text-band-ink">
      <div className="wrap flex flex-wrap items-center gap-x-12 gap-y-5 py-10">
        <div className="flex-[1_1_320px]">
          <p className="font-display text-2xl leading-tight text-balance sm:text-3xl">
            Gostou? Receba a Tribuna no seu <span className="whitespace-nowrap">e-mail</span>.
          </p>
          <p className="mt-1.5 text-sm text-band-muted">Uma seleção semanal, sem algoritmo.</p>
        </div>
        <div className="flex-[1_1_380px]">
          <Form dark />
        </div>
      </div>
    </aside>
  );
}
