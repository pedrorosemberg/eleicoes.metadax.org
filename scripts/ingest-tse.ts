/**
 * Ingestão dos dados abertos do TSE — ver docs/ARCHITECTURE.md §4 e
 * docs/DATA_SOURCES.md §1 e §5.
 *
 * IMPORTANTE: este script precisa rodar de uma rede que o TSE não bloqueie
 * no edge (Akamai). A partir do ambiente usado para desenvolver este
 * projeto, `cdn.tse.jus.br` retornou 403 "Access Denied" — documentado e
 * testado em docs/DATA_SOURCES.md §5. Rode isto localmente ou em CI com
 * saída de rede validada antes de assumir que vai funcionar.
 *
 * Uso: npm run ingest -- --ano=2026
 *
 * O que faz:
 *  1. Baixa consulta_cand_{ano}.zip e bem_candidato_{ano}.zip do CDN do TSE.
 *  2. Extrai o CSV consolidado (_BRASIL.csv) de cada um.
 *  3. Converte de Latin-1 para UTF-8 e faz parsing (separador ";").
 *  4. Agrupa por UF e grava em data/{ano}/candidatos/{UF}.json e
 *     data/{ano}/bens/{UF}.json.
 *  5. Grava data/{ano}/meta.json com o timestamp da ingestão.
 *
 * Nomes de coluna: confirmados para `consulta_cand` a partir da
 * documentação pública do TSE (ver DATA_SOURCES.md §1). Para
 * `bem_candidato`, os nomes abaixo seguem o padrão de nomenclatura usado
 * pelo TSE em outros datasets (prefixo SQ_/DS_/VR_) mas NÃO foram
 * confirmados contra o leiame.pdf real (o ZIP está bloqueado nesta sessão
 * — ver §5). Confira contra o leiame.pdf na primeira execução real e
 * ajuste BEM_COLUNAS abaixo se necessário.
 */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import AdmZip from "adm-zip";
import { parse } from "csv-parse/sync";

const ano = process.argv.find((a) => a.startsWith("--ano="))?.split("=")[1] ?? "2026";
const TMP_DIR = path.join(process.cwd(), ".tmp-ingest");
const DATA_DIR = path.join(process.cwd(), "data", ano);

const CAND_COLUNAS = {
  sqCandidato: "SQ_CANDIDATO",
  nomeCompleto: "NM_CANDIDATO",
  nomeUrna: "NM_URNA_CANDIDATO",
  numero: "NR_CANDIDATO",
  cargo: "DS_CARGO",
  uf: "SG_UF",
  municipio: "NM_UE",
  siglaPartido: "SG_PARTIDO",
  numeroPartido: "NR_PARTIDO",
  nomePartido: "NM_PARTIDO",
  coligacao: "NM_COLIGACAO",
  situacao: "DS_SIT_TOT_TURNO",
  genero: "DS_GENERO",
  grauInstrucao: "DS_GRAU_INSTRUCAO",
  ocupacao: "DS_OCUPACAO",
  cpf: "NR_CPF_CANDIDATO",
  // Códigos usados para consultar o detalhe ao vivo no DivulgaCandContas
  // (ver src/types/candidato.ts) — nomes de coluna seguem a convenção
  // padrão do TSE para esses datasets, mas NÃO confirmados contra o
  // leiame.pdf real desta eleição (mesma ressalva do cabeçalho do arquivo).
  codMunicipio: "CD_MUNICIPIO",
  codEleicao: "CD_ELEICAO",
} as const;

// Não confirmado contra o leiame.pdf real — ver aviso no cabeçalho do arquivo.
const BEM_COLUNAS = {
  sqCandidato: "SQ_CANDIDATO",
  descricao: "DS_BEM_CANDIDATO",
  valor: "VR_BEM_CANDIDATO",
} as const;

const TENTATIVAS_DOWNLOAD = 3;
const BACKOFF_BASE_MS = 2000;

/**
 * Baixa o ZIP com retry (backoff exponencial) — cobre falhas
 * transitórias de rede. Um 403 do edge Akamai do TSE (documentado em
 * docs/DATA_SOURCES.md §5) NÃO é tratado como transitório — não adianta
 * repetir, é um bloqueio de rede, não um erro passageiro — falha rápido
 * com uma mensagem clara em vez de gastar 3 tentativas inúteis.
 */
