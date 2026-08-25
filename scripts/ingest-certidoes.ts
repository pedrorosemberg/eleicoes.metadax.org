/**
 * Indexa as certidões criminais dos candidatos — dataset `certidao_criminal`
 * do TSE, publicado como release do GitHub em
 * https://github.com/pedrorosemberg/eleicoes.metadax.org/releases/tag/arquivos_de_certidoes_criminais
 * (28 ZIPs, um por UF + BR, ~9,5 GB no total — confirmado em 25/08/2026).
 *
 * Diferente dos outros datasets, este script NÃO baixa os ZIPs inteiros:
 * eles são grandes demais (até 1,6 GB cada) para duplicar em qualquer
 * lugar sem custo real de infraestrutura. Em vez disso, lê só o central
 * directory de cada ZIP remoto (alguns KB, via HTTP Range — ver
 * src/lib/zip-range.ts) e grava um índice leve com o offset e tamanho
 * exatos de cada certidão dentro do ZIP original. A leitura de cada
 * arquivo em si acontece sob demanda, direto do release do GitHub, via
 * app/api/certidao/[uf]/[candidato]/[arquivo]/route.ts — nenhum PDF é
 * duplicado ou re-hospedado.
 *
 * Nome de arquivo dentro do ZIP (confirmado contra o leiame.pdf oficial
 * do TSE, incluído em cada ZIP): `{ano}{UF}{sqCandidato}_{sqArquivoDocumento}.{ext}`
 * — SQ_CANDIDATO vem embutido no nome (join confiável, diferente do
 * dataset CNPJ_campanha). Um candidato pode ter 0, 1 ou vários documentos.
 *
 * Uso:
 *   npm run ingest-certidoes -- --ano=2026
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { UFS } from "../src/lib/ufs";
import { listarEntradasZipRemoto } from "../src/lib/zip-range";

const ano = process.argv.find((a) => a.startsWith("--ano="))?.split("=")[1] ?? "2026";
const DATA_DIR = path.join(process.cwd(), "data", ano, "certidoes");
const RELEASE_BASE =
  "https://github.com/pedrorosemberg/eleicoes.metadax.org/releases/download/arquivos_de_certidoes_criminais";

const NOME_ARQUIVO_REGEX = /^[A-Z0-9]+\/\d{4}[A-Z]{2}(\d+)_(\d+)\.pdf\.pdf$/i;

interface EntradaIndice {
  arquivo: string;
  offset: number;
  tamanho: number;
}

async function indexarUf(uf: string): Promise<void> {
  const zipUrl = `${RELEASE_BASE}/certidao_criminal_${ano}_${uf}.zip`;
  console.log(`[certidoes] ${uf}: lendo central directory de ${zipUrl}`);

  let entradas: Awaited<ReturnType<typeof listarEntradasZipRemoto>>;
  try {
    entradas = await listarEntradasZipRemoto(zipUrl);
  } catch (erro) {
    console.warn(`[certidoes] ${uf}: falhou (${(erro as Error).message}) — pulando`);
    return;
  }

  const porCandidato: Record<string, EntradaIndice[]> = {};
  let ignorados = 0;
  for (const entrada of entradas) {
    const match = entrada.arquivo.match(NOME_ARQUIVO_REGEX);
    if (!match) {
      // leiame.pdf e qualquer entry fora do padrão esperado são pulados.
      ignorados++;
      continue;
    }
    const [, sqCandidato, sqArquivoDocumento] = match as unknown as [string, string, string];
    porCandidato[sqCandidato] ??= [];
    porCandidato[sqCandidato].push({
      arquivo: sqArquivoDocumento,
      offset: entrada.offset,
      tamanho: entrada.tamanho,
    });
  }

  const candidatosComCertidao = Object.keys(porCandidato).length;
  console.log(
    `[certidoes] ${uf}: ${entradas.length} entries, ${candidatosComCertidao} candidatos com certidão, ${ignorados} ignorados`,
  );

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(
    path.join(DATA_DIR, `${uf}.json`),
    JSON.stringify(
      { uf, zipUrl, atualizadoEm: new Date().toISOString(), porCandidato },
      null,
      2,
    ),
  );
}

async function main() {
  const todasUfs = [...UFS, "BR"];
  for (const uf of todasUfs) {
    await indexarUf(uf);
  }
  console.log("[certidoes] concluído.");
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
