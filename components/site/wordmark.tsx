import { SITE_NAME } from "@/lib/env";

/** Logotipo tipográfico: "Tribuna Socialista" em serifada de alto contraste. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display leading-[0.9] whitespace-nowrap ${className}`} style={{ fontWeight: 700, letterSpacing: "-0.03em" }}>
      {SITE_NAME}
    </span>
  );
}
