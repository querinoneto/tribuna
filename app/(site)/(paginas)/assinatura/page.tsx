import Link from "next/link";
import { Suspense } from "react";

export const metadata = { title: "Assinatura", robots: { index: false } };

const MESSAGES: Record<string, { title: string; text: string }> = {
  confirmada: {
    title: "Assinatura confirmada!",
    text: "A partir de agora, você receberá por e-mail o resumo semanal da Tribuna Socialista. Para cancelar, use o link presente no rodapé de cada mensagem.",
  },
  invalida: {
    title: "Link inválido ou já utilizado",
    text: "Este link de confirmação não é mais válido. Se a sua assinatura ainda não estiver ativa, faça um novo pedido no rodapé do site.",
  },
  erro: {
    title: "Não foi possível confirmar agora",
    text: "Ocorreu uma falha temporária. Tente abrir o link do e-mail novamente em alguns minutos.",
  },
};

async function Message({ searchParams }: { searchParams: Promise<{ situacao?: string }> }) {
  const { situacao = "" } = await searchParams;
  const m = MESSAGES[situacao] ?? MESSAGES.invalida;
  return (
    <>
      <h1 className="font-display text-4xl leading-none sm:text-5xl">{m.title}</h1>
      <p className="mt-5 text-lg leading-relaxed text-ink-soft">{m.text}</p>
    </>
  );
}

export default function AssinaturaPage({ searchParams }: PageProps<"/assinatura">) {
  return (
    <section className="wrap max-w-[680px] pt-10 pb-16 sm:pt-14">
      <Suspense fallback={<h1 className="font-display text-4xl">Assinatura</h1>}>
        <Message searchParams={searchParams as Promise<{ situacao?: string }>} />
      </Suspense>
      <Link href="/" className="btn-secondary mt-8">
        Ir para a página inicial
      </Link>
    </section>
  );
}
