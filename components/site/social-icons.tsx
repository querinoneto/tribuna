import type { SocialNetwork } from "@/lib/social";

/** Ícones simples das redes sociais (decorativos; o nome vai no rótulo do botão). */
export function SocialIcon({ network, size = 18 }: { network: SocialNetwork; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", "aria-hidden": true } as const;
  const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  switch (network) {
    case "x":
      return (
        <svg {...common} fill="currentColor">
          <path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.2-8.3L1.8 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z" />
        </svg>
      );
    case "instagram":
      return (
        <svg {...common} {...stroke}>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
        </svg>
      );
    case "youtube":
      return (
        <svg {...common} {...stroke}>
          <rect x="2.5" y="5.5" width="19" height="13" rx="3.5" />
          <path d="M10 9.3v5.4l4.6-2.7z" fill="currentColor" />
        </svg>
      );
  }
}
