import "server-only";
import { USER_AGENT } from "./http";

/**
 * Checagem em tempo real da disponibilidade das fontes externas — para a
 * página /status. Ver docs/DATA_SOURCES.md §5 sobre o bloqueio de edge do
 * TSE observado durante o desenvolvimento: esta checagem existe justamente
 * para o usuário ver, ao vivo e a partir do ambiente de produção real, se
 * esse bloqueio persiste ou não — não presumir a partir da documentação.
 */

export type StatusFonte = "operacional" | "requer-autenticacao" | "bloqueado" | "indisponivel";

export interface ChecagemFonte {
  id: string;
  nome: string;
  descricao: string;
  status: StatusFonte;
  httpStatus: number | null;
  latenciaMs: number | null;
  verificadoEm: string;
  detalhe: string;
}

const TIMEOUT_MS = 6000;

async function checar(
  id: string,
  nome: string,
  descricao: string,
  url: string,
  classificar: (status: number) => { status: StatusFonte; detalhe: string },
  init?: RequestInit,
): Promise<ChecagemFonte> {
  const inicio = Date.now();
  const verificadoEm = new Date().toISOString();
  try {
    const res = await fetch(url, {
      ...init,
      headers: { "User-Agent": USER_AGENT, ...init?.headers },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    const latenciaMs = Date.now() - inicio;
    const { status, detalhe } = classificar(res.status);
    return { id, nome, descricao, status, httpStatus: res.status, latenciaMs, verificadoEm, detalhe };
  } catch (err) {
    const latenciaMs = Date.now() - inicio;
    const timeout = err instanceof Error && err.name === "TimeoutError";
    return {
      id,
      nome,
      descricao,
      status: "indisponivel",
      httpStatus: null,
      latenciaMs,
      verificadoEm,
      detalhe: timeout
        ? `Sem resposta em ${TIMEOUT_MS / 1000}s (timeout)`
        : "Falha de rede/DNS ao conectar",
    };
  }
}

function classificacaoPadraoOk(status: number) {
  if (status >= 200 && status < 400) return { status: "operacional" as const, detalhe: `HTTP ${status}` };
  return { status: "indisponivel" as const, detalhe: `HTTP ${status}` };
}

function classificacaoTse(status: number) {
  if (status >= 200 && status < 400) return { status: "operacional" as const, detalhe: `HTTP ${status}` };
  if (status === 403) {
    return {
      status: "bloqueado" as const,
      detalhe: "HTTP 403 — bloqueio de rede do lado da fonte, fora do nosso controle",
    };
  }
  return { status: "indisponivel" as const, detalhe: `HTTP ${status}` };
}

function classificacaoTransparencia(status: number) {
  if (status >= 200 && status < 400) return { status: "operacional" as const, detalhe: `HTTP ${status}` };
  if (status === 401 || status === 403) {
    return {
      status: "requer-autenticacao" as const,
      detalhe: "Servidor alcançável — ainda falta configurar a chave de acesso",
    };
  }
  return { status: "indisponivel" as const, detalhe: `HTTP ${status}` };
}

export async function verificarSaudeFontes(): Promise<ChecagemFonte[]> {
  const apiKey = process.env.PORTAL_TRANSPARENCIA_API_KEY;

  return Promise.all([
    checar(
      "tse-dados-abertos",
      "TSE — Dados Abertos",
      "Catálogo CKAN de candidatos (dadosabertos.tse.jus.br)",
      "https://dadosabertos.tse.jus.br/",
      classificacaoTse,
    ),
    checar(
      "tse-cdn",
      "TSE — CDN de dados",
      "Download dos CSVs de candidatos (cdn.tse.jus.br)",
      "https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2026.zip",
      classificacaoTse,
      { method: "HEAD" },
    ),
    checar(
      "tse-divulgacand",
      "TSE — DivulgaCandContas",
      "API de detalhe de candidato, plano de governo (divulgacandcontas.tse.jus.br)",
      "https://divulgacandcontas.tse.jus.br/divulga/rest/v1/eleicao/ordinarias",
      classificacaoTse,
    ),
    checar(
      "brasilapi",
      "BrasilAPI",
      "CNPJ / Receita Federal (brasilapi.com.br)",
      "https://brasilapi.com.br/api/cnpj/v1/65640808000189",
      classificacaoPadraoOk,
    ),
    checar(
      "portal-transparencia",
      "Portal da Transparência",
      "Contratos, PEP, sanções (api.portaldatransparencia.gov.br)",
      "https://api.portaldatransparencia.gov.br/api-de-dados/pessoa-fisica?cpf=00000000000",
      classificacaoTransparencia,
      apiKey ? { headers: { "chave-api-dados": apiKey } } : undefined,
    ),
  ]);
}
