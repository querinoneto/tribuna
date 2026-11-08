import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/env";
import "./globals.css";

/*
 * Fontes servidas pelo próprio site (next/font/local), sem chamadas ao
 * Google: mais rápido e mais privado para o leitor. Licença: SIL OFL 1.1.
 *  - DM Serif Display: logotipo, manchetes de seção e citações
 *  - Newsreader (variável, com tamanho óptico): títulos e texto longo
 *  - Inter Tight (variável): interface
 */
const display = localFont({
  src: "./fonts/dm-serif-display.woff2",
  weight: "400",
  variable: "--font-dm-serif",
  display: "swap",
});

const serif = localFont({
  src: [
    { path: "./fonts/newsreader.woff2", weight: "200 800", style: "normal" },
    { path: "./fonts/newsreader-italic.woff2", weight: "200 800", style: "italic" },
  ],
  variable: "--font-newsreader",
  display: "swap",
});

const sans = localFont({
  src: "./fonts/inter-tight.woff2",
  weight: "100 900",
  variable: "--font-inter-tight",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { types: { "application/rss+xml": [{ url: "/rss.xml", title: SITE_NAME }] } },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: SITE_NAME,
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: { card: "summary_large_image", images: ["/og-default.png"] },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f5" },
    { media: "(prefers-color-scheme: dark)", color: "#121110" },
  ],
};

/**
 * Aplica o tema antes da primeira pintura (evita o "piscar" claro→escuro):
 * usa a escolha salva no alternador ou, sem escolha, a preferência do sistema.
 */
const themeScript = `(function(){try{var t=localStorage.getItem('tema');var d=t?t==='escuro':matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d)}catch(e){}})()`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${display.variable} ${serif.variable} ${sans.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh bg-paper text-ink">{children}</body>
    </html>
  );
}
