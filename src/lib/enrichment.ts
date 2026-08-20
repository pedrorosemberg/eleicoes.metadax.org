import "server-only";
import type {
  BrasilApiCnpjResponse,
  DivulgaCandDetalhe,
  TransparenciaResumo,
} from "@/types/candidato";
import { USER_AGENT } from "./http";

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
      headers: { "User-Agent": USER_AGENT },
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
      { headers: { "User-Agent": USER_AGENT }, next: { revalidate: DIVULGACAND_CACHE_TTL } },
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

/**
 * Fetch genérico de um endpoint do Portal da Transparência — retorna o
 * array bruto (todos os endpoints usados aqui são paginados por lista),
 * sem tentar moldar num formato específico. `buscarResumoTransparencia`
 * abaixo é quem agrega múltiplos endpoints num resumo coerente.
 */
export async function buscarTransparencia(
  tipo: (typeof TRANSPARENCIA_ALLOWLIST)[number],
  query: Record<string, string>,
): Promise<unknown[] | null> {
  const apiKey = process.env.PORTAL_TRANSPARENCIA_API_KEY;
  if (!apiKey) {
    // Chave não configurada — ver docs/DATA_SOURCES.md §4 (passo a passo de cadastro).
    return null;
  }
  if (!TRANSPARENCIA_ALLOWLIST.includes(tipo)) return null;

  const qs = new URLSearchParams({ pagina: "1", ...query }).toString();
  try {
    const res = await fetch(`${TRANSPARENCIA_BASE}/${tipo}?${qs}`, {
      headers: { "chave-api-dados": apiKey, "User-Agent": USER_AGENT },
      next: { revalidate: TRANSPARENCIA_CACHE_TTL },
    });
    if (!res.ok) return null;
    const dados = await res.json();
    return Array.isArray(dados) ? dados : null;
  } catch {
    return null;
  }
}

/**
 * Agrega PEP + contratos + sanções (CEIS/CNEP/CEPIM) de uma pessoa física
 * num resumo único — ver docs/DATA_SOURCES.md §4 para os parâmetros
 * confirmados de cada endpoint (`cpf` para peps, `cpfCnpj` para
 * contratos, `codigoSancionado` para as três bases de sanção).
 *
 * Sem chave de API configurada, retorna `null` (nunca um objeto "vazio"
 * que pareça um resultado real de "nada encontrado" — são estados
 * diferentes). Cada sub-chamada falha de forma independente: se uma
 * base estiver fora do ar, as outras ainda aparecem.
 *
 * Nomes de campo dentro de cada item retornado pelo Portal da
 * Transparência NÃO foram confirmados contra uma resposta real (sem
 * chave de API disponível nesta sessão para testar) — `mapearContrato`/
 * `mapearSancao` abaixo assumem os nomes documentados publicamente pela
 * CGU; confira e ajuste na primeira chamada real.
 */
export async function buscarResumoTransparencia(cpf: string): Promise<TransparenciaResumo | null> {
  const cpfLimpo = cpf.replace(/\D/g, "");
  if (cpfLimpo.length !== 11) return null;
  if (!process.env.PORTAL_TRANSPARENCIA_API_KEY) return null;

  const [peps, contratos, ceis, cnep, cepim] = await Promise.all([
    buscarTransparencia("peps", { cpf: cpfLimpo }),
    buscarTransparencia("contratos/cpf-cnpj", { cpfCnpj: cpfLimpo }),
    buscarTransparencia("ceis", { codigoSancionado: cpfLimpo }),
    buscarTransparencia("cnep", { codigoSancionado: cpfLimpo }),
    buscarTransparencia("cepim", { codigoSancionado: cpfLimpo }),
  ]);

  // Se TODAS as sub-chamadas falharam (ex.: rede fora, não só "sem resultado"),
  // é mais honesto reportar indisponível do que um resumo zerado.
  if (peps === null && contratos === null && ceis === null && cnep === null && cepim === null) {
    return null;
  }

  const mapearContrato = (item: unknown): TransparenciaResumo["contratos"][number] => {
    const c = item as Record<string, unknown>;
    return {
      numero: String(c.numero ?? c.numeroContrato ?? "—"),
      objeto: String(c.objeto ?? c.objetoContrato ?? "—"),
      valorInicial: Number(c.valorInicial ?? c.valorInicialCompra ?? 0),
      dataAssinatura: String(c.dataAssinatura ?? c.dataInicioVigencia ?? ""),
      orgao: String(
        (c.unidadeGestora as Record<string, unknown> | undefined)?.nomeOrgao ?? c.orgao ?? "—",
      ),
    };
  };

  const mapearSancoes = (
    itens: unknown[] | null,
    tipo: "CEIS" | "CNEP" | "CEPIM",
  ): TransparenciaResumo["sancoes"] =>
    (itens ?? []).map((item) => {
      const s = item as Record<string, unknown>;
      return {
        tipo,
        orgaoSancionador: String(s.orgaoSancionador ?? s.nomeOrgaoSancionador ?? "—"),
        data: String(s.dataInicioSancao ?? s.data ?? ""),
      };
    });

  return {
    pep: (peps?.length ?? 0) > 0,
    contratos: (contratos ?? []).map(mapearContrato),
    sancoes: [
      ...mapearSancoes(ceis, "CEIS"),
      ...mapearSancoes(cnep, "CNEP"),
      ...mapearSancoes(cepim, "CEPIM"),
    ],
  };
}
