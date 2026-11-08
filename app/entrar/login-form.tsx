"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { hasSupabase } from "@/lib/env";

export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const callback = (path: string) =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(path)}`;

  async function google() {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback(next) },
    });
    if (error) setError("Não foi possível abrir o login do Google. Tente de novo em instantes.");
  }

  async function magicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setError("Digite um e-mail válido.");
      return;
    }
    setState("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: callback(next) },
    });
    if (error) {
      setState("error");
      setError(
        error.status === 429
          ? "Muitas tentativas seguidas. Aguarde um minuto e tente de novo."
          : "Não conseguimos enviar o link agora. Tente de novo em instantes.",
      );
      return;
    }
    setState("sent");
  }

  if (!hasSupabase) {
    return (
      <div role="alert" className="border-l-4 border-accent bg-accent/10 p-4 text-sm leading-relaxed">
        O Supabase ainda não foi configurado. Preencha <code>NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
        <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> no arquivo <code>.env.local</code> (veja o README).
      </div>
    );
  }

  if (state === "sent") {
    return (
      <div role="status" className="border border-rule bg-paper-2 p-5 text-center">
        <p className="font-display text-2xl">Confira seu e-mail</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Enviamos um link de acesso para <strong>{email}</strong>. Ele vale por uma hora. Se não chegar em
          alguns minutos, olhe a caixa de spam.
        </p>
        <button type="button" className="btn-ghost mt-3" onClick={() => setState("idle")}>
          Usar outro e-mail
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <button type="button" onClick={google} className="btn-secondary h-12 w-full text-base">
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C41.4 35.3 44 30 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        Entrar com Google
      </button>

      <div className="flex items-center gap-3 text-xs tracking-[0.14em] text-muted uppercase">
        <span className="h-px flex-1 bg-rule" />
        ou
        <span className="h-px flex-1 bg-rule" />
      </div>

      <form onSubmit={magicLink} className="flex flex-col gap-3" noValidate>
        <label htmlFor="email" className="field">
          Receber um link de acesso por e-mail
          <input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@exemplo.com"
            className="input h-12"
            aria-describedby={error ? "login-erro" : undefined}
          />
        </label>
        <button type="submit" className="btn-primary h-12 text-base" disabled={state === "sending"}>
          {state === "sending" ? "Enviando…" : "Enviar link"}
        </button>
      </form>

      {error && (
        <p id="login-erro" role="alert" className="text-sm text-accent">
          {error}
        </p>
      )}
    </div>
  );
}
