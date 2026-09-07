import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Logo da METADAX na SourceMarquee (src/components/SourceMarquee.tsx) —
    // único uso de imagem remota do produto; todo o resto vem de
    // public/assets/, servido pelo próprio domínio.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.metadax.com.br",
        pathname: "/assets/metadax_branding_marks/**",
      },
    ],
  },
  // Nomes de UF/candidato viram parte da URL (/candidato/:id) — mantidos
  // minúsculos e sem acento no slug para estabilidade de indexação (SEO).
  trailingSlash: false,
  // Passo 3 (final) da migração de domínio (07/09/2026, ver docs/ARCHITECTURE.md
  // §17): fatoeleitoral.com.br é agora o domínio canônico. Os dois domínios
  // anteriores (eleicoes.metadax.org e fatoeleitoral.metadax.org) continuam
  // existindo, mas redirecionam para o novo — preserva caminho e querystring.
  // Não-permanente (302) de propósito: mantém a possibilidade de reverter
  // sem que navegadores/mecanismos de busca fixem um cache de redirecionamento
  // que precisaria ser desfeito depois.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "eleicoes.metadax.org" }],
        destination: "https://fatoeleitoral.com.br/:path*",
        permanent: false,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "fatoeleitoral.metadax.org" }],
        destination: "https://fatoeleitoral.com.br/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
