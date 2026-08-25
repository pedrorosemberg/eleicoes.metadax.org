import "server-only";
import { USER_AGENT } from "./http";

/**
 * Visitantes e visualizações reais do site, via Vercel Web Analytics — o
 * mesmo produto cujo script (`@vercel/analytics`) já roda em todas as
 * páginas (ver app/layout.tsx e a divulgação em /privacidade). A API de
 * consulta exige duas coisas fora do código, feitas manualmente uma única
 * vez no painel da Vercel — nenhuma delas pode ser configurada por este
 * projeto sozinho:
 *
 *   1. Habilitar Web Analytics no projeto (Vercel → Project → Analytics
 *      → Enable). O script já envia eventos hoje, mas sem isso eles não
 *      ficam retidos nem são consultáveis pela API.
 *   2. Um Vercel Access Token com acesso de leitura a este projeto,
 *      salvo como variável de ambiente `VERCEL_API_TOKEN` (nunca no
 *      código-fonte).
 *
 * Sem essas duas condições, degrada graciosamente: retorna `null` e a UI
 * mostra "indisponível" em vez de inventar um número ou mostrar zero como
 * se fosse dado real (mesmo padrão do resto do projeto, ver
 * src/lib/enrichment.ts).
 */

const PROJECT_ID = "prj_D2HzLlR41SBF5MKnaK5pLiBWRMTD";
const TEAM_ID = "team_nwD7aMZOVrV6Orwj8LSBieJI";
const REVALIDATE_SEGUNDOS = 3600; // visitantes não precisam de granularidade fina

export interface EstatisticasVisitantes {
  visitantes: number;
  visualizacoes: number;
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
    const url = new URL("https://api.vercel.com/v1/query/web-analytics/visits/count");
    url.searchParams.set("projectId", PROJECT_ID);
    url.searchParams.set("teamId", TEAM_ID);
    // Qualquer data bem anterior ao lançamento — a API só devolve dado real
    // a partir do momento em que o Web Analytics foi habilitado, então uma
    // janela larga não gera número inflado nem exige atualizar essa data.
    url.searchParams.set("since", "2020-01-01T00:00:00.000Z");
    url.searchParams.set("until", new Date().toISOString());

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, "User-Agent": USER_AGENT },
      next: { revalidate: REVALIDATE_SEGUNDOS },
    });
    if (!res.ok) return null;

    const json = (await res.json()) as RespostaContagem;
    const { visitors, pageviews } = json.data ?? {};
    if (typeof visitors !== "number" || typeof pageviews !== "number") return null;
    return { visitantes: visitors, visualizacoes: pageviews };
  } catch {
    return null;
  }
}
