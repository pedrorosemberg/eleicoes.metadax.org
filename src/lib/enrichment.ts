import "server-only";
import type {
  BrasilApiCnpjResponse,
  DivulgaCandDetalhe,
  ResumoBeneficiosSociais,
  ServidorPublicoFederal,
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
const TRANSPARENCIA_ALLOWLIST = [
  "peps",
  "contratos/cpf-cnpj",
  "ceis",
  "cnep",
  "cepim",
  "emendas",
  "bolsa-familia-disponivel-por-cpf-ou-nis",
  "servidores",
  "servidores/remuneracao",
] as const;

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
 * A chave de API está configurada e operacional em produção desde
 * 24/08/2026 (ver docs/ARCHITECTURE.md §5). Os nomes de campo usados em
 * `mapearContrato`/`mapearSancoes` vêm da documentação oficial da CGU;
 * qualquer divergência encontrada numa chamada real deve ser corrigida
 * aqui e registrada em docs/DATA_SOURCES.md.
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

const BENEFICIOS_MAX_PAGINAS = 50; // teto de segurança (~50 páginas cobre décadas de parcelas mensais)

/**
 * Consulta ao vivo, por CPF, das parcelas do Bolsa Família disponibilizadas
 * ao titular — endpoint `bolsa-familia-disponivel-por-cpf-ou-nis`, que
 * aceita CPF diretamente em `codigo` (não exige NIS). Este endpoint está
 * na faixa de limite de taxa mais restrita da CGU (180 requisições/min —
 * ver docs/DATA_SOURCES.md §4), por lidar com dado individual sensível de
 * benefício social; por isso só é chamado sob demanda (visita a um perfil),
 * nunca em lote.
 *
 * Retorna `null` quando a fonte está indisponível (sem chave, erro de rede),
 * e um resumo com `parcelas: []` quando a consulta funcionou mas não há
 * nenhuma parcela — são estados diferentes, tratados como tal na UI.
 *
 * Neutralidade: receber (ou não) Bolsa Família não é indicador de mérito
 * ou demérito de um candidato — é um dado de política pública, exibido
 * pelo mesmo motivo que qualquer outro repasse de recurso público a uma
 * pessoa física é auditável pela Lei de Acesso à Informação. Ver
 * docs/DATA_SOURCES.md §10.
 */
export async function buscarBeneficiosSociais(cpf: string): Promise<ResumoBeneficiosSociais | null> {
  const cpfLimpo = cpf.replace(/\D/g, "");
  if (cpfLimpo.length !== 11) return null;
  if (!process.env.PORTAL_TRANSPARENCIA_API_KEY) return null;

  const parcelas: ResumoBeneficiosSociais["parcelas"] = [];
  for (let pagina = 1; pagina <= BENEFICIOS_MAX_PAGINAS; pagina++) {
    const itens = await buscarTransparencia("bolsa-familia-disponivel-por-cpf-ou-nis", {
      codigo: cpfLimpo,
      pagina: String(pagina),
    });
    if (itens === null) {
      // Falha de rede/fonte na primeira página = indisponível; numa página
      // seguinte, é só o fim natural da paginação.
      if (pagina === 1) return null;
      break;
    }
    if (itens.length === 0) break;
    for (const item of itens) {
      const p = item as Record<string, unknown>;
      const municipio = p.municipio as Record<string, unknown> | undefined;
      const uf = municipio?.uf as Record<string, unknown> | undefined;
      parcelas.push({
        programa: "Bolsa Família",
        mesReferencia: String(p.dataMesReferencia ?? ""),
        mesCompetencia: String(p.dataMesCompetencia ?? ""),
        valor: Number(p.valor ?? 0),
        municipio: municipio?.nomeIBGE ? String(municipio.nomeIBGE) : undefined,
        uf: uf?.sigla ? String(uf.sigla) : undefined,
      });
    }
    if (itens.length < 10) break; // página parcial = última página
  }

  const referencias = parcelas.map((p) => p.mesReferencia).filter(Boolean).sort();
  return {
    parcelas,
    valorTotal: parcelas.reduce((soma, p) => soma + p.valor, 0),
    primeiroMesReferencia: referencias[0],
    ultimoMesReferencia: referencias[referencias.length - 1],
  };
}

/**
 * Consulta ao vivo, por CPF, se a pessoa é ou foi servidora do Poder
 * Executivo Federal (endpoint `servidores`) e, quando localizável, a
 * remuneração do mês mais recente disponível (endpoint
 * `servidores/remuneracao`, que exige um mês específico — tentamos os 3
 * meses mais recentes e ficamos com o primeiro que retornar dado). Não é
 * um histórico completo de remuneração, só um retrato do mês mais recente
 * encontrado — ver docs/DATA_SOURCES.md §4.
 *
 * Cobre apenas o Poder Executivo Federal (é o universo do próprio
 * endpoint da CGU): não informa sobre cargos estaduais, municipais, nem
 * dos poderes Legislativo/Judiciário.
 */
export async function buscarServidorPublico(cpf: string): Promise<ServidorPublicoFederal | null> {
  const cpfLimpo = cpf.replace(/\D/g, "");
  if (cpfLimpo.length !== 11) return null;
  if (!process.env.PORTAL_TRANSPARENCIA_API_KEY) return null;

  const itens = await buscarTransparencia("servidores", { cpf: cpfLimpo, pagina: "1" });
  if (itens === null) return null;
  if (itens.length === 0) return { situacao: "não encontrado", tipoServidor: "" };

  const registro = itens[0] as Record<string, unknown>;
  const servidor = registro.servidor as Record<string, unknown> | undefined;
  const lotacao = servidor?.orgaoServidorLotacao as Record<string, unknown> | undefined;
  const exercicio = servidor?.orgaoServidorExercicio as Record<string, unknown> | undefined;
  const funcao = servidor?.funcao as Record<string, unknown> | undefined;

  const resultado: ServidorPublicoFederal = {
    situacao: String(servidor?.situacao ?? "—"),
    tipoServidor: String(servidor?.tipoServidor ?? "—"),
    orgaoLotacao: lotacao?.nome ? String(lotacao.nome) : undefined,
    orgaoExercicio: exercicio?.nome ? String(exercicio.nome) : undefined,
    cargoOuFuncao: funcao?.nome ? String(funcao.nome) : undefined,
  };

  const hoje = new Date();
  for (let mesesAtras = 1; mesesAtras <= 3; mesesAtras++) {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - mesesAtras, 1);
    const mesAno = `${data.getFullYear()}${String(data.getMonth() + 1).padStart(2, "0")}`;
    const remuneracoes = await buscarTransparencia("servidores/remuneracao", { cpf: cpfLimpo, mesAno, pagina: "1" });
    if (remuneracoes && remuneracoes.length > 0) {
      // Formato real da CGU (schema ServidorRemuneracaoDTO): cada item traz
      // `remuneracoesDTO`, um array com o detalhe do mês — o total líquido
      // (`valorTotalRemuneracaoAposDeducoes`) é o número mais direto de
      // "quanto ganhou", já descontados impostos/previdência.
      const item = remuneracoes[0] as Record<string, unknown>;
      const detalhes = item.remuneracoesDTO as Array<Record<string, unknown>> | undefined;
      const detalhe = detalhes?.[0];
      const valor = Number(
        detalhe?.valorTotalRemuneracaoAposDeducoes ?? detalhe?.remuneracaoBasicaBruta ?? 0,
      );
      resultado.remuneracaoRecente = { mesAno, valor };
      break;
    }
  }

  return resultado;
}
