"use client";

import { useCallback, useRef, useState } from "react";

type Field = {
  name: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  type?: string;
  hint?: string;
  required?: boolean;
  /** Quando presente, o campo vira uma lista de opções. */
  options?: { value: string; label: string }[];
};
type Config = { title: string; fields: Field[]; confirmLabel?: string };
type Values = Record<string, string>;

/**
 * Pequeno diálogo com campos (link, vídeo, texto alternativo…), mais
 * confortável no celular que o window.prompt. Uso:
 *   const [dialog, ask] = usePrompt();  …  const v = await ask({...})
 */
export function usePrompt(): [React.ReactNode, (c: Config) => Promise<Values | null>] {
  const ref = useRef<HTMLDialogElement>(null);
  const resolver = useRef<((v: Values | null) => void) | null>(null);
  const [config, setConfig] = useState<Config | null>(null);

  const ask = useCallback((c: Config) => {
    setConfig(c);
    requestAnimationFrame(() => ref.current?.showModal());
    return new Promise<Values | null>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const finish = (v: Values | null) => {
    resolver.current?.(v);
    resolver.current = null;
    ref.current?.close();
  };

  const node = (
    <dialog
      ref={ref}
      onClose={() => resolver.current?.(null)}
      className="m-auto w-[min(92vw,28rem)] rounded-lg border border-rule bg-paper p-0 text-ink backdrop:bg-black/50"
    >
      {config && (
        <form
          method="dialog"
          className="flex flex-col gap-4 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            finish(Object.fromEntries(config.fields.map((f) => [f.name, String(fd.get(f.name) ?? "").trim()])));
          }}
        >
          <h2 className="font-display text-2xl">{config.title}</h2>
          {config.fields.map((f, i) => (
            <label key={f.name} className="field">
              {f.label}
              {f.options ? (
                <select name={f.name} defaultValue={f.defaultValue} className="input">
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : f.type === "textarea" ? (
                <textarea
                  name={f.name}
                  defaultValue={f.defaultValue}
                  placeholder={f.placeholder}
                  required={f.required}
                  autoFocus={i === 0}
                  rows={4}
                  className="input min-h-28 py-2"
                />
              ) : (
                <input
                  name={f.name}
                  type={f.type ?? "text"}
                  defaultValue={f.defaultValue}
                  placeholder={f.placeholder}
                  required={f.required}
                  autoFocus={i === 0}
                  className="input"
                  spellCheck={f.type === "latex" ? false : undefined}
                />
              )}
              {f.hint && <span className="text-xs font-normal text-muted">{f.hint}</span>}
            </label>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => finish(null)}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              {config.confirmLabel ?? "Inserir"}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );

  return [node, ask];
}
