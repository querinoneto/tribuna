"use client";

import { useState } from "react";
import { BIO_MAX } from "@/lib/validation";

/** Divide "Maria da Silva" em ["Maria", "da Silva"]. */
export function splitName(full: string): [string, string] {
  const parts = full.trim().split(/\s+/);
  return [parts[0] ?? "", parts.slice(1).join(" ")];
}

/** Campos Nome + Sobrenome (obrigatórios) e minibiografia com contador. */
export function NameBioFields({ name, bio, requireSurname = true }: { name: string; bio: string; requireSurname?: boolean }) {
  const [first, last] = splitName(name);
  const [text, setText] = useState(bio.slice(0, BIO_MAX));
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="field">
          Nome
          <input name="first_name" className="input" defaultValue={first} required maxLength={60} autoComplete="given-name" />
        </label>
        <label className="field">
          Sobrenome
          <input name="last_name" className="input" defaultValue={last} required={requireSurname} maxLength={80} autoComplete="family-name" />
        </label>
      </div>
      <label className="field">
        Minibiografia
        <textarea
          name="bio"
          rows={3}
          className="input"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, BIO_MAX))}
          maxLength={BIO_MAX}
          placeholder="Ex.: Advogada, pesquisadora de direito do trabalho e militante sindical."
        />
        <span className="text-right text-xs font-normal text-muted tabular-nums">
          {text.length}/{BIO_MAX}
        </span>
      </label>
    </>
  );
}
