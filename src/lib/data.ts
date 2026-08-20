import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Bem, Candidato } from "@/types/candidato";
import { CANDIDATOS_AMOSTRA, BENS_AMOSTRA } from "./amostra";

export const ANO_ELEICAO = 2026;

export interface SnapshotMeta {
  ano: number;
  geradoEm: string;
  ufs: string[];
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

export async function carregarCandidatoPorId(
  sqCandidato: string,
): Promise<{ candidato: Candidato | null; isAmostra: boolean }> {
  // O índice completo é dividido por UF; sem um índice reverso persistido,
  // procuramos nas 27 UFs. Aceitável para o volume do dataset (ver
  // docs/ARCHITECTURE.md §4) — se a UF já for conhecida pela rota, prefira
  // carregarCandidatosPorUf diretamente.
  const { UFS } = await import("./ufs");
  for (const uf of UFS) {
    const { candidatos, isAmostra } = await carregarCandidatosPorUf(uf);
    const encontrado = candidatos.find((c) => c.sqCandidato === sqCandidato);
    if (encontrado) return { candidato: encontrado, isAmostra };
  }
  return { candidato: null, isAmostra: false };
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
