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

/**
 * Consulta ao vivo, por CPF, das parcelas do Bolsa Família disponibilizadas
 * ao titular — endpoint `bolsa-familia-disponivel-por-cpf-ou-nis`, que
 * aceita CPF diretamente em `codigo` (não exige NIS). Este endpoint está
 * na faixa de limite de taxa mais restrita da CGU (180 requisições/min —
 * ver docs/DATA_SOURCES.md §4), por lidar com dado individual sensível de
 * benefício social; por isso só é chamado sob demanda (visita a um perfil,
 * 12 requisições em paralelo), nunca em lote.
 *
 * `anoMesReferencia` OU `anoMesCompetencia` é obrigatório em toda chamada —
 * confirmado contra a API real em 25/08/2026 (omitir os dois retorna 400
 * "Informe ano e mês de competência ou de referência"; o swagger marca os
 * dois como individualmente opcionais, o que é enganoso). Não existe uma
 * chamada de "histórico completo" — por isso a janela é fixa nos últimos
 * 12 meses, igual para todo candidato, e isso é dito explicitamente no
 * texto de fonte exibido na UI (não fica implícito).
 *
 * Retorna `null` quando a fonte está indisponível (sem chave, erro de rede
 * em todos os 12 meses), e um resumo com `parcelas: []` quando a consulta
 * funcionou mas não há nenhuma parcela — são estados diferentes, tratados
 * como tal na UI.
 *
 * Neutralidade: receber (ou não) Bolsa Família não é indicador de mérito
 * ou demérito de um candidato — é um dado de política pública, exibido
 * pelo mesmo motivo que qualquer outro repasse de recurso público a uma
 * pessoa física é auditável pela Lei de Acesso à Informação. Ver
 * docs/DATA_SOURCES.md §10.
 */
const BENEFICIOS_MESES_JANELA = 12; // últimos 12 meses — ver nota abaixo sobre o motivo do recorte

export async function buscarBeneficiosSociais(cpf: string): Promise<ResumoBeneficiosSociais | null> {
  const cpfLimpo = cpf.replace(/\D/g, "");
  if (cpfLimpo.length !== 11) return null;
  if (!process.env.PORTAL_TRANSPARENCIA_API_KEY) return null;

  // O endpoint exige `anoMesReferencia` OU `anoMesCompetencia` em toda
  // chamada (testado contra a API real em 25/08/2026: omitir os dois
  // retorna 400 "Informe ano e mês de competência ou de referência" — o
  // swagger marca os dois como individualmente opcionais, mas na prática
  // pelo menos um é obrigatório). Não existe "todo o histórico" num único
  // request — por isso a consulta é por mês, em paralelo, numa janela
  // fixa dos últimos 12 meses (mesma janela para todo candidato).
  const hoje = new Date();
  const mesesAno = Array.from({ length: BENEFICIOS_MESES_JANELA }, (_, i) => {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    return `${data.getFullYear()}${String(data.getMonth() + 1).padStart(2, "0")}`;
  });

  const resultadosPorMes = await Promise.all(
    mesesAno.map((anoMesReferencia) =>
      buscarTransparencia("bolsa-familia-disponivel-por-cpf-ou-nis", {
        codigo: cpfLimpo,
        anoMesReferencia,
        pagina: "1",
      }),
    ),
  );

  // Se todo mês falhou (não só "sem parcela"), é mais honesto reportar
  // indisponível do que um resumo zerado.
  if (resultadosPorMes.every((r) => r === null)) return null;

  const parcelas: ResumoBeneficiosSociais["parcelas"] = [];
  for (const itens of resultadosPorMes) {
    for (const item of itens ?? []) {
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
 * `servidores/remuneracao` da CGU devolve valores monetários como string
 * no formato brasileiro (ex.: `"18.290,81"`, ponto como separador de
 * milhar e vírgula como decimal) — confirmado contra a API real em
 * 25/08/2026, onde `Number("18.290,81")` vira `NaN`. Os outros endpoints
 * usados neste arquivo devolvem número nativo; só este precisa da
 * conversão.
 */
function parseValorMonetarioBR(valor: unknown): number {
  if (typeof valor === "number") return valor;
  if (typeof valor !== "string") return 0;
  const normalizado = valor.replace(/\./g, "").replace(",", ".").trim();
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : 0;
}

/**
 * Consulta ao vivo, por CPF, se a pessoa é ou foi servidora do Poder
 * Executivo Federal (endpoint `servidores`) e, quando localizável, a
 * remuneração do mês mais recente disponível (endpoint
 * `servidores/remuneracao`, que exige um mês específico — tentamos os 6
 * meses mais recentes, voltando no tempo, e ficamos com o primeiro que
 * tiver o detalhe do mês (`remuneracoesDTO`) de fato preenchido — a folha
 * de um mês recente pode ainda não ter sido publicada). Não é um
 * histórico completo de remuneração, só um retrato do mês mais recente
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
  for (let mesesAtras = 1; mesesAtras <= 6; mesesAtras++) {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - mesesAtras, 1);
    const mesAno = `${data.getFullYear()}${String(data.getMonth() + 1).padStart(2, "0")}`;
    const remuneracoes = await buscarTransparencia("servidores/remuneracao", { cpf: cpfLimpo, mesAno, pagina: "1" });
    if (remuneracoes === null) continue; // falha nesse mês específico — tenta o anterior

    // Formato real da CGU (schema ServidorRemuneracaoDTO, confirmado
    // contra a API em 25/08/2026): o array externo sempre tem 1 item
    // quando o CPF é encontrado, mas o detalhe do mês (`remuneracoesDTO`)
    // pode vir vazio quando a folha daquele mês ainda não foi publicada
    // — checar o array externo sozinho (sempre length 1) fazia o código
    // "achar" um resultado vazio e parar de procurar em meses anteriores.
    const item = remuneracoes[0] as Record<string, unknown> | undefined;
    const detalhes = item?.remuneracoesDTO as Array<Record<string, unknown>> | undefined;
    const detalhe = detalhes?.[0];
    if (!detalhe) continue;

    const valor = parseValorMonetarioBR(
      detalhe.valorTotalRemuneracaoAposDeducoes ?? detalhe.remuneracaoBasicaBruta,
    );
    resultado.remuneracaoRecente = { mesAno, valor };
    break;
  }

  return resultado;
}
