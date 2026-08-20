import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import { ProjectLoader } from "@/components/ProjectLoader";
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
  publisher: "Instituto METADAX de Inovação (IMI)",
  alternates: {
    canonical: "/",
  },
  referrer: "origin-when-cross-origin",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    // Sem twitter:site/creator — este projeto não é a conta comercial da
    // METADAX, atribuir a ela seria enganoso.
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
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  other: {
    // Convenção emergente para dar a um LLM um resumo direto do site —
    // ver public/llms.txt e o app/robots.ts equivalente.
    "llm-context": `${SITE_URL}/llms.txt`,
    "generator": "Next.js",
    "copyright": "© 2026 Instituto METADAX de Inovação (IMI). Dados de candidatos: fonte pública (TSE/CGU/Receita Federal), sem direito autoral do projeto sobre eles.",
    "rating": "General",
    // Identificação do operador legal do site — mesma informação já
    // exibida no rodapé (SiteFooter.tsx) e em /privacidade, não é
    // publicidade institucional, é o mesmo dado de transparência.
    "geo.placename": "Belo Horizonte, MG, Brasil",
    "geo.region": "BR-MG",
    "address": "Avenida Getúlio Vargas, 671, Sala 500, Parte 1364, Savassi, Belo Horizonte, MG, CEP 30112-021, Brasil",
    "company": "METADAX",
    "cnpj": "65.640.808/0001-89",
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

/**
 * Identificação do operador legal — dado de transparência (mesma info do
 * rodapé), não é a ficha comercial da METADAX como consultoria: por isso
 * não inclui logo, sameAs de redes sociais nem descrição de marketing.
 */
const jsonLdOperador = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "METADAX",
  legalName: "METADAX CONSULTORIA LTDA",
  url: "https://www.metadax.com.br",
  taxID: "65.640.808/0001-89",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Avenida Getúlio Vargas, 671, Sala 500, Parte 1364",
    addressLocality: "Belo Horizonte",
    addressRegion: "MG",
    postalCode: "30112-021",
    addressCountry: "BR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" data-theme="light">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebsite) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOperador) }}
        />
        <noscript>
          <style>{`.reveal{opacity:1 !important;transform:none !important;}`}</style>
        </noscript>
      </head>
      <body>
        {/*
          Deliberadamente ZERO dependência do CDN institucional da METADAX
          (nem CSS, nem loader, nem header/footer, nem botão de WhatsApp):
          é infraestrutura de terceiro cuja latência/disponibilidade este
          produto não controla, e um recurso bloqueante ou travado nela
          já prejudicou a primeira impressão do site (ver
          docs/ARCHITECTURE.md §11). Header, SiteFooter (com o bloco legal
          da METADAX como texto estático) e ProjectLoader são 100%
          próprios deste projeto, sem chamada de rede externa.
        */}
        <ProjectLoader />
        <Header />
        {children}
        <SiteFooter />

        {/* Analytics/observabilidade — ver /privacidade para o que é coletado */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
