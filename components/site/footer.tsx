import Image from "next/image";
import { LOGO } from "@/lib/brand";
import { SITE_TAGLINE } from "@/lib/env";
import { SocialButtons } from "./social-buttons";
import { Wordmark } from "./wordmark";

/** Rodapé enxuto: nome, slogan e redes sociais. */
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
        </div>
      </footer>
    </>
  );
}
