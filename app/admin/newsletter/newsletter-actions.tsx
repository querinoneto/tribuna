"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ConfirmButton } from "@/components/admin/confirm";
import { useToast } from "@/components/admin/toast";
import { sendDigestNow, sendTestToMe, syncNow } from "./actions";

export function NewsletterActions({ ready }: { ready: boolean }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    start(async () => {
      const r = await fn();
      toast(r.ok ? "success" : "error", r.message);
      router.refresh();
    });

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className="btn-secondary" disabled={!ready || pending} onClick={() => run(sendTestToMe)}>
        Enviar prévia para mim
      </button>
      <button type="button" className="btn-ghost" disabled={!ready || pending} onClick={() => run(syncNow)}>
        Sincronizar
      </button>
      <ConfirmButton
        className="btn-primary"
        title="Enviar o resumo agora?"
        description="Todos os assinantes ativos receberão agora o resumo com os textos dos últimos 7 dias. O envio automático da semana continua programado."
        confirmLabel="Enviar"
        onConfirm={() => run(sendDigestNow)}
      >
        Enviar resumo agora
      </ConfirmButton>
    </div>
  );
}
