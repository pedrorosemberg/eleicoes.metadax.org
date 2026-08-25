import { NextResponse } from "next/server";
import { buscarEstatisticasRepositorio } from "@/lib/github";
import { buscarVisitantesSite } from "@/lib/site-analytics";

/**
 * Endpoint público com os números do projeto — estrelas/forks/issues do
 * repositório no GitHub e visitantes do site (Vercel Web Analytics, só
 * quando habilitado — ver src/lib/site-analytics.ts). Consumido pela seção
 * "Estatísticas do projeto" em /sobre; exposto também aqui como JSON para
 * quem quiser embutir os mesmos números em outro lugar.
 */
export async function GET() {
  const [repositorio, visitantes] = await Promise.all([
    buscarEstatisticasRepositorio(),
    buscarVisitantesSite(),
  ]);
  return NextResponse.json(
    { repositorio, visitantes, geradoEm: new Date().toISOString() },
    { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } },
  );
}
