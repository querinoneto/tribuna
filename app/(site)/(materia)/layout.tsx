import { SiteHeader } from "@/components/site/header";
import { PublishCta } from "@/components/site/publish-cta";

/**
 * Página da matéria: barra compacta no topo. O convite à newsletter já
 * aparece no fim do texto; embaixo, o convite para escrever no jornal.
 */
export default function MateriaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader variant="compact" />
      <main id="conteudo" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <PublishCta />
    </>
  );
}
