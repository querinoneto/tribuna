import { InstitutionalPage, institutionalMetadata } from "@/components/site/institutional-page";

export const generateMetadata = () => institutionalMetadata("contato", "Contato");

export default function Page() {
  return <InstitutionalPage slug="contato" />;
}
