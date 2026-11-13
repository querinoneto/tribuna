"use client";

import { useCallback, useEffect, useState } from "react";
import { newCaptcha } from "@/app/actions/captcha";

type Challenge = { image: string; token: string; width: number; height: number };

/**
 * Captcha do formulário: imagem com números, campo para digitá-los e botão
 * para trocar a imagem. Uma imagem nova é carregada a cada tentativa de envio
 * (mude `round` para pedir outra).
 */
export function CaptchaField({ round }: { round?: number }) {
  const [c, setC] = useState<Challenge | null>(null);
  const [failed, setFailed] = useState(false);
  const [answer, setAnswer] = useState("");

  const load = useCallback(async () => {
    setFailed(false);
    try {
      setC(await newCaptcha());
      setAnswer("");
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca a imagem no servidor ao abrir e a cada tentativa
    load();
  }, [load, round]);

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 font-sans text-[15px] font-semibold">Verificação: digite os números da imagem</legend>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-20 w-60 items-center justify-center overflow-hidden rounded-md border border-rule bg-paper-2">
          {c ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.image} width={c.width} height={c.height} alt="Imagem com cinco números para digitar" className="h-20 w-60" />
          ) : (
            <span className="text-sm text-muted">{failed ? "Não foi possível carregar." : "Carregando…"}</span>
          )}
        </div>
        <button type="button" onClick={load} className="btn-ghost text-sm">
          Trocar imagem
        </button>
      </div>
      <input type="hidden" name="captcha_token" value={c?.token ?? ""} />
      <input
        name="captcha_answer"
        aria-label="Números da imagem"
        required
        inputMode="numeric"
        autoComplete="off"
        pattern="[0-9 ]{5,7}"
        maxLength={7}
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        className="input max-w-60 tracking-[0.3em]"
      />
      <span className="text-xs text-muted">Se não conseguir ler, clique em “Trocar imagem”.</span>
    </fieldset>
  );
}