async function baixarZip(dataset: string): Promise<Buffer> {
  const url = `https://cdn.tse.jus.br/estatistica/sead/odsele/${dataset}/${dataset}_${ano}.zip`;

  let ultimoErro: unknown;
  for (let tentativa = 1; tentativa <= TENTATIVAS_DOWNLOAD; tentativa++) {
    console.log(`Baixando ${url} (tentativa ${tentativa}/${TENTATIVAS_DOWNLOAD})`);
    try {
      const res = await fetch(url);
      if (res.status === 403) {
        throw new Error(
          `Bloqueado (403) ao baixar ${dataset} — provável bloqueio de edge (Akamai) do TSE, documentado em docs/DATA_SOURCES.md §5. Não é um erro transitório: rode este script de outra rede (máquina local, CI com IP residencial/brasileiro) em vez de tentar de novo daqui.`,
        );
      }
      if (!res.ok) {
        throw new Error(`Falha ao baixar ${dataset}: HTTP ${res.status} ${res.statusText}`);
      }
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      ultimoErro = err;
      const mensagem = err instanceof Error ? err.message : String(err);
      if (mensagem.includes("Bloqueado (403)")) throw err; // não adianta repetir
      console.warn(`Tentativa ${tentativa} falhou: ${mensagem}`);
      if (tentativa < TENTATIVAS_DOWNLOAD) {
        const espera = BACKOFF_BASE_MS * 2 ** (tentativa - 1);
        await new Promise((resolve) => setTimeout(resolve, espera));
      }
    }
  }
  throw new Error(
    `Falha ao baixar ${dataset} após ${TENTATIVAS_DOWNLOAD} tentativas. Último erro: ${
      ultimoErro instanceof Error ? ultimoErro.message : String(ultimoErro)
    }`,
  );
}

