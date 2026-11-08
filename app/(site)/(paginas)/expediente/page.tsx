import { InstitutionalPage, institutionalMetadata } from "@/components/site/institutional-page";

export const generateMetadata = () => institutionalMetadata("expediente", "Expediente");

export default function Page() {
  return <InstitutionalPage slug="expediente" />;
}
