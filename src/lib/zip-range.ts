/**
 * Leitura parcial de um ZIP remoto via HTTP Range, sem baixar o arquivo
 * inteiro. Usado para servir certidões criminais individuais direto dos
 * assets de release do GitHub (~9,5 GB no total — grande demais para
 * duplicar hospedagem numa branch do repositório, como foi feito para
 * fotos/planos de governo) sem precisar de nenhuma infraestrutura extra.
 *
 * Só funciona porque os ZIPs de certidões criminais do TSE usam o método
 * de compressão STORE (sem compactação) — confirmado contra os arquivos
 * reais em 25/08/2026 (`file` reporta "compression method=store" e todo
 * entry no central directory tem `compMethod=0`). Isso significa que os
 * bytes de um arquivo dentro do ZIP são idênticos aos bytes do arquivo
 * original — extrair um entry é só um recorte de bytes (range fetch), sem
 * precisar descompactar nada.
 *
 * Também confirmado contra os arquivos reais (25/08/2026): o campo de
 * "extra field" do header local de cada entry tem tamanho zero — por
 * isso o offset de início dos dados pode ser calculado só com o que já
 * vem no central directory (header_offset + 30 bytes fixos + tamanho do
 * nome do arquivo), sem precisar buscar o header local separadamente.
 * Ver docs/DATA_SOURCES.md §1 para os detalhes da validação.
 */

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_DIR_SIGNATURE = 0x02014b50;
const LOCAL_HEADER_FIXED_SIZE = 30;

export interface ZipEntryLocation {
  arquivo: string;
  offset: number;
  tamanho: number;
}

async function rangeGet(url: string, start: number, end: number): Promise<Buffer> {
  const res = await fetch(url, {
    headers: { Range: `bytes=${start}-${end}` },
    redirect: "follow",
  });
  if (res.status !== 206 && res.status !== 200) {
    throw new Error(`Range request falhou (${res.status}) para ${url}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function obterTamanhoTotal(url: string): Promise<number> {
  const res = await fetch(url, { headers: { Range: "bytes=0-0" }, redirect: "follow" });
  const contentRange = res.headers.get("content-range");
  await res.arrayBuffer();
  if (!contentRange) throw new Error(`Resposta sem Content-Range para ${url}`);
  const total = Number(contentRange.split("/")[1]);
  if (!Number.isFinite(total)) throw new Error(`Content-Range inválido: ${contentRange}`);
  return total;
}

function encontrarEOCD(buf: Buffer): number {
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIGNATURE) return i;
  }
  return -1;
}

/**
 * Baixa só o final do ZIP (End Of Central Directory) e o central directory
 * inteiro (tipicamente algumas dezenas/centenas de KB, mesmo para um ZIP
 * de centenas de MB) e retorna a localização exata (offset + tamanho) de
 * cada entry — pronto para um range fetch posterior de um arquivo
 * específico, sem nunca baixar o ZIP inteiro.
 */
export async function listarEntradasZipRemoto(zipUrl: string): Promise<ZipEntryLocation[]> {
  const tamanhoTotal = await obterTamanhoTotal(zipUrl);

  const tailStart = Math.max(0, tamanhoTotal - 65536);
  const tail = await rangeGet(zipUrl, tailStart, tamanhoTotal - 1);
  const eocdIdx = encontrarEOCD(tail);
  if (eocdIdx === -1) throw new Error(`EOCD não encontrado em ${zipUrl}`);

  const cdSize = tail.readUInt32LE(eocdIdx + 12);
  const cdOffset = tail.readUInt32LE(eocdIdx + 16);

  const cd = await rangeGet(zipUrl, cdOffset, cdOffset + cdSize - 1);

  const entradas: ZipEntryLocation[] = [];
  let p = 0;
  while (p < cd.length) {
    if (cd.readUInt32LE(p) !== CENTRAL_DIR_SIGNATURE) break;
    const compMethod = cd.readUInt16LE(p + 10);
    const compSize = cd.readUInt32LE(p + 20);
    const fnLen = cd.readUInt16LE(p + 28);
    const exLen = cd.readUInt16LE(p + 30);
    const cmLen = cd.readUInt16LE(p + 32);
    const headerOffset = cd.readUInt32LE(p + 42);
    const filename = cd.slice(p + 46, p + 46 + fnLen).toString("utf8");

    if (compMethod === 0) {
      const dataStart = headerOffset + LOCAL_HEADER_FIXED_SIZE + Buffer.byteLength(filename, "utf8");
      entradas.push({ arquivo: filename, offset: dataStart, tamanho: compSize });
    }
    // Entries com compMethod !== 0 (comprimidos) são ignoradas — não
    // acontece nos ZIPs de certidões criminais (todos STORE), mas fica
    // documentado aqui como limitação explícita desta função.

    p += 46 + fnLen + exLen + cmLen;
  }
  return entradas;
}

/** Busca os bytes exatos de um entry já indexado (offset + tamanho conhecidos). */
export async function buscarBytesEntradaZip(
  zipUrl: string,
  offset: number,
  tamanho: number,
): Promise<Buffer> {
  return rangeGet(zipUrl, offset, offset + tamanho - 1);
}
