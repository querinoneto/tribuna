import { InstitutionalPage, institutionalMetadata } from "@/components/site/institutional-page";

export const generateMetadata = () => institutionalMetadata("privacidade", "Política de privacidade");

export default function Page() {
  return <InstitutionalPage slug="privacidade" />;
}
