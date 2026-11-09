import { SOCIAL_LABEL, SOCIAL_LINKS, type SocialNetwork } from "@/lib/social";
import { SocialIcon } from "./social-icons";

/**
 * Botões das redes sociais do jornal. Enquanto o endereço do perfil estiver
 * vazio (lib/social.ts), o botão aparece sem link ("em breve").
 * tone="band": sobre a faixa escura (rodapé); tone="paper": sobre o papel.
 */
export function SocialButtons({ tone = "paper", size = "md", className = "" }: { tone?: "band" | "paper"; size?: "sm" | "md"; className?: string }) {
  const networks = Object.keys(SOCIAL_LINKS) as SocialNetwork[];
  const box = size === "sm" ? "size-8" : "size-9";
  const icon = size === "sm" ? 14 : 16;
  const colors =
    tone === "band"
      ? "border-band-rule text-band-ink hover:border-band-accent hover:text-band-accent"
      : "border-rule text-ink-soft hover:border-ink hover:text-ink";
  const btn = `inline-flex ${box} items-center justify-center rounded-full border transition-colors duration-150 ${colors}`;
  return (
    <nav aria-label="Redes sociais" className={className}>
      <ul className="flex flex-wrap items-center justify-center gap-2">
        {networks.map((n) => {
          const url: string = SOCIAL_LINKS[n];
          return (
            <li key={n}>
              {url ? (
                <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Tribuna Socialista no ${SOCIAL_LABEL[n]}`} className={btn}>
                  <SocialIcon network={n} size={icon} />
                </a>
              ) : (
                // Perfil ainda não criado: botão visível, sem link
                <span role="img" aria-label={`${SOCIAL_LABEL[n]} (em breve)`} title={`${SOCIAL_LABEL[n]}: em breve`} className={btn}>
                  <SocialIcon network={n} size={icon} />
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
