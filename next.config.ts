import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Nomes de UF/candidato viram parte da URL (/candidato/:id) — mantidos
  // minúsculos e sem acento no slug para estabilidade de indexação (SEO).
  trailingSlash: false,
  // Passo 1 de 3 da migração de domínio (26/08/2026, ver docs/ARCHITECTURE.md
  // §17): eleicoes.metadax.org continua existindo, mas redireciona para o
  // novo domínio fatoeleitoral.metadax.org — preserva caminho e querystring.
  // Não-permanente (302) de propósito: o destino final ainda vai mudar de
  // novo (passo 3, fatoeleitoral.com.br), então evitar 308/301 aqui evita
  // que navegadores/mecanismos de busca fixem um cache de redirecionamento
  // que precisaria ser desfeito depois.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "eleicoes.metadax.org" }],
        destination: "https://fatoeleitoral.metadax.org/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
