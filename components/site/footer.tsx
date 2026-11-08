import { SITE_TAGLINE } from "@/lib/env";
import { SOCIAL_LABEL, SOCIAL_LINKS, type SocialNetwork } from "@/lib/social";
import { SocialIcon } from "./social-icons";
import { Wordmark } from "./wordmark";

/** Rodapé enxuto: nome, slogan e redes sociais. */
export function SiteFooter() {
  const networks = Object.keys(SOCIAL_LINKS) as SocialNetwork[];
  const btn = "inline-flex size-9 items-center justify-center rounded-full border border-band-rule text-band-ink";
  return (
    <>
      <footer className="bg-band text-band-ink">
        <div className="wrap flex flex-col items-center gap-3 py-6 text-center sm:flex-row sm:justify-between sm:py-5 sm:text-left">
          <div className="flex flex-col items-center gap-1 sm:flex-row sm:items-baseline sm:gap-4">
            <Wordmark className="text-[24px]" />
            <p className="font-serif text-[15px] text-band-muted italic">{SITE_TAGLINE}</p>
          </div>
          <nav aria-label="Redes sociais">
            <ul className="flex flex-wrap justify-center gap-2">
              {networks.map((n) => {
                const url: string = SOCIAL_LINKS[n];
                return (
                  <li key={n}>
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Tribuna Socialista no ${SOCIAL_LABEL[n]}`}
                        className={`${btn} transition-colors duration-150 hover:border-band-accent hover:text-band-accent`}
                      >
                        <SocialIcon network={n} size={16} />
                      </a>
                    ) : (
                      // Perfil ainda não criado: botão visível, sem link
                      <span role="img" aria-label={`${SOCIAL_LABEL[n]} (em breve)`} title={`${SOCIAL_LABEL[n]}: em breve`} className={btn}>
                        <SocialIcon network={n} size={16} />
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </footer>
    </>
  );
}
