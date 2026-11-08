"use client";

import { useActionState, useEffect, useRef } from "react";
import type { FormState } from "@/app/admin/crud-actions";
import { useToast } from "./toast";

/**
 * Formulário ligado a uma Server Action com mensagens de sucesso e erro em
 * português. Limpa os campos após criar (resetOnSuccess).
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  onSuccess,
}: {
  action: (state: FormState, fd: FormData) => Promise<FormState>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  onSuccess?: () => void;
}) {
  const [state, formAction] = useActionState(action, {});
  const toast = useToast();
  const ref = useRef<HTMLFormElement>(null);
  const lastKey = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!state.key || state.key === lastKey.current) return;
    lastKey.current = state.key;
    if (state.ok) {
      toast("success", state.message ?? "Salvo.");
      if (resetOnSuccess) ref.current?.reset();
      onSuccess?.();
    } else if (state.error) {
      toast("error", state.error);
    }
  }, [state, toast, resetOnSuccess, onSuccess]);

  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      {state.error && (
        <p role="alert" className="mt-2 text-sm text-accent">
          {state.error}
        </p>
      )}
    </form>
  );
}
