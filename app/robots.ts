import type { MetadataRoute } from "next";

const SITE_URL = "https://fatoeleitoral.metadax.org";

/**
 * Política deliberadamente permissiva: o objetivo do projeto é
 * transparência pública, então crawlers de busca e de IA (respostas
 * geradas, "answer engines") são bem-vindos — sem isso, dado público
 * fica preso atrás de um site que só humanos leem. Ver ARCHITECTURE.md.
 *
 * A lista de agentes de IA muda com frequência; revisar periodicamente
 * contra a documentação de cada provedor antes de assumir que está completa.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
      // Crawlers de treinamento/indexação de IA — permitidos explicitamente.
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "ChatGPT-User", allow: "/" },
      { userAgent: "OAI-SearchBot", allow: "/" },
      { userAgent: "ClaudeBot", allow: "/" },
      { userAgent: "Claude-Web", allow: "/" },
      { userAgent: "anthropic-ai", allow: "/" },
      { userAgent: "Google-Extended", allow: "/" },
      { userAgent: "GoogleOther", allow: "/" },
      { userAgent: "PerplexityBot", allow: "/" },
      { userAgent: "Perplexity-User", allow: "/" },
      { userAgent: "CCBot", allow: "/" },
      { userAgent: "Bytespider", allow: "/" },
      { userAgent: "Amazonbot", allow: "/" },
      { userAgent: "meta-externalagent", allow: "/" },
      { userAgent: "Applebot", allow: "/" },
      { userAgent: "Applebot-Extended", allow: "/" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
