import { NextResponse } from "next/server";
import { buscarDetalheDivulgaCand } from "@/lib/enrichment";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ ano: string; municipio: string; eleicao: string; candidato: string }>;
  },
) {
  const { ano, municipio, eleicao, candidato } = await params;
  const detalhe = await buscarDetalheDivulgaCand({
    ano: Number(ano),
    municipio,
    eleicao,
    candidato,
  });
  if (!detalhe) {
    // Pode ser "não encontrado" ou o bloqueio de rede documentado em
    // docs/DATA_SOURCES.md §5 — o cliente deve tratar os dois como
    // "enriquecimento indisponível", nunca como erro fatal.
    return NextResponse.json({ error: "Dados adicionais indisponíveis" }, { status: 404 });
  }
  return NextResponse.json(detalhe, {
    headers: { "Cache-Control": "public, max-age=21600, stale-while-revalidate=3600" },
  });
}
