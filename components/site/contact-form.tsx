"use client";

import Link from "next/link";
import { useActionState, useId } from "react";
import { sendContact, type ContactState } from "@/app/actions/contact";
import { IconCheck } from "@/components/icons";

/** Formulário da página Contato. */
export function ContactForm() {
  const id = useId();
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContact, {});

  if (state.ok) {
    return (
      <div role="status" className="flex flex-col items-start gap-3 border border-rule bg-paper-2 p-6 sm:p-8">
        <span className="inline-flex size-11 items-center justify-center rounded-full bg-ink text-paper">
          <IconCheck size={20} />
        </span>
        <h2 className="font-sans text-2xl font-bold tracking-tight">Mensagem enviada!</h2>
        <p className="font-sans text-lg text-ink-soft">Obrigado por escrever para a Tribuna Socialista. Responderemos pelo e-mail informado.</p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5" aria-describedby={state.error ? `${id}-erro` : undefined}>
      <h2 className="font-sans text-2xl font-bold tracking-tight">Fale com a gente</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="field">
          Nome
          <input name="first_name" required autoComplete="given-name" maxLength={80} className="input" />
        </label>
        <label className="field">
          Sobrenome
          <input name="last_name" required autoComplete="family-name" maxLength={120} className="input" />
        </label>
      </div>
      <label className="field">
        E-mail
        <input name="email" type="email" inputMode="email" required autoComplete="email" maxLength={254} className="input" />
      </label>
      <label className="field">
        Mensagem
        <textarea name="message" rows={6} required minLength={5} maxLength={5000} className="input" />
      </label>

      <input type="text" name="site" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

      <label className="flex items-start gap-3 text-sm leading-snug">
        <input type="checkbox" name="consent" required className="mt-0.5 size-5 shrink-0 accent-[var(--accent)]" />
        <span>
          Li e concordo com a{" "}
          <Link href="/privacidade" className="underline underline-offset-2 hover:text-accent">
            Política de privacidade
          </Link>{" "}
          e autorizo a Tribuna Socialista a usar estes dados para responder à minha mensagem.
        </span>
      </label>

      {state.error && (
        <p id={`${id}-erro`} role="alert" className="border-l-4 border-accent bg-accent/10 p-3 text-sm">
          {state.error}
        </p>
      )}

      <div>
        <button type="submit" className="btn-primary h-12 px-6 text-base" disabled={pending}>
          {pending ? "Enviando…" : "Enviar mensagem"}
        </button>
      </div>
    </form>
  );
}
