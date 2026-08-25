import { NextResponse } from "next/server";
import { carregarIndiceCertidoesPorUf } from "@/lib/data";
import { buscarBytesEntradaZip } from "@/lib/zip-range";

/**
 * Serve uma certidão criminal individual sob demanda, direto do ZIP oficial
 * da UF publicado em release do GitHub — sem duplicar os ~9,5 GB do dataset
 * em nenhuma outra hospedagem. Ver src/lib/zip-range.ts e
 * scripts/ingest-certidoes.ts para como o índice (offset + tamanho de cada
 * documento) é construído, e docs/DATA_SOURCES.md §1 para o racional
 * completo dessa decisão de arquitetura.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ uf: string; candidato: string; arquivo: string }> },
) {
  const { uf, candidato, arquivo } = await params;

  const indice = await carregarIndiceCertidoesPorUf(uf.toUpperCase());
  if (!indice) {
    return NextResponse.json({ error: "Certidões não indexadas para esta UF" }, { status: 404 });
  }

  const entradas = indice.porCandidato[candidato];
  const entrada = entradas?.find((e) => e.arquivo === arquivo);
  if (!entrada) {
    return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
  }

  try {
    const bytes = await buscarBytesEntradaZip(indice.zipUrl, entrada.offset, entrada.tamanho);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="certidao_${uf}_${candidato}_${arquivo}.pdf"`,
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Falha ao buscar o documento no release do GitHub" }, { status: 502 });
  }
}
