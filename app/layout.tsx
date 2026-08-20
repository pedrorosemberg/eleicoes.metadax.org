import type { Metadata } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

const SITE_URL = "https://eleicoes.metadax.org";
const SITE_NAME = "Eleições — METADAX";
const SITE_DESCRIPTION =
  "Consulta pública de candidatos às eleições brasileiras: dados oficiais do TSE, plano de governo, partido e cruzamento com o Portal da Transparência e a Receita Federal. Fonte pública, sem viés partidário.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "eleições",
    "candidatos",
    "TSE",
    "transparência eleitoral",
    "plano de governo",
    "portal da transparência",
    "bens declarados",
    "eleições 2026",
  ],
  authors: [{ name: "Instituto METADAX de Inovação (IMI)", url: "https://imi.metadax.org" }],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  // Sinaliza explicitamente a crawlers e a mecanismos de resposta de IA
  // (AEO/GEO) que o conteúdo pode ser indexado e citado — ver
  // docs/ARCHITECTURE.md §9 e app/robots.ts para a política completa.
  robots: {
    index: true,
    follow: true,
    "max-snippet": -1,
    "max-image-preview": "large",
    "max-video-preview": -1,
  },
};

const jsonLdWebsite = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  inLanguage: "pt-BR",
  publisher: {
    "@type": "Organization",
    name: "Instituto METADAX de Inovação (IMI)",
    url: "https://imi.metadax.org",
  },
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/buscar?uf={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" data-theme="light">
      <head>
        <link rel="stylesheet" href="https://cdn.metadax.com.br/components/css/styles.css" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebsite) }}
        />
      </head>
      <body>
        <Header />
        {children}

        {/* Header/footer/loader institucionais, centralizados no CDN público da METADAX. */}
        <Script src="https://cdn.metadax.com.br/components/scripts/whatsapp-button.js" strategy="afterInteractive" />
        <Script src="https://cdn.metadax.com.br/metadax-loader.js" strategy="afterInteractive" />
        <Script src="https://cdn.metadax.com.br/component-loader.js" strategy="afterInteractive" />

        <SiteFooter />

        {/* Analytics/observabilidade — ver /privacidade para o que é coletado */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
