import { SITE_NAME } from "@/lib/env";

/** Logotipo tipográfico: "Tribuna Socialista" em serifada de alto contraste. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display leading-[0.9] tracking-[-0.025em] whitespace-nowrap ${className}`}>
      {SITE_NAME}
    </span>
  );
}
