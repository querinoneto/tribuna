import { SITE_TAGLINE } from "@/lib/env";
import { SOCIAL_LABEL, SOCIAL_LINKS, type SocialNetwork } from "@/lib/social";
import { NewsletterBlock } from "./newsletter-form";
import { SocialIcon } from "./social-icons";
import { Wordmark } from "./wordmark";

/** Rodapé enxuto: nome, slogan e redes sociais. */
export function SiteFooter() {
  const networks = (Object.keys(SOCIAL_LINKS) as SocialNetwork[]).filter((n) => SOCIAL_LINKS[n]);
  return (
    <>
      <div id="newsletter">
        <NewsletterBlock />
      </div>
      <footer className="bg-band text-band-ink">
        <div className="wrap flex flex-col items-center gap-4 py-12 text-center">
          <Wordmark className="text-[32px] sm:text-[40px]" />
          <p className="font-serif text-[17px] text-band-muted italic">{SITE_TAGLINE}</p>
          {networks.length > 0 && (
            <nav aria-label="Redes sociais" className="mt-2">
              <ul className="flex flex-wrap justify-center gap-3">
                {networks.map((n) => (
                  <li key={n}>
                    <a
                      href={SOCIAL_LINKS[n]}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Tribuna Socialista no ${SOCIAL_LABEL[n]}`}
                      className="inline-flex size-11 items-center justify-center rounded-full border border-band-rule text-band-ink transition-colors duration-150 hover:border-band-accent hover:text-band-accent"
                    >
                      <SocialIcon network={n} />
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </footer>
    </>
  );
}
