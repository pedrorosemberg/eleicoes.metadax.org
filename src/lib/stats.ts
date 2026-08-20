import { carregarTodosCandidatos } from "./data";

export interface EstatisticasCandidatos {
  totalCandidatos: number;
  isAmostra: boolean;
  porUf: Array<{ uf: string; total: number }>;
  porCargo: Array<{ cargo: string; total: number }>;
  porPartido: Array<{ sigla: string; total: number }>;
}

/**
 * Agregados públicos derivados do próprio dataset de candidatos — nunca
 * expõe dado individual (CPF, nome completo) aqui, só contagens. Ver
 * app/api/estatisticas/route.ts e app/mapa/page.tsx.
 */
export async function calcularEstatisticas(): Promise<EstatisticasCandidatos> {
  const { candidatos, isAmostra } = await carregarTodosCandidatos();

  const porUfMap = new Map<string, number>();
  const porCargoMap = new Map<string, number>();
  const porPartidoMap = new Map<string, number>();

  for (const c of candidatos) {
    porUfMap.set(c.uf, (porUfMap.get(c.uf) ?? 0) + 1);
    porCargoMap.set(c.cargo, (porCargoMap.get(c.cargo) ?? 0) + 1);
    porPartidoMap.set(c.partido.sigla, (porPartidoMap.get(c.partido.sigla) ?? 0) + 1);
  }

  const ordenarPorTotal = <T extends { total: number }>(itens: T[]) =>
    itens.sort((a, b) => b.total - a.total);

  return {
    totalCandidatos: candidatos.length,
    isAmostra,
    porUf: ordenarPorTotal([...porUfMap.entries()].map(([uf, total]) => ({ uf, total }))),
    porCargo: ordenarPorTotal([...porCargoMap.entries()].map(([cargo, total]) => ({ cargo, total }))),
    porPartido: ordenarPorTotal([...porPartidoMap.entries()].map(([sigla, total]) => ({ sigla, total }))),
  };
}
