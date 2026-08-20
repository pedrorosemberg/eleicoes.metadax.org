import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Bem, Candidato } from "@/types/candidato";
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
 * Lê o snapshot estático gerado por scripts/ingest-tse.ts (ver
 * docs/ARCHITECTURE.md §4). Roda em Server Components — nunca no client.
 *
 * Enquanto a ingestão real não roda (depende de uma rede que o TSE não
 * bloqueia — ver docs/DATA_SOURCES.md §5), cai para um fixture de
 * exemplo, sinalizado por `isAmostra` e nunca confundível com dado oficial.
 */
export async function carregarCandidatosPorUf(
  uf: string,
): Promise<{ candidatos: Candidato[]; isAmostra: boolean }> {
  const candidatos = await lerJsonOuNulo<Candidato[]>(
    `${ANO_ELEICAO}/candidatos/${uf}.json`,
  );
  if (candidatos) return { candidatos, isAmostra: false };
  return {
    candidatos: CANDIDATOS_AMOSTRA.filter((c) => c.uf === uf),
    isAmostra: true,
  };
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
export async function carregarTodosCandidatos(): Promise<{
  candidatos: Candidato[];
  isAmostra: boolean;
}> {
  const resultados = await Promise.all([...UFS, "BR"].map((uf) => carregarCandidatosPorUf(uf)));
  return {
    candidatos: resultados.flatMap((r) => r.candidatos),
    isAmostra: resultados.some((r) => r.isAmostra),
  };
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

  const termo = q ? normalizar(q) : null;
  const cidadeNorm = cidade ? normalizar(cidade) : null;
  const partidoNorm = partido ? normalizar(partido) : null;

  const candidatos = base.filter((c) => {
    if (termo) {
      const combina =
        normalizar(c.nomeUrna).includes(termo) ||
        normalizar(c.nomeCompleto).includes(termo) ||
        c.numero.includes(termo) ||
        c.sqCandidato === q;
      if (!combina) return false;
    }
    if (cidadeNorm && !normalizar(c.municipio).includes(cidadeNorm)) return false;
    if (cargo && c.cargo !== cargo) return false;
    if (
      partidoNorm &&
      !normalizar(c.partido.sigla).includes(partidoNorm) &&
      !normalizar(c.partido.nome).includes(partidoNorm)
    ) {
      return false;
    }
    return true;
  });

  return { candidatos, isAmostra };
}

export async function carregarBensPorUf(
  uf: string,
): Promise<{ bens: Bem[]; isAmostra: boolean }> {
  const bens = await lerJsonOuNulo<Bem[]>(`${ANO_ELEICAO}/bens/${uf}.json`);
  if (bens) return { bens, isAmostra: false };
  return { bens: BENS_AMOSTRA, isAmostra: true };
}

export async function carregarMeta(): Promise<SnapshotMeta | null> {
  return lerJsonOuNulo<SnapshotMeta>(`${ANO_ELEICAO}/meta.json`);
}
