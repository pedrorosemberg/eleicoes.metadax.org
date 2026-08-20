import "server-only";
import type {
  BrasilApiCnpjResponse,
  DivulgaCandDetalhe,
  TransparenciaResumo,
} from "@/types/candidato";

/**
 * Funções de enriquecimento sob demanda. Usadas tanto pelos Server
 * Components (para HTML já preenchido no primeiro request — bom para
 * SEO/AEO/GEO) quanto pelos route handlers em app/api/* (para consumidores
 * externos/client components). Ver docs/ARCHITECTURE.md §5.
 */

const CNPJ_CACHE_TTL = 60 * 60 * 24 * 7; // 7 dias — CNPJ muda raramente
const TRANSPARENCIA_CACHE_TTL = 60 * 60; // 1 hora
const DIVULGACAND_CACHE_TTL = 60 * 60 * 6; // 6 horas

export async function buscarDadosCnpj(cnpj: string): Promise<BrasilApiCnpjResponse | null> {
  const limpo = cnpj.replace(/\D/g, "");
  if (limpo.length !== 14) return null;
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${limpo}`, {
      next: { revalidate: CNPJ_CACHE_TTL },
    });
    if (!res.ok) return null;
    return (await res.json()) as BrasilApiCnpjResponse;
  } catch {
    return null;
  }
}

export async function buscarDetalheDivulgaCand(params: {
  ano: number;
  municipio: string;
  eleicao: string;
  candidato: string;
}): Promise<DivulgaCandDetalhe | null> {
  const { ano, municipio, eleicao, candidato } = params;
  try {
    const res = await fetch(
      `https://divulgacandcontas.tse.jus.br/divulga/rest/v1/candidatura/buscar/${ano}/${municipio}/${eleicao}/candidato/${candidato}`,
      { next: { revalidate: DIVULGACAND_CACHE_TTL } },
    );
    if (!res.ok) return null;
    return (await res.json()) as DivulgaCandDetalhe;
  } catch {
    // Esperado falhar a partir de redes bloqueadas pelo edge do TSE —
    // ver docs/DATA_SOURCES.md §5. Degrada graciosamente: a página não
    // deve quebrar por causa deste enriquecimento opcional.
    return null;
  }
}

const TRANSPARENCIA_BASE = "https://api.portaldatransparencia.gov.br/api-de-dados";
const TRANSPARENCIA_ALLOWLIST = ["peps", "contratos/cpf-cnpj", "ceis", "cnep", "cepim", "emendas"] as const;

export async function buscarTransparencia(
  tipo: (typeof TRANSPARENCIA_ALLOWLIST)[number],
  query: Record<string, string>,
): Promise<TransparenciaResumo | null> {
  const apiKey = process.env.PORTAL_TRANSPARENCIA_API_KEY;
  if (!apiKey) {
    // Chave não configurada — ver docs/DATA_SOURCES.md §4 (passo a passo de cadastro).
    return null;
  }
  if (!TRANSPARENCIA_ALLOWLIST.includes(tipo)) return null;

  const qs = new URLSearchParams({ pagina: "1", ...query }).toString();
  try {
    const res = await fetch(`${TRANSPARENCIA_BASE}/${tipo}?${qs}`, {
      headers: { "chave-api-dados": apiKey },
      next: { revalidate: TRANSPARENCIA_CACHE_TTL },
    });
    if (!res.ok) return null;
    return (await res.json()) as TransparenciaResumo;
  } catch {
    return null;
  }
}
