/**
 * Indexa as certidões criminais dos candidatos — dataset `certidao_criminal`
 * do TSE, publicado como release do GitHub em
 * https://github.com/pedrorosemberg/eleicoes.metadax.org/releases/tag/arquivos_de_certidoes_criminais
 * (28 ZIPs, um por UF + BR, ~9,5 GB no total — confirmado em 25/08/2026).
 *
 * Diferente dos outros datasets, este script NÃO baixa os ZIPs inteiros
 * quando não precisa: eles são grandes demais (até 1,6 GB cada) para
 * duplicar em qualquer lugar sem custo real de infraestrutura. O caminho
 * normal lê só o central directory de cada ZIP remoto (alguns KB, via
 * HTTP Range — ver src/lib/zip-range.ts#listarEntradasZipRemoto) e grava
 * um índice leve com o offset e tamanho exatos de cada certidão dentro do
 * ZIP original. A leitura de cada arquivo em si acontece sob demanda,
 * direto do release do GitHub, via
 * app/api/certidao/[uf]/[candidato]/[arquivo]/route.ts — nenhum PDF é
 * duplicado ou re-hospedado.
 *
 * 6 das 28 UFs (BA, MG, PR, RJ, SC, SP) tiveram o upload para o release
 * interrompido — falta o central directory no final do arquivo, mas o
 * conteúdo em si (todos os documentos, exceto o último, que fica
 * truncado pela metade) está intacto. Para essas, o script baixa o ZIP
 * inteiro uma única vez (necessário para varrer sequencialmente, já que
 * não há central directory para ler via Range) e usa
 * zip-range.ts#recuperarEntradasZipLocal para reconstruir o índice —
 * depois descarta o arquivo local. Os offsets calculados continuam
 * válidos contra o arquivo hospedado no GitHub, então o serving continua
 * via Range GET, sem duplicar hospedagem.
 *
 * Nome de arquivo dentro do ZIP: o leiame.pdf oficial do TSE (incluído em
 * cada ZIP, também obtido diretamente do usuário em 25/08/2026) descreve
 * o padrão `{ano}{UF}{sqCandidato}_{sqArquivoDocumento}.{ext}`, com
 * sqArquivoDocumento puramente numérico. **Na prática, os arquivos reais
 * nem sempre seguem isso à risca** — muitos têm texto descritivo extra
 * colado depois do número (ex.: `..._240017097976.1 CERTIDAO DA JUSTICA
 * FEDERAL 2.pdf.pdf`), provavelmente resíduo do nome original enviado
 * pelo candidato/advogado. sqCandidato sempre veio limpo em todos os
 * exemplos conferidos; só a parte depois do "_" varia. Por isso o regex
 * abaixo captura sqCandidato estritamente, mas trata tudo entre o "_" e
 * o ".pdf" final como um identificador opaco (pode ter espaços, pontos,
 * acentos) — usado como está, sem tentar normalizar.
 *
 * Uso:
 *   npm run ingest-certidoes -- --ano=2026
 */
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { UFS } from "../src/lib/ufs";
import {
  listarEntradasZipRemoto,
  recuperarEntradasZipLocal,
  type ZipEntryLocation,
} from "../src/lib/zip-range";

const ano = process.argv.find((a) => a.startsWith("--ano="))?.split("=")[1] ?? "2026";
const DATA_DIR = path.join(process.cwd(), "data", ano, "certidoes");
const TMP_DIR = path.join(process.cwd(), ".tmp-certidoes");
const RELEASE_BASE =
  "https://github.com/pedrorosemberg/eleicoes.metadax.org/releases/download/arquivos_de_certidoes_criminais";

// sqCandidato: dígitos logo após "{ano}{UF}". Resto até ".pdf" final: identificador opaco (ver nota acima).
const NOME_ARQUIVO_REGEX = /^[A-Z0-9]+\/\d{4}[A-Z]{2}(\d+)_(.+)\.pdf$/i;

interface EntradaIndice {
  arquivo: string;
  offset: number;
  tamanho: number;
}

function agruparPorCandidato(entradas: ZipEntryLocation[]): {
  porCandidato: Record<string, EntradaIndice[]>;
  ignorados: number;
} {
  const porCandidato: Record<string, EntradaIndice[]> = {};
  let ignorados = 0;
  for (const entrada of entradas) {
    const match = entrada.arquivo.match(NOME_ARQUIVO_REGEX);
    if (!match) {
      // leiame.pdf e qualquer entry fora do padrão esperado são pulados.
      ignorados++;
      continue;
    }
    const [, sqCandidato, identificador] = match as unknown as [string, string, string];
    porCandidato[sqCandidato] ??= [];
    porCandidato[sqCandidato].push({
      arquivo: identificador,
      offset: entrada.offset,
      tamanho: entrada.tamanho,
    });
  }
  return { porCandidato, ignorados };
}

async function gravarIndice(uf: string, zipUrl: string, entradas: ZipEntryLocation[]): Promise<void> {
  const { porCandidato, ignorados } = agruparPorCandidato(entradas);
  const candidatosComCertidao = Object.keys(porCandidato).length;
  console.log(
    `[certidoes] ${uf}: ${entradas.length} entries, ${candidatosComCertidao} candidatos com certidão, ${ignorados} ignorados`,
  );

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(
    path.join(DATA_DIR, `${uf}.json`),
    JSON.stringify({ uf, zipUrl, atualizadoEm: new Date().toISOString(), porCandidato }, null, 2),
  );
}

async function indexarViaCentralDirectory(uf: string, zipUrl: string): Promise<boolean> {
  try {
    const entradas = await listarEntradasZipRemoto(zipUrl);
    await gravarIndice(uf, zipUrl, entradas);
    return true;
  } catch (erro) {
    console.warn(`[certidoes] ${uf}: central directory indisponível (${(erro as Error).message})`);
    return false;
  }
}

async function indexarViaRecuperacaoLocal(uf: string, zipUrl: string): Promise<void> {
  console.log(`[certidoes] ${uf}: baixando ZIP inteiro para recuperação local (upload truncado)...`);
  await mkdir(TMP_DIR, { recursive: true });
  const caminhoLocal = path.join(TMP_DIR, `${uf}.zip`);
  const res = await fetch(zipUrl, { redirect: "follow" });
  if (!res.ok || !res.body) {
    console.warn(`[certidoes] ${uf}: download falhou (${res.status}) — pulando`);
    return;
  }
  await writeFile(caminhoLocal, Buffer.from(await res.arrayBuffer()));

  try {
    const entradas = await recuperarEntradasZipLocal(caminhoLocal);
    console.log(`[certidoes] ${uf}: recuperação local achou ${entradas.length} entries válidas`);
    await gravarIndice(uf, zipUrl, entradas);
  } finally {
    await rm(caminhoLocal, { force: true });
  }
}

async function indexarUf(uf: string): Promise<void> {
  const zipUrl = `${RELEASE_BASE}/certidao_criminal_${ano}_${uf}.zip`;
  console.log(`[certidoes] ${uf}: lendo central directory de ${zipUrl}`);

  const ok = await indexarViaCentralDirectory(uf, zipUrl);
  if (!ok) {
    await indexarViaRecuperacaoLocal(uf, zipUrl);
  }
}

async function main() {
  const todasUfs = [...UFS, "BR"];
  for (const uf of todasUfs) {
    await indexarUf(uf);
  }
  await rm(TMP_DIR, { recursive: true, force: true });
  console.log("[certidoes] concluído.");
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
