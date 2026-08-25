/**
 * Gera data/{ano}/indice-busca/{UF}.json a partir de data/{ano}/candidatos/{UF}.json
 * já gravado — não depende dos ZIPs do TSE nem de rede, só do snapshot de
 * candidatos já ingerido em disco. Roda automaticamente no fim de
 * `npm run ingest` (ver ingestCandidatos → buildSearchIndex em
 * scripts/ingest-tse.ts), e também pode rodar isolado sempre que
 * `data/{ano}/candidatos/` mudar por outro caminho que não seja o ingest
 * completo:
 *
 *   npm run build-search-index -- --ano=2026
 *
 * Por que existe: a busca (src/lib/data.ts) precisa comparar nome/município/
 * partido sem acento e em minúsculas. Calcular isso em runtime — mesmo
 * cacheado por processo (WeakMap, só uma vez por cold start) — ainda soma
 * CPU real toda vez que uma nova instância de função serverless nasce sob
 * tráfego, e foi metade do travamento total encontrado no teste de carga de
 * 26/08/2026 (ver docs/ARCHITECTURE.md §12). Pré-computar aqui, em tempo de
 * ingestão, elimina esse custo de runtime por completo: `obterIndiceBusca`
 * em src/lib/data.ts só recorre a normalizar em memória como fallback,
 * quando o índice pré-computado não existe (ex.: fixture de amostra, ou um
 * snapshot antigo que ainda não passou por este script).
 *
 * Alinhado 1:1 por POSIÇÃO com o array de data/{ano}/candidatos/{UF}.json —
 * mesma ordem, mesmo tamanho. Não usa sqCandidato como chave de propósito:
 * é mais barato de gerar, ler e (de)serializar como dois arrays paralelos
 * do que como um Record indexado por chave, e a ordem já é estável (o
 * arquivo de candidatos não é reordenado depois de escrito).
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos (diacríticos combinantes)
    .toLowerCase()
    .trim();
}

interface CandidatoParaIndice {
  nomeUrna: string;
  nomeCompleto: string;
  municipio: string;
  partido: { sigla: string; nome: string };
}

export async function buildSearchIndex(dataDir: string): Promise<number> {
  const candidatosDir = path.join(dataDir, "candidatos");
  const arquivos = await readdir(candidatosDir);
  await mkdir(path.join(dataDir, "indice-busca"), { recursive: true });

  for (const arquivo of arquivos) {
    const candidatos = JSON.parse(
      await readFile(path.join(candidatosDir, arquivo), "utf-8"),
    ) as CandidatoParaIndice[];

    const indice = candidatos.map((c) => ({
      nomeUrna: normalizarTexto(c.nomeUrna),
      nomeCompleto: normalizarTexto(c.nomeCompleto),
      municipio: normalizarTexto(c.municipio),
      partidoSigla: normalizarTexto(c.partido.sigla),
      partidoNome: normalizarTexto(c.partido.nome),
    }));

    // Sem pretty-print: é um arquivo interno, nunca servido bruto para o
    // cliente (só lido server-side por src/lib/data.ts) — mais compacto
    // aqui significa menos I/O e JSON.parse mais rápido em cada cold start.
    await writeFile(path.join(dataDir, "indice-busca", arquivo), JSON.stringify(indice), "utf-8");
  }

  return arquivos.length;
}

// Permite rodar como `tsx scripts/build-search-index.ts --ano=2026`
// diretamente, além de ser importado por scripts/ingest-tse.ts.
if (import.meta.url === `file://${process.argv[1]}`) {
  const ano = process.argv.find((a) => a.startsWith("--ano="))?.split("=")[1] ?? "2026";
  const dataDir = path.join(process.cwd(), "data", ano);
  buildSearchIndex(dataDir)
    .then((n) => {
      console.log(`Gravado índice de busca pré-computado para ${n} UFs em data/${ano}/indice-busca/.`);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
