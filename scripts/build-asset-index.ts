/**
 * Cruza fotos e PDFs de plano de governo (extraídos localmente de
 * foto_cand2026_{UF}_div.zip e proposta_governo_2026_{UF}.zip do TSE) com
 * os candidatos já ingeridos por scripts/ingest-tse.ts, e grava as URLs
 * públicas direto nos registros de data/{ano}/candidatos/{UF}.json
 * (campos `fotoUrl` e `planoGovernoUrls`, já previstos no tipo `Candidato`
 * — ver src/types/candidato.ts).
 *
 * Os arquivos binários em si NÃO ficam em `data/` (não fazem sentido em
 * JSON, e são grandes demais para o fluxo normal do repositório) — ficam
 * commitados numa branch separada (`assets-tse-2026`) e são servidos via
 * raw.githubusercontent.com. Ver o README dessa branch para a estrutura
 * completa.
 *
 * Uso:
 *   npm run build-asset-index -- --ano=2026 --fotos-dir=./fotos --planos-dir=./planos-de-governo
 *
 * Espera os diretórios já extraídos localmente (não baixa nada) — mesma
 * estrutura publicada na branch assets-tse-2026: `fotos/{UF}/F{UF}{sqCandidato}_div.jpg`
 * e `planos-de-governo/{UF}/{ano}{UF}{sqCandidato}_{NN}.pdf`. Roda depois
 * de `npm run ingest`, nunca antes (precisa dos candidatos/{UF}.json já
 * gravados).
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ano = process.argv.find((a) => a.startsWith("--ano="))?.split("=")[1] ?? "2026";
const fotosDir = process.argv.find((a) => a.startsWith("--fotos-dir="))?.split("=")[1];
const planosDir = process.argv.find((a) => a.startsWith("--planos-dir="))?.split("=")[1];
const DATA_DIR = path.join(process.cwd(), "data", ano);

const ASSETS_BRANCH_BASE = "https://raw.githubusercontent.com/pedrorosemberg/eleicoes.metadax.org/assets-tse-2026";

const REGEX_FOTO = /^F([A-Z]{2})(\d+)_div\.jpg$/i;
const REGEX_PLANO = /^\d{4}([A-Z]{2})(\d+)_(\d+)\.pdf$/i;

async function listarArquivosRecursivo(dir: string): Promise<string[]> {
  const entradas = await readdir(dir, { withFileTypes: true });
  const arquivos: string[] = [];
  for (const entrada of entradas) {
    const caminho = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      arquivos.push(...(await listarArquivosRecursivo(caminho)));
    } else {
      arquivos.push(caminho);
    }
  }
  return arquivos;
}

async function indexarFotos(dir: string): Promise<Map<string, string>> {
  const indice = new Map<string, string>();
  const arquivos = await listarArquivosRecursivo(dir);
  for (const caminho of arquivos) {
    const nome = path.basename(caminho);
    const m = nome.match(REGEX_FOTO);
    if (!m) continue;
    const [, uf, sqCandidato] = m as [string, string, string];
    indice.set(sqCandidato, `${ASSETS_BRANCH_BASE}/fotos/${uf.toUpperCase()}/${nome}`);
  }
  return indice;
}

async function indexarPlanos(dir: string): Promise<Map<string, string[]>> {
  const indice = new Map<string, string[]>();
  const arquivos = await listarArquivosRecursivo(dir);
  for (const caminho of arquivos) {
    const nome = path.basename(caminho);
    const m = nome.match(REGEX_PLANO);
    if (!m) continue;
    const [, uf, sqCandidato] = m as [string, string, string, string];
    const url = `${ASSETS_BRANCH_BASE}/planos-de-governo/${uf.toUpperCase()}/${nome}`;
    if (!indice.has(sqCandidato)) indice.set(sqCandidato, []);
    indice.get(sqCandidato)!.push(url);
  }
  for (const urls of indice.values()) urls.sort();
  return indice;
}

async function main() {
  if (!fotosDir && !planosDir) {
    console.log("Nada para fazer — passe --fotos-dir e/ou --planos-dir.");
    return;
  }

  const [indiceFotos, indicePlanos] = await Promise.all([
    fotosDir ? indexarFotos(fotosDir) : Promise.resolve(new Map<string, string>()),
    planosDir ? indexarPlanos(planosDir) : Promise.resolve(new Map<string, string[]>()),
  ]);
  console.log(`${indiceFotos.size} fotos e ${indicePlanos.size} candidatos com plano de governo indexados`);

  const candidatosDir = path.join(DATA_DIR, "candidatos");
  const arquivos = await readdir(candidatosDir);
  let comFoto = 0;
  let comPlano = 0;
  for (const arquivo of arquivos) {
    const caminho = path.join(candidatosDir, arquivo);
    const candidatos = JSON.parse(await readFile(caminho, "utf-8")) as Array<Record<string, unknown>>;
    for (const candidato of candidatos) {
      const sq = candidato.sqCandidato as string;
      const fotoUrl = indiceFotos.get(sq);
      if (fotoUrl) {
        candidato.fotoUrl = fotoUrl;
        comFoto++;
      }
      const planos = indicePlanos.get(sq);
      if (planos?.length) {
        candidato.planoGovernoUrls = planos;
        comPlano++;
      }
    }
    await writeFile(caminho, JSON.stringify(candidatos, null, 2), "utf-8");
  }
  console.log(`Gravado: ${comFoto} candidatos com foto, ${comPlano} candidatos com plano de governo`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
