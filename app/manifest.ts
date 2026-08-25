import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Eleições — METADAX",
    short_name: "Eleições",
    description:
      "Consulta pública de candidatos às eleições brasileiras, cruzando TSE, Portal da Transparência e Receita Federal.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#1E1E1E",
    icons: [
      { src: "/assets/icon-32.png", sizes: "32x32", type: "image/png" },
      { src: "/assets/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/assets/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/assets/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/assets/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
