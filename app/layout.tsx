import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/env";
import "./globals.css";

/*
 * Fontes servidas pelo próprio site (next/font/local), sem chamadas ao
 * Google: mais rápido e mais privado para o leitor. Licença: SIL OFL 1.1.
 *  - Newsreader (variável, com tamanho óptico): logotipo, títulos e texto longo
 *  - Inter Tight (variável): interface
 */
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
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: SITE_NAME,
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: { card: "summary_large_image", images: ["/og-default.png"] },
};

// A cor da barra do navegador acompanha o tema (o alternador a atualiza)
export const viewport: Viewport = { themeColor: "#faf8f5" };

/**
 * Aplica o tema antes da primeira pintura (evita o "piscar" claro→escuro).
 * O padrão é sempre o modo claro, mesmo com o celular ou o computador no
 * modo noturno; o escuro só entra quando o leitor escolhe no alternador.
 */
const themeScript = `(function(){try{if(localStorage.getItem('tema')==='escuro'){document.documentElement.classList.add('dark');var f=function(){var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content','#121110')};f();document.addEventListener('DOMContentLoaded',f)}}catch(e){}})()`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${serif.variable} ${sans.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh bg-paper text-ink">{children}</body>
    </html>
  );
}
