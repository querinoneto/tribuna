import { InstitutionalPage, institutionalMetadata } from "@/components/site/institutional-page";

export const generateMetadata = () => institutionalMetadata("sobre", "Sobre");

export default function Page() {
  return <InstitutionalPage slug="sobre" />;
}
