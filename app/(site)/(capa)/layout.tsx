import { SiteHeader } from "@/components/site/header";

/** Capa: cabeçalho grande, que vira barra compacta e fixa ao rolar. */
export default function CapaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader variant="home" />
      <main id="conteudo" tabIndex={-1} className="outline-none">
        {children}
      </main>
    </>
  );
}
