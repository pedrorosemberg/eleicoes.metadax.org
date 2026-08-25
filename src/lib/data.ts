import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  Bem,
  Candidato,
  Coligacao,
  DespesaCampanha,
  MotivoCassacao,
  ReceitaCampanha,
  RedeSocial,
  Vaga,
} from "@/types/candidato";
import { CANDIDATOS_AMOSTRA, BENS_AMOSTRA } from "./amostra";
import { UFS } from "./ufs";

export const ANO_ELEICAO = 2026;

export interface SnapshotMeta {
  ano: number;
  geradoEm: string;
  ufs: string[];
}

export interface FiltrosBusca {
  /** Busca direta: nome (completo ou de urna), número ou sqCandidato — combinados com OR. */
  q?: string;
  /** Busca indireta — combinados com AND entre si. */
  uf?: string;
  cidade?: string;
  cargo?: string;
  partido?: string;
}

const DATA_DIR = path.join(process.cwd(), "data");

async function lerJsonOuNulo<T>(relativePath: string): Promise<T | null> {
  try {
    const raw = await readFile(path.join(DATA_DIR, relativePath), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Cache em memória do processo para os arquivos de `data/` — todos
 * estáticos dentro de um mesmo deploy (só mudam quando uma nova
 * ingestão roda e gera um novo deploy, ver docs/ARCHITECTURE.md §4).
 * Achado real no teste de carga de 26/08/2026: sem isso, cada visita à
 * página de um candidato relia (sem cache) os arquivos de bens, finanças,
 * redes sociais e certidões da UF inteira do zero — sob concorrência,
 * multiplica I/O e JSON.parse desnecessariamente. Guarda a Promise (não
 * só o resultado) para que requisições concorrentes durante um cold
 * start aguardem a mesma leitura em vez de cada uma abrir o arquivo.
 */
const cacheArquivosJson = new Map<string, Promise<unknown>>();

function lerJsonCacheado<T>(relativePath: string): Promise<T | null> {
  let promessa = cacheArquivosJson.get(relativePath);
  if (!promessa) {
    promessa = lerJsonOuNulo<T>(relativePath);
    cacheArquivosJson.set(relativePath, promessa);
  }
  return promessa as Promise<T | null>;
}

/**
 * Lê o snapshot estático gerado por scripts/ingest-tse.ts (ver
 * docs/ARCHITECTURE.md §4). Roda em Server Components — nunca no client.
 *
 * Enquanto a ingestão real não roda (depende de uma rede que o TSE não
 * bloqueia — ver docs/DATA_SOURCES.md §5), cai para um fixture de
 * exemplo, sinalizado por `isAmostra` e nunca confundível com dado oficial.
 *
 * Cacheado em memória do processo por UF (mesmo padrão de
 * `carregarColigacoes` abaixo) — achado real no teste de carga de
 * 26/08/2026: sem cache, cada request de /buscar ou /candidato/[id]
 * relia todos os 28 arquivos de UF do zero (via carregarTodosCandidatos),
 * e sob concorrência isso saturava o event loop único do Node a ponto de
 * travar o processo inteiro por minutos, mesmo para requests não
 * relacionados. Guarda a Promise (não só o resultado resolvido) para que
 * requests concorrentes durante um cold start aguardem a mesma leitura em
 * vez de cada uma disparar 28 leituras de arquivo independentes.
 */
const cacheCandidatosPorUf = new Map<
  string,
  Promise<{ candidatos: Candidato[]; isAmostra: boolean }>
>();

export function carregarCandidatosPorUf(
  uf: string,
): Promise<{ candidatos: Candidato[]; isAmostra: boolean }> {
  let promessa = cacheCandidatosPorUf.get(uf);
  if (!promessa) {
    promessa = (async () => {
      const candidatos = await lerJsonOuNulo<Candidato[]>(
        `${ANO_ELEICAO}/candidatos/${uf}.json`,
      );
      if (candidatos) return { candidatos, isAmostra: false };
      return {
        candidatos: CANDIDATOS_AMOSTRA.filter((c) => c.uf === uf),
        isAmostra: true,
      };
    })();
    cacheCandidatosPorUf.set(uf, promessa);
  }
  return promessa;
}

/**
 * Lê as 27 UFs + "BR" em paralelo. "BR" é a unidade eleitoral que o TSE
 * usa para presidente/vice-presidente (candidatura nacional, sem UF) —
 * confirmado presente em `data/{ano}/candidatos/BR.json` quando a
 * ingestão real roda; sem essa entrada, candidatos à presidência ficam
 * invisíveis tanto na busca direta quanto na página de detalhe.
 * Usado pela busca direta (nome/número/ID não tem como saber a UF de
 * antemão) e para derivar listas de cidade/partido disponíveis nos
 * filtros. Para o volume atual do dataset (JSON estático por UF), ler
 * tudo em paralelo é aceitável — ver docs/ARCHITECTURE.md §4; revisar se
 * o dataset crescer a ponto de justificar um índice único.
 */
// Cacheia também o `.flatMap()` em si — sem isso, cada chamada monta um
// array novo mesmo com as 28 UFs individuais já cacheadas, o que
// impediria o índice de nomes normalizados (WeakMap abaixo) de nunca
// bater cache na busca direta (sem UF), exatamente o caso que travou o
// processo no teste de carga.
let cacheTodosCandidatos: Promise<{ candidatos: Candidato[]; isAmostra: boolean }> | null = null;

export function carregarTodosCandidatos(): Promise<{
  candidatos: Candidato[];
  isAmostra: boolean;
}> {
  if (!cacheTodosCandidatos) {
    cacheTodosCandidatos = (async () => {
      const resultados = await Promise.all([...UFS, "BR"].map((uf) => carregarCandidatosPorUf(uf)));
      return {
        candidatos: resultados.flatMap((r) => r.candidatos),
        isAmostra: resultados.some((r) => r.isAmostra),
      };
    })();
  }
  return cacheTodosCandidatos;
}

export async function carregarCandidatoPorId(
  sqCandidato: string,
): Promise<{ candidato: Candidato | null; isAmostra: boolean }> {
  const { candidatos, isAmostra } = await carregarTodosCandidatos();
  return { candidato: candidatos.find((c) => c.sqCandidato === sqCandidato) ?? null, isAmostra };
}

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos (diacríticos combinantes)
    .toLowerCase()
    .trim();
}

interface CamposNormalizados {
  nomeUrna: string;
  nomeCompleto: string;
  municipio: string;
  partidoSigla: string;
  partidoNome: string;
}

/**
 * `normalizar()` (NFD + regex + toLowerCase) não é barato — rodar em 5
 * campos × ~20 mil candidatos a cada busca era a segunda metade do
 * travamento sob carga encontrado em 26/08/2026 (a primeira era a
 * releitura de arquivo, resolvida acima). Calculado uma vez por array de
 * candidatos (a mesma referência de array, graças ao cache de
 * carregarCandidatosPorUf/carregarTodosCandidatos acima) e reaproveitado
 * — WeakMap para nunca reter memória além do necessário.
 */
const cacheIndiceNormalizado = new WeakMap<Candidato[], CamposNormalizados[]>();

function obterIndiceNormalizado(candidatos: Candidato[]): CamposNormalizados[] {
  let indice = cacheIndiceNormalizado.get(candidatos);
  if (!indice) {
    indice = candidatos.map((c) => ({
      nomeUrna: normalizar(c.nomeUrna),
      nomeCompleto: normalizar(c.nomeCompleto),
      municipio: normalizar(c.municipio),
      partidoSigla: normalizar(c.partido.sigla),
      partidoNome: normalizar(c.partido.nome),
    }));
    cacheIndiceNormalizado.set(candidatos, indice);
  }
  return indice;
}

/**
 * Busca direta (nome/número/ID) e indireta (UF/cidade/cargo/partido),
 * combináveis — ver docs/ARCHITECTURE.md §7. `q` é OR entre os três
 * campos; os filtros indiretos são AND entre si e com `q`.
 */
export async function buscarCandidatos(
  filtros: FiltrosBusca,
): Promise<{ candidatos: Candidato[]; isAmostra: boolean }> {
  const { q, uf, cidade, cargo, partido } = filtros;

  const { candidatos: base, isAmostra } = uf
    ? await carregarCandidatosPorUf(uf)
    : await carregarTodosCandidatos();

  const indice = obterIndiceNormalizado(base);

  const termo = q ? normalizar(q) : null;
  const cidadeNorm = cidade ? normalizar(cidade) : null;
  const partidoNorm = partido ? normalizar(partido) : null;

  const candidatos = base.filter((c, i) => {
    // Seguro: `indice` é sempre derivado de `base` via .map(), mesmo tamanho e ordem.
    const norm = indice[i]!;
    if (termo) {
      const combina =
        norm.nomeUrna.includes(termo) ||
        norm.nomeCompleto.includes(termo) ||
        c.numero.includes(termo) ||
        c.sqCandidato === q;
      if (!combina) return false;
    }
    if (cidadeNorm && !norm.municipio.includes(cidadeNorm)) return false;
    if (cargo && c.cargo !== cargo) return false;
    if (partidoNorm && !norm.partidoSigla.includes(partidoNorm) && !norm.partidoNome.includes(partidoNorm)) {
      return false;
    }
    return true;
  });

  return { candidatos, isAmostra };
}

export async function carregarBensPorUf(
  uf: string,
): Promise<{ bens: Bem[]; isAmostra: boolean }> {
  const bens = await lerJsonCacheado<Bem[]>(`${ANO_ELEICAO}/bens/${uf}.json`);
  if (bens) return { bens, isAmostra: false };
  return { bens: BENS_AMOSTRA, isAmostra: true };
}

export async function carregarMeta(): Promise<SnapshotMeta | null> {
  return lerJsonCacheado<SnapshotMeta>(`${ANO_ELEICAO}/meta.json`);
}

/**
 * Datasets abaixo (redes sociais, motivo de cassação, coligações, vagas)
 * não têm fixture de amostra — não existe "dado de exemplo" plausível
 * para eles, então simplesmente retornam vazio quando a ingestão real
 * ainda não rodou, sem flag `isAmostra` (não há amostra para sinalizar).
 * Ver scripts/ingest-tse.ts e docs/DATA_SOURCES.md §1.
 */

export async function carregarRedesSociaisPorUf(uf: string): Promise<RedeSocial[]> {
  return (await lerJsonCacheado<RedeSocial[]>(`${ANO_ELEICAO}/redes-sociais/${uf}.json`)) ?? [];
}

export async function carregarMotivosCassacaoPorUf(uf: string): Promise<MotivoCassacao[]> {
  return (await lerJsonCacheado<MotivoCassacao[]>(`${ANO_ELEICAO}/motivos-cassacao/${uf}.json`)) ?? [];
}

/** Lista única (não por UF) — ver ingestColigacoes em scripts/ingest-tse.ts. */
export async function carregarColigacoes(): Promise<Coligacao[]> {
  return (await lerJsonCacheado<Coligacao[]>(`${ANO_ELEICAO}/coligacoes.json`)) ?? [];
}

export async function carregarVagas(): Promise<Vaga[]> {
  return (await lerJsonCacheado<Vaga[]>(`${ANO_ELEICAO}/vagas.json`)) ?? [];
}

export interface FinancasCandidatosUf {
  receitas: ReceitaCampanha[];
  despesas: DespesaCampanha[];
}

/** Origem: `prestacao_de_contas_eleitorais_candidatos` do TSE — ver scripts/ingest-tse.ts. */
export async function carregarFinancasPorUf(uf: string): Promise<FinancasCandidatosUf> {
  return (
    (await lerJsonCacheado<FinancasCandidatosUf>(`${ANO_ELEICAO}/financas/${uf}.json`)) ?? {
      receitas: [],
      despesas: [],
    }
  );
}

export interface IndiceCertidoesUf {
  uf: string;
  zipUrl: string;
  atualizadoEm: string;
  porCandidato: Record<string, Array<{ arquivo: string; offset: number; tamanho: number }>>;
}

/**
 * Índice de certidões criminais por UF — gerado por scripts/ingest-certidoes.ts.
 * `null` (não `{}`) quando o arquivo de índice não existe para essa UF, para
 * distinguir "UF sem certidão indexada ainda" (ex.: ZIP de origem corrompido
 * no release, ver docs/DATA_SOURCES.md §1) de "UF indexada, candidato sem
 * documento" — dois motivos diferentes que a UI precisa relatar diferente.
 */
export async function carregarIndiceCertidoesPorUf(uf: string): Promise<IndiceCertidoesUf | null> {
  return lerJsonCacheado<IndiceCertidoesUf>(`${ANO_ELEICAO}/certidoes/${uf}.json`);
}
