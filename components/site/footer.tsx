import Link from "next/link";
import { cacheLife } from "next/cache";
import { getSections } from "@/lib/data/public";
import { SITE_TAGLINE } from "@/lib/env";
import { NewsletterBlock } from "./newsletter-form";
import { Wordmark } from "./wordmark";

async function year() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

export async function SiteFooter() {
  const [sections, y] = await Promise.all([getSections(), year()]);
  const half = Math.ceil(sections.length / 2);
  return (
    <>
      <div id="newsletter">
        <NewsletterBlock />
      </div>
      <footer className="bg-band text-band-ink">
        <div className="wrap flex flex-wrap gap-10 pt-12 pb-8">
          <div className="flex flex-[2_1_320px] flex-col gap-3.5">
            <Wordmark className="text-[40px]" />
            <p className="font-serif text-[17px] text-band-muted italic">{SITE_TAGLINE}</p>
          </div>
          <nav aria-label="Editorias no rodapé" className="flex flex-[1_1_150px] flex-col gap-2.5 text-sm">
            <span className="text-[11px] font-bold tracking-[0.14em] text-band-muted">EDITORIAS</span>
            {sections.slice(0, half).map((s) => (
              <Link key={s.slug} href={`/editoria/${s.slug}`} className="hover:text-band-accent">
                {s.name}
              </Link>
            ))}
          </nav>
          <nav aria-label="Mais editorias" className="flex flex-[1_1_150px] flex-col gap-2.5 text-sm sm:pt-[26px]">
            {sections.slice(half).map((s) => (
              <Link key={s.slug} href={`/editoria/${s.slug}`} className="hover:text-band-accent">
                {s.name}
              </Link>
            ))}
            <Link href="/colunistas" className="hover:text-band-accent">Colunistas</Link>
          </nav>
          <nav aria-label="O jornal" className="flex flex-[1_1_150px] flex-col gap-2.5 text-sm">
            <span className="text-[11px] font-bold tracking-[0.14em] text-band-muted">O JORNAL</span>
            <Link href="/sobre" className="hover:text-band-accent">Sobre</Link>
            <Link href="/expediente" className="hover:text-band-accent">Expediente</Link>
            <Link href="/contato" className="hover:text-band-accent">Contato</Link>
            <Link href="/privacidade" className="hover:text-band-accent">Política de privacidade</Link>
            <a href="/rss.xml" className="hover:text-band-accent">RSS</a>
          </nav>
        </div>
        <div className="wrap border-t border-band-rule pt-4 pb-7 text-xs text-band-muted">
          © {y} Tribuna Socialista. Reprodução permitida com citação da fonte.
        </div>
      </footer>
    </>
  );
}
