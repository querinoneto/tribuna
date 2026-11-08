"use client";

import { useRef, useState, useTransition } from "react";

/**
 * Botão que pede confirmação antes de uma ação destrutiva, usando o
 * <dialog> nativo (acessível por teclado e leitor de tela).
 */
export function ConfirmButton({
  children,
  title,
  description,
  confirmLabel = "Confirmar",
  onConfirm,
  className = "btn-danger",
  ariaLabel,
}: {
  children: React.ReactNode;
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
  className?: string;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [pending, start] = useTransition();
  const [, force] = useState(0);

  return (
    <>
      <button type="button" className={className} aria-label={ariaLabel} onClick={() => ref.current?.showModal()}>
        {children}
      </button>
      <dialog
        ref={ref}
        className="m-auto w-[min(92vw,26rem)] rounded-lg border border-rule bg-paper p-0 text-ink backdrop:bg-black/50"
        onClose={() => force((n) => n + 1)}
      >
        <div className="p-6">
          <h2 className="font-display text-2xl leading-tight">{title}</h2>
          {description && <p className="mt-2 text-sm leading-relaxed text-ink-soft">{description}</p>}
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => ref.current?.close()} autoFocus>
              Cancelar
            </button>
            <button
              type="button"
              className="btn bg-accent text-accent-ink hover:bg-accent-strong"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await onConfirm();
                  ref.current?.close();
                })
              }
            >
              {pending ? "Aguarde…" : confirmLabel}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
