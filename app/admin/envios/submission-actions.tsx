"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ConfirmButton } from "@/components/admin/confirm";
import { useToast } from "@/components/admin/toast";
import { IconTrash } from "@/components/icons";
import { deleteSubmission, setSubmissionStatus, type EnvioResult } from "./actions";

export function SubmissionActions({ id, status, name }: { id: string; status: string; name: string }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const done = (r: EnvioResult) => {
    toast(r.ok ? "success" : "error", (r.ok ? r.message : r.error) ?? "");
    router.refresh();
  };
  return (
    <div className="flex flex-wrap gap-1">
      {status !== "lido" && (
        <button type="button" className="btn-ghost" disabled={pending} onClick={() => start(async () => done(await setSubmissionStatus(id, "lido")))}>
          Marcar como lido
        </button>
      )}
      {status !== "novo" && (
        <button type="button" className="btn-ghost" disabled={pending} onClick={() => start(async () => done(await setSubmissionStatus(id, "novo")))}>
          Marcar como novo
        </button>
      )}
      {status !== "arquivado" && (
        <button type="button" className="btn-ghost" disabled={pending} onClick={() => start(async () => done(await setSubmissionStatus(id, "arquivado")))}>
          Arquivar
        </button>
      )}
      <ConfirmButton
        className="btn-ghost size-11 p-0 text-accent"
        ariaLabel={`Apagar o envio de ${name}`}
        title="Apagar este envio?"
        description="O registro, o texto e a foto serão apagados definitivamente."
        confirmLabel="Apagar"
        onConfirm={async () => done(await deleteSubmission(id))}
      >
        <IconTrash />
      </ConfirmButton>
    </div>
  );
}
