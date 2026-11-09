import Image from "next/image";
import Link from "next/link";
import { LOGO } from "@/lib/brand";
import { SITE_TAGLINE } from "@/lib/env";
import { SocialButtons } from "./social-buttons";
import { Wordmark } from "./wordmark";

/** Rodapé enxuto: nome, slogan, redes sociais e, discretos, os documentos legais. */
export function SiteFooter() {
  return (
    <>
      <footer className="bg-band text-band-ink">
        <div className="wrap flex flex-col items-center gap-3 py-7 text-center">
          {LOGO && (
            <Image src={LOGO.src} alt="" width={LOGO.width} height={LOGO.height} className="size-16 sm:size-[72px]" />
          )}
          <div className="flex flex-col items-center gap-1">
            <Wordmark className="text-[24px]" />
            <p className="font-sans text-[14px] text-band-muted">{SITE_TAGLINE}</p>
          </div>
          <SocialButtons tone="band" className="mt-1" />
          <nav aria-label="Documentos" className="mt-2 flex flex-wrap justify-center gap-x-2 text-[11px] text-band-muted">
            <Link href="/privacidade" className="hover:text-band-ink hover:underline">
              Política de Privacidade
            </Link>
            <span aria-hidden>·</span>
            <Link href="/termos-de-colaboracao" className="hover:text-band-ink hover:underline">
              Termo de Colaboração
            </Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
