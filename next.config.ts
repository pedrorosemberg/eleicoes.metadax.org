import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Nomes de UF/candidato viram parte da URL (/candidato/:id) — mantidos
  // minúsculos e sem acento no slug para estabilidade de indexação (SEO).
  trailingSlash: false,
};

export default nextConfig;
