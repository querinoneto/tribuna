import type { Metadata } from "next";
import { PublishForm } from "@/components/site/publish-form";

export const metadata: Metadata = {
  title: "Escreva e publique conosco",
  description: "Envie seu texto para a redação da Tribuna Socialista.",
};

export default function PubliquePage() {
  return (
    <div className="wrap pt-8 pb-16 sm:pt-12">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 border-b border-rule-strong pb-6">
          <p className="kicker mb-2">Colabore</p>
          <h1 className="font-display text-4xl leading-none sm:text-5xl">Escreva e publique conosco</h1>
          <p className="mt-4 font-serif text-lg leading-snug text-ink-soft sm:text-xl">
            A Tribuna é feita também por quem lê. Envie sua análise, reportagem, crônica ou artigo de opinião: a redação
            avalia cada texto e responde por e-mail.
          </p>
        </header>
        <ul className="mb-8 flex flex-col gap-2 font-serif text-base text-ink-soft">
          <li>• Mande o texto em <strong className="font-semibold text-ink">PDF ou Word</strong>, do jeito que você gostaria de vê-lo publicado.</li>
          <li>• Se for sua <strong className="font-semibold text-ink">primeira vez</strong>, envie também uma foto sua para acompanhar a assinatura.</li>
          <li>• O envio não garante a publicação; textos podem receber sugestões de edição antes de sair.</li>
        </ul>
        <PublishForm />
      </div>
    </div>
  );
}
