import type { SocialNetwork } from "@/lib/social";

/** Ícones simples das redes sociais (decorativos; o nome vai no aria-label do link). */
export function SocialIcon({ network, size = 18 }: { network: SocialNetwork; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", "aria-hidden": true } as const;
  const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  switch (network) {
    case "instagram":
      return (
        <svg {...common} {...stroke}>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
        </svg>
      );
    case "x":
      return (
        <svg {...common} fill="currentColor">
          <path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.2-8.3L1.8 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z" />
        </svg>
      );
    case "facebook":
      return (
        <svg {...common} fill="currentColor">
          <path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.5V4.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.4H8v3h2.6V21h2.9Z" />
        </svg>
      );
    case "youtube":
      return (
        <svg {...common} {...stroke}>
          <rect x="2.5" y="5.5" width="19" height="13" rx="3.5" />
          <path d="M10 9.3v5.4l4.6-2.7z" fill="currentColor" />
        </svg>
      );
    case "tiktok":
      return (
        <svg {...common} {...stroke}>
          <path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5" />
          <path d="M14 3c.5 2.6 2.2 4.2 5 4.5" />
        </svg>
      );
    case "telegram":
      return (
        <svg {...common} {...stroke}>
          <path d="m21 4-18 7 6.5 2.2L18 7l-6.3 7.4L18 20z" />
        </svg>
      );
    case "whatsapp":
      return (
        <svg {...common} {...stroke} strokeWidth={1.6}>
          <path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z" />
          <path d="M9 9.5c.3 2 2 4 4.5 4.8l1-1.1 1.8.8-.4 1.5c-3.6.2-7-3.2-7-6.8l1.5-.4.8 1.8z" />
        </svg>
      );
  }
}