function extrairCsvBrasil(zipBuffer: Buffer, dataset: string): string {
  let zip: AdmZip;
  try {
    zip = new AdmZip(zipBuffer);
  } catch (err) {
    throw new Error(
      `O download de ${dataset} não é um ZIP válido (${zipBuffer.length} bytes) — provavelmente uma página de erro HTML foi baixada em vez do arquivo real. Causa original: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
  const entry = zip
    .getEntries()
    .find((e) => e.entryName.toUpperCase().includes("_BRASIL.CSV"));
  if (!entry) {
    const nomes = zip.getEntries().map((e) => e.entryName).join(", ");
    throw new Error(
      `Não encontrei o CSV consolidado (_BRASIL.csv) dentro do ZIP de ${dataset}. Arquivos encontrados: ${nomes || "(nenhum)"}`,
    );
  }
  // TSE publica os CSVs em Latin-1 (ISO-8859-1).
  return entry.getData().toString("latin1");
}

function parseCsvTse(conteudo: string): Record<string, string>[] {
  return parse(conteudo, {
    columns: true,
    delimiter: ";",
    skip_empty_lines: true,
    relax_quotes: true,
    trim: true,
  });
}

/**
 * Checagem de sanidade pós-parsing: se a coluna crítica vier vazia na
 * maioria das linhas, é sinal de que o nome da coluna mudou em relação
 * ao que está hardcoded acima (ex.: leiame.pdf de uma eleição diferente)
 * — falha alto e claro em vez de gravar um dataset silenciosamente
 * quebrado.
 */
function validarColunaCritica(linhas: Record<string, string>[], coluna: string, contexto: string) {
  if (linhas.length === 0) return;
  const preenchidas = linhas.filter((l) => l[coluna]?.trim()).length;
  const proporcao = preenchidas / linhas.length;
  if (proporcao < 0.5) {
    throw new Error(
      `Coluna crítica "${coluna}" (${contexto}) veio vazia em ${Math.round((1 - proporcao) * 100)}% das linhas — provável mudança de nome de coluna no CSV desta eleição. Confira o leiame.pdf real do TSE e ajuste as constantes de coluna no topo deste script antes de confiar no resultado.`,
    );
  }
}

async function ingestCandidatos(): Promise<Set<string>> {
  const zipBuffer = await baixarZip("consulta_cand");
  const csv = extrairCsvBrasil(zipBuffer, "consulta_cand");
  const linhas = parseCsvTse(csv);
  console.log(`${linhas.length} linhas de candidatos lidas`);
  validarColunaCritica(linhas, CAND_COLUNAS.sqCandidato, "consulta_cand");
  validarColunaCritica(linhas, CAND_COLUNAS.uf, "consulta_cand");

  const porUf = new Map<string, unknown[]>();
  const ufsEncontradas = new Set<string>();

  for (const linha of linhas) {
    const uf = linha[CAND_COLUNAS.uf];
    if (!uf) continue;
    ufsEncontradas.add(uf);

    const candidato = {
      sqCandidato: linha[CAND_COLUNAS.sqCandidato],
      nomeCompleto: linha[CAND_COLUNAS.nomeCompleto],
      nomeUrna: linha[CAND_COLUNAS.nomeUrna],
      numero: linha[CAND_COLUNAS.numero],
      cargo: linha[CAND_COLUNAS.cargo],
      uf,
      municipio: linha[CAND_COLUNAS.municipio],
      partido: {
        sigla: linha[CAND_COLUNAS.siglaPartido],
        numero: linha[CAND_COLUNAS.numeroPartido],
        nome: linha[CAND_COLUNAS.nomePartido],
      },
      coligacao: linha[CAND_COLUNAS.coligacao] || undefined,
      situacao: linha[CAND_COLUNAS.situacao],
      genero: linha[CAND_COLUNAS.genero] || undefined,
      grauInstrucao: linha[CAND_COLUNAS.grauInstrucao] || undefined,
      ocupacao: linha[CAND_COLUNAS.ocupacao] || undefined,
      cpf: linha[CAND_COLUNAS.cpf] || undefined,
      codMunicipio: linha[CAND_COLUNAS.codMunicipio] || undefined,
      codEleicao: linha[CAND_COLUNAS.codEleicao] || undefined,
    };

    if (!porUf.has(uf)) porUf.set(uf, []);
    porUf.get(uf)!.push(candidato);
  }

  await mkdir(path.join(DATA_DIR, "candidatos"), { recursive: true });
  for (const [uf, candidatos] of porUf) {
    await writeFile(
      path.join(DATA_DIR, "candidatos", `${uf}.json`),
      JSON.stringify(candidatos, null, 2),
      "utf-8",
    );
  }
  console.log(`Gravado candidatos para ${porUf.size} UFs`);
  return ufsEncontradas;
}

async function ingestBens(): Promise<void> {
  const zipBuffer = await baixarZip("bem_candidato");
  const csv = extrairCsvBrasil(zipBuffer, "bem_candidato");
  const linhas = parseCsvTse(csv);
  console.log(`${linhas.length} linhas de bens lidas`);
  validarColunaCritica(linhas, BEM_COLUNAS.sqCandidato, "bem_candidato");

  // O CSV de bens não tem UF direta — cruzamos com o índice de candidatos
  // já gravado para agrupar por UF (mesma UF do candidato dono do bem).
  const indiceUfPorCandidato = new Map<string, string>();
  const candidatosDir = path.join(DATA_DIR, "candidatos");
  const arquivos = await import("node:fs/promises").then((fs) => fs.readdir(candidatosDir));
  for (const arquivo of arquivos) {
    const uf = arquivo.replace(".json", "");
    const candidatos = JSON.parse(
      await readFile(path.join(candidatosDir, arquivo), "utf-8"),
    ) as { sqCandidato: string }[];
    for (const c of candidatos) indiceUfPorCandidato.set(c.sqCandidato, uf);
  }

  const porUf = new Map<string, unknown[]>();
  for (const linha of linhas) {
    const sqCandidato = linha[BEM_COLUNAS.sqCandidato];
    if (!sqCandidato) continue;
    const uf = indiceUfPorCandidato.get(sqCandidato);
    if (!uf) continue;

    const bem = {
      sqCandidato,
      descricao: linha[BEM_COLUNAS.descricao],
      valor: Number(linha[BEM_COLUNAS.valor]?.replace(",", ".")) || 0,
    };
    if (!porUf.has(uf)) porUf.set(uf, []);
    porUf.get(uf)!.push(bem);
  }

  await mkdir(path.join(DATA_DIR, "bens"), { recursive: true });
  for (const [uf, bens] of porUf) {
    await writeFile(path.join(DATA_DIR, "bens", `${uf}.json`), JSON.stringify(bens, null, 2), "utf-8");
  }
  console.log(`Gravado bens para ${porUf.size} UFs`);
}

async function main() {
  await mkdir(TMP_DIR, { recursive: true });
  try {
    const ufs = await ingestCandidatos();
    await ingestBens();

    await writeFile(
      path.join(DATA_DIR, "meta.json"),
      JSON.stringify(
        { ano: Number(ano), geradoEm: new Date().toISOString(), ufs: [...ufs].sort() },
        null,
        2,
      ),
      "utf-8",
    );
    console.log(`Ingestão concluída para o ano ${ano}.`);
  } finally {
    await rm(TMP_DIR, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
