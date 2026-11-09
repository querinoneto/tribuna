"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ConfirmButton } from "@/components/admin/confirm";
import { useToast } from "@/components/admin/toast";
import { disconnectAccount, postNow, saveToken, toggleAuto } from "./actions";

type Result = { ok: boolean; message: string };

function useRun() {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<Result>, after?: (r: Result) => void) =>
    start(async () => {
      const r = await fn();
      toast(r.ok ? "success" : "error", r.message);
      after?.(r);
      router.refresh();
    });
  return { pending, run };
}

export function TokenForm({ connected }: { connected: boolean }) {
  const { pending, run } = useRun();
  const [token, setToken] = useState("");
  const [accountId, setAccountId] = useState("");
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveToken(token, accountId), (r) => {
          if (r.ok) {
            setToken("");
            setAccountId("");
          }
        });
      }}
    >
      <label htmlFor="ig-token" className="text-sm font-semibold">
        Token de acesso do Instagram
      </label>
      <input
        id="ig-token"
        type="password"
        autoComplete="off"
        className="input"
        placeholder={connected ? "Colar um token novo (opcional)" : "Cole aqui o token gerado no painel da Meta"}
        value={token}
        onChange={(e) => setToken(e.target.value)}
      />
      <label htmlFor="ig-account" className="mt-1 text-sm font-semibold">
        ID da conta do Instagram <span className="font-normal text-muted">(opcional; só se o site pedir)</span>
      </label>
      <input
        id="ig-account"
        inputMode="numeric"
        autoComplete="off"
        className="input"
        placeholder="Ex.: 17841400000000000"
        value={accountId}
        onChange={(e) => setAccountId(e.target.value)}
      />
      <button type="submit" className="btn-primary mt-1 self-start" disabled={pending || token.trim().length < 20}>
        {pending ? "Conectando…" : connected ? "Trocar token" : "Conectar"}
      </button>
    </form>
  );
}

export function AutoToggle({ enabled, connected }: { enabled: boolean; connected: boolean }) {
  const { pending, run } = useRun();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className={enabled ? "btn-secondary" : "btn-primary"} disabled={!connected || pending} onClick={() => run(() => toggleAuto(!enabled))}>
        {enabled ? "Desligar publicação automática" : "Ligar publicação automática"}
      </button>
      {connected && (
        <ConfirmButton
          className="btn-ghost"
          title="Desconectar o Instagram?"
          description="O site deixará de postar no Instagram até que um novo token seja colado aqui. Nada é apagado no Instagram."
          confirmLabel="Desconectar"
          onConfirm={() => run(disconnectAccount)}
        >
          Desconectar
        </ConfirmButton>
      )}
    </div>
  );
}

export function PostButton({ id, label, disabled }: { id: string; label: string; disabled?: boolean }) {
  const { pending, run } = useRun();
  return (
    <button type="button" className="btn-ghost px-2 text-xs" disabled={disabled || pending} onClick={() => run(() => postNow(id))}>
      {pending ? "Enviando…" : label}
    </button>
  );
}
