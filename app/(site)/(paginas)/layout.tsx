import { SiteHeader } from "@/components/site/header";

/** Demais páginas: barra compacta e fixa no topo. */
export default function PaginasLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader variant="compact" />
      <main id="conteudo" tabIndex={-1} className="outline-none">
        {children}
      </main>
    </>
  );
}
