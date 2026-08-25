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

/**
 * O nome do arquivo dentro do ZIP não é confiável para determinar o tipo real
 * do documento: ~350 dos 84 mil arquivos (confirmado em 25/08/2026, ver
 * docs/DATA_SOURCES.md §1) são fotos/scans em JPEG cujo nome ainda assim
 * termina em ".pdf" (resíduo de como o TSE reempacotou o upload do
 * candidato). Servir esses com Content-Type: application/pdf fixo fazia o
 * visualizador de PDF do navegador falhar silenciosamente — o link "não
 * aparecia" ao clicar. Em vez de confiar no nome, os bytes reais (magic
 * number) decidem o Content-Type.
 */
function detectarTipoConteudo(bytes: Uint8Array): { mime: string; extensao: string } {
  if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return { mime: "application/pdf", extensao: "pdf" };
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: "image/jpeg", extensao: "jpg" };
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { mime: "image/png", extensao: "png" };
  }
  return { mime: "application/octet-stream", extensao: "bin" };
}

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
    const bytes = new Uint8Array(await buscarBytesEntradaZip(indice.zipUrl, entrada.offset, entrada.tamanho));
    const { mime, extensao } = detectarTipoConteudo(bytes);
    const nomeBase = arquivo.replace(/\.(pdf|jpe?g|png)$/i, "");
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `inline; filename="certidao_${uf}_${candidato}_${nomeBase}.${extensao}"`,
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Falha ao buscar o documento no release do GitHub" }, { status: 502 });
  }
}
