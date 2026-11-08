"use client";

import { useRouter } from "next/navigation";
import type { FormState } from "@/app/admin/crud-actions";
import { ConfirmButton } from "./confirm";
import { useToast } from "./toast";
import { IconTrash } from "@/components/icons";

/** Botão "Excluir" com confirmação, para listas do painel. */
export function DeleteButton({
  action,
  title,
  description,
  label,
}: {
  action: () => Promise<FormState>;
  title: string;
  description?: string;
  label: string;
}) {
  const toast = useToast();
  const router = useRouter();
  return (
    <ConfirmButton
      className="btn-ghost size-11 p-0 text-accent"
      ariaLabel={label}
      title={title}
      description={description}
      confirmLabel="Excluir"
      onConfirm={async () => {
        const r = await action();
        if (r.ok) {
          toast("success", r.message ?? "Excluído.");
          router.refresh();
        } else toast("error", r.error ?? "Não foi possível excluir.");
      }}
    >
      <IconTrash />
    </ConfirmButton>
  );
}
