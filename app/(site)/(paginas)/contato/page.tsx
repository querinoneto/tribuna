import { ContactForm } from "@/components/site/contact-form";
import { InstitutionalPage, institutionalMetadata } from "@/components/site/institutional-page";

export const generateMetadata = () => institutionalMetadata("contato", "Contato");

export default function Page() {
  return (
    <InstitutionalPage slug="contato" showUpdated={false}>
      <ContactForm />
    </InstitutionalPage>
  );
}
