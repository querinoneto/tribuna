import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Wordmark } from "@/components/site/wordmark";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar",
  robots: { index: false, follow: false },
};

const MESSAGES: Record<string, { tone: "error" | "info"; text: string }> = {
  "nao-autorizado": {
    tone: "error",
    text: "Acesso não autorizado. Esta conta não está na lista de pessoas que podem publicar no jornal. Se você faz parte da equipe, peça ao administrador para incluir o seu e-mail.",
  },
  "link-invalido": {
    tone: "error",
    text: "O link de acesso expirou ou já foi usado. Peça um novo abaixo.",
  },
  saiu: { tone: "info", text: "Você saiu do painel." },
};

async function Notice({ searchParams }: { searchParams: Promise<{ erro?: string; aviso?: string }> }) {
  const sp = await searchParams;
  const msg = MESSAGES[sp.erro ?? sp.aviso ?? ""];
  if (!msg) return null;
  return (
    <div
      role={msg.tone === "error" ? "alert" : "status"}
      className={
        msg.tone === "error"
          ? "border-l-4 border-accent bg-accent/10 p-4 text-sm leading-relaxed"
          : "border-l-4 border-ink bg-paper-2 p-4 text-sm"
      }
    >
      {msg.text}
    </div>
  );
}

async function Form({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  const next = sp.next?.startsWith("/admin") ? sp.next : "/admin";
  return <LoginForm next={next} />;
}

export default function EntrarPage({ searchParams }: PageProps<"/entrar">) {
  const sp = searchParams as Promise<{ erro?: string; aviso?: string; next?: string }>;
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <Wordmark className="text-4xl" />
          </Link>
          <p className="mt-3 text-sm text-muted">Acesso da equipe</p>
        </div>
        <div className="flex flex-col gap-6">
          <Suspense fallback={null}>
            <Notice searchParams={sp} />
          </Suspense>
          <Suspense fallback={<div className="skeleton h-48 rounded-md" />}>
            <Form searchParams={sp} />
          </Suspense>
        </div>
        <p className="mt-10 text-center text-sm text-muted">
          Leitores não precisam de conta.{" "}
          <Link href="/" className="font-semibold text-accent underline-offset-4 hover:underline">
            Voltar ao jornal
          </Link>
        </p>
      </div>
    </main>
  );
}
