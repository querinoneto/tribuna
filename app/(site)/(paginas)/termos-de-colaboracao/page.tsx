import { InstitutionalPage, institutionalMetadata } from "@/components/site/institutional-page";

export const generateMetadata = () => institutionalMetadata("termos-de-colaboracao", "Termo de colaboração");

export default function Page() {
  return <InstitutionalPage slug="termos-de-colaboracao" />;
}
