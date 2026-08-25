import type { MetadataRoute } from "next";
import { UFS } from "@/lib/ufs";

const SITE_URL = "https://fatoeleitoral.metadax.org";

export default function sitemap(): MetadataRoute.Sitemap {
  const estaticas: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/buscar`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/mapa`, changeFrequency: "daily", priority: 0.6 },
    { url: `${SITE_URL}/status`, changeFrequency: "always", priority: 0.4 },
    { url: `${SITE_URL}/sobre`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/participe`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/roteiro`, changeFrequency: "weekly", priority: 0.4 },
    { url: `${SITE_URL}/atualizacoes`, changeFrequency: "daily", priority: 0.3 },
    { url: `${SITE_URL}/privacidade`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/termos`, changeFrequency: "yearly", priority: 0.2 },
  ];

  // Uma entrada por UF na busca — ajuda crawlers a descobrir a
  // variação de filtro sem depender só do formulário client-side.
  const porUf: MetadataRoute.Sitemap = UFS.map((uf) => ({
    url: `${SITE_URL}/buscar?uf=${uf}`,
    changeFrequency: "daily",
    priority: 0.6,
  }));

  return [...estaticas, ...porUf];
}
