import "server-only";
import { USER_AGENT } from "./http";

/**
 * Visitantes e visualizações reais do site, via Vercel Web Analytics — o
 * mesmo produto cujo script (`@vercel/analytics`) já roda em todas as
 * páginas (ver app/layout.tsx e a divulgação em /privacidade). A API de
 * consulta exige duas coisas fora do código, configuradas manualmente no
 * painel da Vercel (feito em 25/08/2026):
 *
 *   1. Habilitar Web Analytics no projeto (Vercel → Project → Analytics
 *      → Enable) — sem isso os eventos são enviados mas não ficam
 *      retidos nem são consultáveis pela API.
 *   2. Um Vercel Access Token **com expiração longa/sem expiração**
 *      (criado em vercel.com/account/tokens — não confundir com o token
 *      de acesso de 1h do fluxo OAuth "Sign in with Vercel", que é outra
 *      coisa) com leitura neste projeto, salvo como variável de ambiente
 *      `VERCEL_API_TOKEN` (nunca no código-fonte).
 *
 * Sem essas duas condições — ou se a consulta falhar por qualquer outro
 * motivo (ex.: janela de datas fora do permitido pelo plano, ver
 * JANELA_DIAS abaixo) — degrada graciosamente: retorna `null` e a UI
 * mostra "indisponível" em vez de inventar um número ou mostrar zero como
 * se fosse dado real (mesmo padrão do resto do projeto, ver
 * src/lib/enrichment.ts).
 */

const PROJECT_ID = "prj_D2HzLlR41SBF5MKnaK5pLiBWRMTD";
const TEAM_ID = "team_nwD7aMZOVrV6Orwj8LSBieJI";
// 26/08/2026: era 3600 (1h) — o mantenedor reportou o número parecendo
// "travado" depois de visitar o site de verdade. Causa real: a Vercel já
// tinha o dado atualizado (confirmado consultando a API direto), mas o
// cache de 1h desta função + o ISR de 10 min de /sobre somavam até ~70
// min de atraso. Reduzido para 300s, igual ao Cache-Control que
// GET /api/estatisticas-projeto já declara.
const REVALIDATE_SEGUNDOS = 300;

// Confirmado em 25/08/2026: o plano Hobby só permite consultar os últimos
// 31 dias (a API rejeita com 400 qualquer `since` mais antigo que isso —
// não existe "todo o histórico" nesse plano). 30 dias fica com margem de
// segurança dentro do limite real.
const JANELA_DIAS = 30;

export interface EstatisticasVisitantes {
  /** Visitantes únicos (deduplicados) na janela — campo `visitors` da API da Vercel. */
  visitantes: number;
  /** Total de páginas vistas (não deduplicado) na janela — campo `pageviews` da API da Vercel. */
  visualizacoes: number;
  janelaDias: number;
}

interface RespostaContagem {
  data?: {
    visitors?: number;
    pageviews?: number;
  };
}

export async function buscarVisitantesSite(): Promise<EstatisticasVisitantes | null> {
  const token = process.env.VERCEL_API_TOKEN;
  if (!token) return null;

  try {
    const agora = new Date();
    const desde = new Date(agora.getTime() - JANELA_DIAS * 24 * 60 * 60 * 1000);

    const url = new URL("https://api.vercel.com/v1/query/web-analytics/visits/count");
    url.searchParams.set("projectId", PROJECT_ID);
    url.searchParams.set("teamId", TEAM_ID);
    url.searchParams.set("since", desde.toISOString());
    url.searchParams.set("until", agora.toISOString());

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, "User-Agent": USER_AGENT },
      next: { revalidate: REVALIDATE_SEGUNDOS },
    });
    if (!res.ok) return null;

    const json = (await res.json()) as RespostaContagem;
    const { visitors, pageviews } = json.data ?? {};
    if (typeof visitors !== "number" || typeof pageviews !== "number") return null;
    return { visitantes: visitors, visualizacoes: pageviews, janelaDias: JANELA_DIAS };
  } catch {
    return null;
  }
}
