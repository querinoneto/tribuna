"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { submitText } from "@/app/actions/submissions";
import { IconCheck } from "@/components/icons";
import { createClient } from "@/lib/supabase/browser";
import {
  PHOTO_FILE_TYPES,
  TEXT_FILE_TYPES,
  emailSchema,
  fileExtension,
  validatePhotoFile,
  validateTextFile,
} from "@/lib/validation";

type Status = "idle" | "sending" | "sent";

/** Formulário "Escreva e publique conosco". */
export function PublishForm() {
  const id = useId();
  const [firstTime, setFirstTime] = useState<boolean | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    if (String(fd.get("site") ?? "")) return setStatus("sent"); // armadilha para robôs

    const first_name = String(fd.get("first_name") ?? "").trim();
    const last_name = String(fd.get("last_name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim().toLowerCase();
    const text = fd.get("texto") as File | null;
    const photo = fd.get("foto") as File | null;

    if (!first_name) return setError("Informe seu nome.");
    if (!last_name) return setError("Informe seu sobrenome.");
    if (!emailSchema.safeParse(email).success) return setError("Digite um e-mail válido.");
    if (firstTime === null) return setError("Diga se você já publicou na Tribuna Socialista.");
    if (!text || text.size === 0) return setError("Anexe o arquivo do seu texto (PDF ou Word).");
    const textProblem = validateTextFile(text);
    if (textProblem) return setError(textProblem);
    if (firstTime) {
      if (!photo || photo.size === 0) return setError("Como é sua primeira publicação, envie uma foto sua.");
      const photoProblem = validatePhotoFile(photo);
      if (photoProblem) return setError(photoProblem);
    }
    if (fd.get("terms") !== "on") return setError("Para enviar, aceite o Termo de colaboração e licença de direitos autorais.");
    if (fd.get("consent") !== "on") return setError("Para enviar, marque que concorda com a Política de privacidade.");

    setStatus("sending");
    try {
      const supabase = createClient();
      const folder = `recebidos/${crypto.randomUUID()}`;

      setStep("Enviando o texto…");
      const textExt = fileExtension(text.name);
      const file_path = `${folder}/texto.${textExt}`;
      const up1 = await supabase.storage
        .from("envios")
        .upload(file_path, text, { contentType: TEXT_FILE_TYPES[textExt], upsert: false });
      if (up1.error) throw new Error("Não foi possível enviar o arquivo do texto. Tente de novo.");

      let photo_path: string | null = null;
      if (firstTime && photo) {
        setStep("Enviando a foto…");
        const photoExt = fileExtension(photo.name);
        photo_path = `${folder}/foto.${photoExt}`;
        const up2 = await supabase.storage
          .from("envios")
          .upload(photo_path, photo, { contentType: PHOTO_FILE_TYPES[photoExt], upsert: false });
        if (up2.error) throw new Error("Não foi possível enviar a foto. Tente de novo.");
      }

      setStep("Finalizando…");
      const r = await submitText({
        first_name,
        last_name,
        email,
        title: String(fd.get("title") ?? ""),
        message: String(fd.get("message") ?? ""),
        first_time: firstTime,
        file_path,
        file_name: text.name.slice(0, 200),
        photo_path,
        consent: true,
        terms: true,
      });
      if (!r.ok) throw new Error(r.error);
      setStatus("sent");
    } catch (err) {
      setStatus("idle");
      setError((err as Error).message);
    }
  }

  if (status === "sent") {
    return (
      <div role="status" className="flex flex-col items-start gap-3 border border-rule bg-paper-2 p-6 sm:p-8">
        <span className="inline-flex size-11 items-center justify-center rounded-full bg-ink text-paper">
          <IconCheck size={20} />
        </span>
        <h2 className="font-sans text-2xl font-bold tracking-tight">Recebemos seu texto!</h2>
        <p className="font-sans text-lg text-ink-soft">
          Obrigado por escrever para a Tribuna Socialista. Nossa equipe vai ler com atenção e responder pelo e-mail informado.
        </p>
        <Link href="/" className="btn-secondary mt-2">
          Voltar à capa
        </Link>
      </div>
    );
  }

  const sending = status === "sending";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate aria-describedby={error ? `${id}-erro` : undefined}>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="field">
          Nome <span className="sr-only">(obrigatório)</span>
          <input name="first_name" required autoComplete="given-name" maxLength={60} className="input" />
        </label>
        <label className="field">
          Sobrenome <span className="sr-only">(obrigatório)</span>
          <input name="last_name" required autoComplete="family-name" maxLength={60} className="input" />
        </label>
      </div>
      <label className="field">
        E-mail <span className="sr-only">(obrigatório)</span>
        <input name="email" type="email" inputMode="email" required autoComplete="email" maxLength={254} className="input" />
      </label>

      <label className="field">
        <span>
          Título do texto <span className="font-normal text-muted">(opcional)</span>
        </span>
        <input name="title" maxLength={200} className="input" />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium">Você já publicou na Tribuna Socialista?</legend>
        <div className="flex flex-wrap gap-3">
          {[
            { v: false, label: "Sim, já publiquei" },
            { v: true, label: "Não, é a primeira vez" },
          ].map((o) => (
            <label
              key={String(o.v)}
              className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md border px-4 text-sm ${
                firstTime === o.v ? "border-ink bg-paper-2 font-semibold" : "border-rule"
              }`}
            >
              <input
                type="radio"
                name="first_time"
                className="size-4 accent-[var(--accent)]"
                checked={firstTime === o.v}
                onChange={() => setFirstTime(o.v)}
              />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>

      {firstTime && (
        <FileField
          name="foto"
          label="Sua foto"
          hint="para acompanhar a assinatura · JPG, PNG ou WebP, até 5 MB"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          button="Escolher foto"
        />
      )}

      <FileField
        name="texto"
        label="Seu texto"
        hint="PDF ou Word, até 10 MB"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        button="Escolher arquivo"
      />

      <label className="field">
        <span>
          Mensagem para a redação{" "}
          <span className="font-normal text-muted">(opcional: uma mini biografia, o contexto do texto…)</span>
        </span>
        <textarea name="message" rows={4} maxLength={2000} className="input" />
      </label>

      <input type="text" name="site" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

      <div className="border border-rule bg-paper-2 p-4 text-sm leading-relaxed sm:p-5">
        <p className="font-semibold">Antes de enviar, saiba que:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-soft">
          <li>a colaboração é voluntária e gratuita, sem nenhuma remuneração;</li>
          <li>você é o responsável pelo conteúdo do seu texto e pelas opiniões e informações nele contidas;</li>
          <li>a equipe pode alterar o título e a linha fina, corrigir o texto e cortar trechos, mas nunca acrescentar nada ao que você escreveu;</li>
          <li>
            você concede ao jornal, de graça, por prazo indeterminado e de forma irrevogável, licença para usar o texto no site, nas redes, por e-mail, em
            publicações impressas e em outros meios, sempre com seu nome;
          </li>
          <li>a publicação depende de avaliação da equipe.</li>
        </ul>
      </div>

      <label className="flex items-start gap-3 text-sm leading-snug">
        <input type="checkbox" name="terms" className="mt-0.5 size-5 shrink-0 accent-[var(--accent)]" />
        <span>
          Li e aceito o{" "}
          <Link href="/termos-de-colaboracao" target="_blank" className="underline underline-offset-2 hover:text-accent">
            Termo de colaboração e licença de direitos autorais
          </Link>
          , declaro que sou o autor do texto e que tenho 18 anos ou mais (ou autorização dos meus responsáveis).
        </span>
      </label>

      <label className="flex items-start gap-3 text-sm leading-snug">
        <input type="checkbox" name="consent" className="mt-0.5 size-5 shrink-0 accent-[var(--accent)]" />
        <span>
          Li e concordo com a{" "}
          <Link href="/privacidade" target="_blank" className="underline underline-offset-2 hover:text-accent">
            Política de privacidade
          </Link>{" "}
          e autorizo a Tribuna Socialista a usar estes dados para avaliar e, se aprovado, publicar meu texto com meu nome e minha foto.
        </span>
      </label>

      {error && (
        <p id={`${id}-erro`} role="alert" className="border-l-4 border-accent bg-accent/10 p-3 text-sm">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className="btn-primary h-12 px-6 text-base" disabled={sending}>
          {sending ? "Enviando…" : "Enviar meu texto"}
        </button>
        {sending && (
          <span className="text-sm text-muted" aria-live="polite">
            {step}
          </span>
        )}
      </div>
    </form>
  );
}

/** Campo de arquivo com rótulos em português (o botão nativo depende do idioma do navegador). */
function FileField({ name, label, hint, accept, button }: { name: string; label: string; hint: string; accept: string; button: string }) {
  const inputId = useId();
  const [file, setFile] = useState<string | null>(null);
  return (
    <div className="field">
      <span id={`${inputId}-rotulo`}>
        {label} <span className="font-normal text-muted">({hint})</span>
      </span>
      <div className="flex min-h-11 items-center gap-3 rounded-md border border-rule bg-paper px-2 py-1.5 focus-within:border-ink">
        <label htmlFor={inputId} className="btn-secondary min-h-9 cursor-pointer px-3 py-1.5 text-sm">
          {button}
        </label>
        <span className="min-w-0 truncate text-sm font-normal text-muted">{file ?? "Nenhum arquivo escolhido"}</span>
        <input
          id={inputId}
          name={name}
          type="file"
          accept={accept}
          aria-labelledby={`${inputId}-rotulo`}
          className="sr-only"
          onChange={(e) => setFile(e.target.files?.[0]?.name ?? null)}
        />
      </div>
    </div>
  );
}
