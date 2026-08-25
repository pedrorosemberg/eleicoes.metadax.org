/**
 * Ingestão dos dados abertos do TSE — ver docs/ARCHITECTURE.md §4 e
 * docs/DATA_SOURCES.md §1 e §5.
 *
 * IMPORTANTE: este script precisa rodar de uma rede que o TSE não bloqueie
 * no edge (Akamai). A partir do ambiente usado para desenvolver este
 * projeto, `cdn.tse.jus.br` retornou 403 "Access Denied" — documentado e
 * testado em docs/DATA_SOURCES.md §5. Rode isto localmente ou em CI com
 * saída de rede validada antes de assumir que vai funcionar. Confirmado
 * em 2026-08-20 que uma rede residencial comum acessa o CDN normalmente
 * (200) — o bloqueio é específico de certas redes de datacenter/nuvem,
 * não do TSE em geral.
 *
 * Uso:
 *   npm run ingest -- --ano=2026
 *   npm run ingest -- --ano=2026 --from-dir=./caminho/com/zips-baixados
 *
 * `--from-dir` lê `{dataset}_{ano}.zip` de um diretório local em vez de
 * baixar — útil quando alguém baixou os ZIPs manualmente (navegador, outra
 * máquina) de uma rede que funciona e só precisa rodar o parsing daqui.
 * Nomes de arquivo esperados: `consulta_cand_{ano}.zip`,
 * `bem_candidato_{ano}.zip`, `rede_social_candidato_{ano}.zip`,
 * `motivo_cassacao_{ano}.zip`, `consulta_coligacao_{ano}.zip`,
 * `consulta_vagas_{ano}.zip` (mesma convenção do CDN do TSE).
 *
 * O que faz:
 *  1. Obtém cada ZIP (download do CDN do TSE, ou de --from-dir). Só
 *     `consulta_cand` é obrigatório — todo o resto é opcional: se faltar,
 *     é pulado com um aviso, sem derrubar a ingestão inteira (ver
 *     `ingestarOpcional`).
 *  2. Extrai o CSV consolidado (_BRASIL.csv) de cada um.
 *  3. Converte de Latin-1 para UTF-8 e faz parsing (separador ";").
 *  4. Agrupa por UF (quando faz sentido) e grava em
 *     data/{ano}/candidatos/{UF}.json, data/{ano}/bens/{UF}.json,
 *     data/{ano}/redes-sociais/{UF}.json, data/{ano}/motivos-cassacao/{UF}.json,
 *     data/{ano}/coligacoes.json (não é por-UF — uma coligação cobre um
 *     cargo numa UF, faz mais sentido como lista única) e
 *     data/{ano}/vagas.json (idem — poucas linhas, uma por UF+cargo).
 *  5. Gera data/{ano}/indice-busca/{UF}.json — nome/município/partido já
 *     normalizados (sem acento, minúsculas) para a busca não precisar
 *     recalcular isso em runtime (ver scripts/build-search-index.ts).
 *  6. Grava data/{ano}/meta.json com o timestamp da ingestão.
 *
 * Nomes de coluna: confirmados para `consulta_cand`, `bem_candidato`,
 * `rede_social_candidato`, `motivo_cassacao` e `consulta_coligacao` contra
 * ZIPs reais coletados em 2026-08-20 (eleições gerais/estaduais 2026) —
 * ver docs/DATA_SOURCES.md §1 para a origem exata de cada um.
 */
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import AdmZip from "adm-zip";
import { parse } from "csv-parse/sync";
import { buildSearchIndex } from "./build-search-index";

const ano = process.argv.find((a) => a.startsWith("--ano="))?.split("=")[1] ?? "2026";
const fromDir = process.argv.find((a) => a.startsWith("--from-dir="))?.split("=")[1];
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
  // Código da eleição, usado para consultar o detalhe ao vivo no
  // DivulgaCandContas (ver src/types/candidato.ts) — confirmado presente
  // no CSV real (coluna CD_ELEICAO).
  codEleicao: "CD_ELEICAO",
  // Chave para cruzar com o dataset consulta_coligacao (composição e
  // situação da coligação) — confirmado presente no CSV real.
  sqColigacao: "SQ_COLIGACAO",
} as const;

// NÃO existe coluna CD_MUNICIPIO em `consulta_cand` para eleições de
// abrangência estadual/federal (governador, senador, deputados,
// presidente) — confirmado contra um ZIP real de 2026: o cabeçalho não
// traz esse campo, só SG_UE/NM_UE (que aqui equivalem à UF, não a um
// município). O parâmetro `municipio` exigido pela URL do DivulgaCandContas
// para candidaturas desse tipo ainda não foi determinado com confiança —
// por isso `codMunicipio` fica de fora do candidato ingerido, e
// `buscarDetalheDivulgaCand` (src/lib/enrichment.ts) simplesmente não é
// chamado para esses candidatos (ela exige codMunicipio truthy). Para
// eleições municipais (vereador/prefeito) o dataset provavelmente traz
// CD_MUNICIPIO de verdade — reconfirmar quando houver um ZIP desse tipo.

const BEM_COLUNAS = {
  sqCandidato: "SQ_CANDIDATO",
  descricao: "DS_BEM_CANDIDATO",
  valor: "VR_BEM_CANDIDATO",
} as const;

const REDE_SOCIAL_COLUNAS = {
  sqCandidato: "SQ_CANDIDATO",
  url: "DS_URL",
} as const;

const MOTIVO_CASSACAO_COLUNAS = {
  sqCandidato: "SQ_CANDIDATO",
  numeroProcesso: "NR_PROCESSO",
  tipoMotivo: "DS_TP_MOTIVO",
  motivo: "DS_MOTIVO",
} as const;

const COLIGACAO_COLUNAS = {
  sqColigacao: "SQ_COLIGACAO",
  uf: "SG_UF",
  cargo: "DS_CARGO",
  nome: "NM_COLIGACAO",
  composicao: "DS_COMPOSICAO_COLIGACAO",
  situacao: "DS_SITUACAO",
} as const;

const VAGA_COLUNAS = {
  uf: "SG_UF",
  cargo: "DS_CARGO",
  quantidade: "QT_VAGA",
} as const;

// Confirmadas contra ZIP real coletado em 24/08/2026 (prestacao_de_contas_eleitorais_candidatos).
const RECEITA_COLUNAS = {
  sqCandidato: "SQ_CANDIDATO",
  doador: "NM_DOADOR",
  cpfCnpjDoador: "NR_CPF_CNPJ_DOADOR",
  descricao: "DS_RECEITA",
  valor: "VR_RECEITA",
} as const;

const DESPESA_COLUNAS = {
  sqCandidato: "SQ_CANDIDATO",
  fornecedor: "NM_FORNECEDOR",
  cpfCnpjFornecedor: "NR_CPF_CNPJ_FORNECEDOR",
  descricao: "DS_DESPESA",
  valor: "VR_DESPESA_CONTRATADA",
} as const;

// Só os campos incorporados ao candidato (ver src/types/candidato.ts) —
// consulta_cand_complementar tem ~49 colunas, a maioria (etnia indígena,
// gênero/raça do FEFC etc.) não vira campo exibido no produto ainda.
const CAND_COMPLEMENTAR_COLUNAS = {
  sqCandidato: "SQ_CANDIDATO",
  tetoGastos: "VR_DESPESA_MAX_CAMPANHA",
  situacaoJulgamento: "DS_SITUACAO_JULGAMENTO",
} as const;

const TENTATIVAS_DOWNLOAD = 3;
const BACKOFF_BASE_MS = 2000;

/**
 * Baixa o ZIP com retry (backoff exponencial) — cobre falhas
 * transitórias de rede. Um 403 do edge Akamai do TSE (documentado em
 * docs/DATA_SOURCES.md §5) NÃO é tratado como transitório — não adianta
 * repetir, é um bloqueio de rede, não um erro passageiro — falha rápido
 * com uma mensagem clara em vez de gastar 3 tentativas inúteis.
 *
 * Com `--from-dir`, lê `{dataset}_{ano}.zip` do disco em vez de baixar —
 * ver cabeçalho do arquivo.
 */
async function obterZip(dataset: string): Promise<Buffer> {
  if (fromDir) {
    const caminho = path.join(fromDir, `${dataset}_${ano}.zip`);
    console.log(`Lendo ${caminho} (--from-dir)`);
    return readFile(caminho);
  }
  return baixarZip(dataset);
}

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

/**
 * Alguns ZIPs do TSE (prestação de contas) empacotam vários datasets juntos
 * — diferente de `extrairCsvBrasil`, que assume um único `_BRASIL.csv` por
 * ZIP, esta função busca um arquivo específico pelo nome dentro do ZIP.
 */
function extrairArquivoDoZip(zipBuffer: Buffer, dataset: string, nomeArquivo: string): string {
  let zip: AdmZip;
  try {
    zip = new AdmZip(zipBuffer);
  } catch (err) {
    throw new Error(
      `O download de ${dataset} não é um ZIP válido (${zipBuffer.length} bytes). Causa original: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
  const entry = zip.getEntries().find((e) => e.entryName.toUpperCase().endsWith(nomeArquivo.toUpperCase()));
  if (!entry) {
    const nomes = zip.getEntries().map((e) => e.entryName).join(", ");
    throw new Error(`Não encontrei ${nomeArquivo} dentro do ZIP de ${dataset}. Arquivos encontrados: ${nomes || "(nenhum)"}`);
  }
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
  const zipBuffer = await obterZip("consulta_cand");
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
      // codMunicipio fica de fora — ver nota acima de CAND_COLUNAS sobre a
      // ausência dessa coluna para eleições estaduais/federais.
      codEleicao: linha[CAND_COLUNAS.codEleicao] || undefined,
      sqColigacao: linha[CAND_COLUNAS.sqColigacao] || undefined,
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

let indiceUfPorCandidatoCache: Map<string, string> | null = null;

/**
 * Vários datasets do TSE (bens, redes sociais, motivo de cassação) trazem
 * `SQ_CANDIDATO` mas não UF direta — cruzamos com o índice de candidatos
 * já gravado por `ingestCandidatos` para agrupar cada um por UF (mesma UF
 * do candidato dono do registro). Cacheado porque é lido do disco uma vez
 * e reaproveitado pelas três ingestões opcionais abaixo.
 */
async function indiceUfPorCandidato(): Promise<Map<string, string>> {
  if (indiceUfPorCandidatoCache) return indiceUfPorCandidatoCache;
  const indice = new Map<string, string>();
  const candidatosDir = path.join(DATA_DIR, "candidatos");
  const arquivos = await readdir(candidatosDir);
  for (const arquivo of arquivos) {
    const uf = arquivo.replace(".json", "");
    const candidatos = JSON.parse(
      await readFile(path.join(candidatosDir, arquivo), "utf-8"),
    ) as { sqCandidato: string }[];
    for (const c of candidatos) indice.set(c.sqCandidato, uf);
  }
  indiceUfPorCandidatoCache = indice;
  return indice;
}

/**
 * Roda uma ingestão opcional (todo dataset além de `consulta_cand`) e
 * nunca deixa a falta dele (ZIP ausente em --from-dir, ou bloqueio de
 * rede só nesse dataset) derrubar a ingestão inteira — o dado principal
 * (candidatos) já foi gravado antes de qualquer uma destas rodar. Cada
 * loader em src/lib/data.ts já trata a ausência do arquivo de saída como
 * "esse enriquecimento não está disponível", não como erro.
 */
async function ingestarOpcional(dataset: string, tarefa: () => Promise<void>): Promise<void> {
  try {
    await tarefa();
  } catch (err) {
    console.warn(
      `Pulando ingestão de ${dataset}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

async function ingestBens(): Promise<void> {
  const zipBuffer = await obterZip("bem_candidato");
  const csv = extrairCsvBrasil(zipBuffer, "bem_candidato");
  const linhas = parseCsvTse(csv);
  console.log(`${linhas.length} linhas de bens lidas`);
  validarColunaCritica(linhas, BEM_COLUNAS.sqCandidato, "bem_candidato");

  const indice = await indiceUfPorCandidato();
  const porUf = new Map<string, unknown[]>();
  for (const linha of linhas) {
    const sqCandidato = linha[BEM_COLUNAS.sqCandidato];
    if (!sqCandidato) continue;
    const uf = indice.get(sqCandidato);
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

async function ingestRedesSociais(): Promise<void> {
  const zipBuffer = await obterZip("rede_social_candidato");
  const csv = extrairCsvBrasil(zipBuffer, "rede_social_candidato");
  const linhas = parseCsvTse(csv);
  console.log(`${linhas.length} linhas de redes sociais lidas`);
  validarColunaCritica(linhas, REDE_SOCIAL_COLUNAS.sqCandidato, "rede_social_candidato");

  const indice = await indiceUfPorCandidato();
  const porUf = new Map<string, unknown[]>();
  for (const linha of linhas) {
    const sqCandidato = linha[REDE_SOCIAL_COLUNAS.sqCandidato];
    const url = linha[REDE_SOCIAL_COLUNAS.url];
    if (!sqCandidato || !url) continue;
    const uf = indice.get(sqCandidato);
    if (!uf) continue;

    if (!porUf.has(uf)) porUf.set(uf, []);
    porUf.get(uf)!.push({ sqCandidato, url });
  }

  await mkdir(path.join(DATA_DIR, "redes-sociais"), { recursive: true });
  for (const [uf, redes] of porUf) {
    await writeFile(
      path.join(DATA_DIR, "redes-sociais", `${uf}.json`),
      JSON.stringify(redes, null, 2),
      "utf-8",
    );
  }
  console.log(`Gravado redes sociais para ${porUf.size} UFs`);
}

/**
 * Só existe registro para candidatos com candidatura efetivamente cassada
 * — o dataset pode vir com zero linhas de dado (só cabeçalho) numa
 * eleição em andamento, o que é um resultado válido, não uma falha.
 */
async function ingestMotivosCassacao(): Promise<void> {
  const zipBuffer = await obterZip("motivo_cassacao");
  const csv = extrairCsvBrasil(zipBuffer, "motivo_cassacao");
  const linhas = parseCsvTse(csv);
  console.log(`${linhas.length} linhas de motivo de cassação lidas`);
  if (linhas.length === 0) {
    console.log("Nenhuma cassação registrada ainda — nada para gravar.");
    return;
  }

  const indice = await indiceUfPorCandidato();
  const porUf = new Map<string, unknown[]>();
  for (const linha of linhas) {
    const sqCandidato = linha[MOTIVO_CASSACAO_COLUNAS.sqCandidato];
    if (!sqCandidato) continue;
    const uf = indice.get(sqCandidato);
    if (!uf) continue;

    const motivo = {
      sqCandidato,
      numeroProcesso: linha[MOTIVO_CASSACAO_COLUNAS.numeroProcesso],
      tipoMotivo: linha[MOTIVO_CASSACAO_COLUNAS.tipoMotivo],
      motivo: linha[MOTIVO_CASSACAO_COLUNAS.motivo],
    };
    if (!porUf.has(uf)) porUf.set(uf, []);
    porUf.get(uf)!.push(motivo);
  }

  await mkdir(path.join(DATA_DIR, "motivos-cassacao"), { recursive: true });
  for (const [uf, motivos] of porUf) {
    await writeFile(
      path.join(DATA_DIR, "motivos-cassacao", `${uf}.json`),
      JSON.stringify(motivos, null, 2),
      "utf-8",
    );
  }
  console.log(`Gravado motivos de cassação para ${porUf.size} UFs`);
}

/**
 * Coligações e vagas já trazem `SG_UF` direto na própria linha (não
 * precisam do índice por candidato) e são pequenas o bastante (milhares e
 * centenas de linhas, respectivamente) para ficarem num arquivo único em
 * vez de particionadas por UF.
 */
async function ingestColigacoes(): Promise<void> {
  const zipBuffer = await obterZip("consulta_coligacao");
  const csv = extrairCsvBrasil(zipBuffer, "consulta_coligacao");
  const linhas = parseCsvTse(csv);
  console.log(`${linhas.length} linhas de coligações lidas`);
  validarColunaCritica(linhas, COLIGACAO_COLUNAS.sqColigacao, "consulta_coligacao");

  const coligacoes = linhas
    .filter((linha) => linha[COLIGACAO_COLUNAS.sqColigacao])
    .map((linha) => ({
      sqColigacao: linha[COLIGACAO_COLUNAS.sqColigacao],
      uf: linha[COLIGACAO_COLUNAS.uf],
      cargo: linha[COLIGACAO_COLUNAS.cargo],
      nome: linha[COLIGACAO_COLUNAS.nome],
      composicao: linha[COLIGACAO_COLUNAS.composicao],
      situacao: linha[COLIGACAO_COLUNAS.situacao],
    }));

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(path.join(DATA_DIR, "coligacoes.json"), JSON.stringify(coligacoes, null, 2), "utf-8");
  console.log(`Gravado ${coligacoes.length} coligações`);
}

async function ingestVagas(): Promise<void> {
  const zipBuffer = await obterZip("consulta_vagas");
  const csv = extrairCsvBrasil(zipBuffer, "consulta_vagas");
  const linhas = parseCsvTse(csv);
  console.log(`${linhas.length} linhas de vagas lidas`);
  validarColunaCritica(linhas, VAGA_COLUNAS.quantidade, "consulta_vagas");

  const vagas = linhas.map((linha) => ({
    uf: linha[VAGA_COLUNAS.uf],
    cargo: linha[VAGA_COLUNAS.cargo],
    quantidade: Number(linha[VAGA_COLUNAS.quantidade]) || 0,
  }));

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(path.join(DATA_DIR, "vagas.json"), JSON.stringify(vagas, null, 2), "utf-8");
  console.log(`Gravado ${vagas.length} registros de vagas`);
}

/**
 * receitas_candidatos e despesas_contratadas_candidatos vêm no mesmo ZIP
 * de prestação de contas, cada uma com SQ_CANDIDATO direto — junta as
 * duas num único registro por UF (data/{ano}/financas/{UF}.json), já que
 * a UI mostra receita e despesa lado a lado. Deixa de fora
 * despesas_pagas e receitas_doador_originario (não têm SQ_CANDIDATO
 * direto no dataset, precisariam de um join a mais via SQ_DESPESA/
 * SQ_RECEITA — não incorporado nesta rodada).
 */
async function ingestFinancasCandidatos(): Promise<void> {
  const zipBuffer = await obterZip("prestacao_de_contas_eleitorais_candidatos");

  const csvReceitas = extrairArquivoDoZip(
    zipBuffer,
    "prestacao_de_contas_eleitorais_candidatos",
    "receitas_candidatos_2026_BRASIL.csv",
  );
  const linhasReceitas = parseCsvTse(csvReceitas);
  console.log(`${linhasReceitas.length} linhas de receitas de candidatos lidas`);
  validarColunaCritica(linhasReceitas, RECEITA_COLUNAS.sqCandidato, "receitas_candidatos");

  const csvDespesas = extrairArquivoDoZip(
    zipBuffer,
    "prestacao_de_contas_eleitorais_candidatos",
    "despesas_contratadas_candidatos_2026_BRASIL.csv",
  );
  const linhasDespesas = parseCsvTse(csvDespesas);
  console.log(`${linhasDespesas.length} linhas de despesas de candidatos lidas`);
  validarColunaCritica(linhasDespesas, DESPESA_COLUNAS.sqCandidato, "despesas_contratadas_candidatos");

  const indice = await indiceUfPorCandidato();
  const porUf = new Map<string, { receitas: unknown[]; despesas: unknown[] }>();
  const garantirUf = (uf: string) => {
    if (!porUf.has(uf)) porUf.set(uf, { receitas: [], despesas: [] });
    return porUf.get(uf)!;
  };

  for (const linha of linhasReceitas) {
    const sqCandidato = linha[RECEITA_COLUNAS.sqCandidato];
    const uf = sqCandidato ? indice.get(sqCandidato) : undefined;
    if (!uf) continue;
    garantirUf(uf).receitas.push({
      sqCandidato,
      doador: linha[RECEITA_COLUNAS.doador],
      cpfCnpjDoador: linha[RECEITA_COLUNAS.cpfCnpjDoador] || undefined,
      descricao: linha[RECEITA_COLUNAS.descricao],
      valor: Number(linha[RECEITA_COLUNAS.valor]?.replace(",", ".")) || 0,
    });
  }
  for (const linha of linhasDespesas) {
    const sqCandidato = linha[DESPESA_COLUNAS.sqCandidato];
    const uf = sqCandidato ? indice.get(sqCandidato) : undefined;
    if (!uf) continue;
    garantirUf(uf).despesas.push({
      sqCandidato,
      fornecedor: linha[DESPESA_COLUNAS.fornecedor],
      cpfCnpjFornecedor: linha[DESPESA_COLUNAS.cpfCnpjFornecedor] || undefined,
      descricao: linha[DESPESA_COLUNAS.descricao],
      valor: Number(linha[DESPESA_COLUNAS.valor]?.replace(",", ".")) || 0,
    });
  }

  await mkdir(path.join(DATA_DIR, "financas"), { recursive: true });
  for (const [uf, dados] of porUf) {
    await writeFile(path.join(DATA_DIR, "financas", `${uf}.json`), JSON.stringify(dados, null, 2), "utf-8");
  }
  console.log(`Gravado finanças de campanha para ${porUf.size} UFs`);
}

/**
 * consulta_cand_complementar não vira um arquivo novo — é um merge nos
 * candidatos/{UF}.json já gravados por ingestCandidatos (lê, adiciona os
 * campos, regrava).
 */
async function ingestCandidatosComplementar(): Promise<void> {
  const zipBuffer = await obterZip("consulta_cand_complementar");
  const csv = extrairCsvBrasil(zipBuffer, "consulta_cand_complementar");
  const linhas = parseCsvTse(csv);
  console.log(`${linhas.length} linhas de informações complementares lidas`);
  validarColunaCritica(linhas, CAND_COMPLEMENTAR_COLUNAS.sqCandidato, "consulta_cand_complementar");

  const porSqCandidato = new Map<string, Record<string, string>>();
  for (const linha of linhas) {
    const sq = linha[CAND_COMPLEMENTAR_COLUNAS.sqCandidato];
    if (sq) porSqCandidato.set(sq, linha);
  }

  const candidatosDir = path.join(DATA_DIR, "candidatos");
  const arquivos = await readdir(candidatosDir);
  let candidatosAtualizados = 0;
  for (const arquivo of arquivos) {
    const caminho = path.join(candidatosDir, arquivo);
    const candidatos = JSON.parse(await readFile(caminho, "utf-8")) as Array<Record<string, unknown>>;
    for (const candidato of candidatos) {
      const complementar = porSqCandidato.get(candidato.sqCandidato as string);
      if (!complementar) continue;
      const teto = Number(complementar[CAND_COMPLEMENTAR_COLUNAS.tetoGastos]?.replace(",", "."));
      if (teto > 0) candidato.tetoGastos = teto;
      const situacaoJulgamento = complementar[CAND_COMPLEMENTAR_COLUNAS.situacaoJulgamento];
      if (situacaoJulgamento && situacaoJulgamento !== "#NULO") candidato.situacaoJulgamento = situacaoJulgamento;
      candidatosAtualizados++;
    }
    await writeFile(caminho, JSON.stringify(candidatos, null, 2), "utf-8");
  }
  console.log(`Complementados ${candidatosAtualizados} candidatos com dados de consulta_cand_complementar`);
}

/**
 * CNPJ_campanha vem em formato posicional (largura fixa), não CSV — layout
 * confirmado contra leiame_cnpj_campanha.pdf (SECON/CSELE/STI/TSE,
 * Julho/2016, v1.0.0) real, extraído em 24/08/2026. Duas colunas de
 * detalhe por linha "2": tipo (01=partido, 02=candidato), CNPJ, nome
 * fiscal. Sem SQ_CANDIDATO no dataset — ver CnpjCampanha em
 * src/types/candidato.ts sobre por que não cruza com um candidato
 * específico.
 */
function parseCnpjPosicional(conteudo: string, tipo: "candidato" | "partido"): Array<{ tipo: "candidato" | "partido"; cnpj: string; nome: string; naturezaJuridica: string; cnae: string }> {
  const linhas = conteudo.split("\n").filter((l) => l.startsWith("2")); // só registros de DETALHE
  return linhas.map((linha) => ({
    tipo,
    cnpj: linha.slice(3, 17).trim(),
    nome: linha.slice(17, 167).trim(),
    naturezaJuridica: linha.slice(167, 171).trim(),
    cnae: linha.slice(171, 178).trim(),
  }));
}

async function ingestCnpjCampanha(): Promise<void> {
  const zipBuffer = await obterZip("CNPJ_campanha");
  let zip: AdmZip;
  try {
    zip = new AdmZip(zipBuffer);
  } catch (err) {
    throw new Error(`ZIP de CNPJ_campanha inválido: ${err instanceof Error ? err.message : String(err)}`);
  }
  const arquivoCandidatos = zip.getEntries().find((e) => e.entryName.toUpperCase().endsWith("CNPJ_CANDIDATOS_2026.TXT"));
  const arquivoPartidos = zip.getEntries().find((e) => e.entryName.toUpperCase().endsWith("CNPJ_PARTIDO_2026.TXT"));
  if (!arquivoCandidatos || !arquivoPartidos) {
    throw new Error("Não encontrei cnpj_candidatos_2026.txt e/ou cnpj_partido_2026.txt dentro do ZIP de CNPJ_campanha.");
  }

  const cnpjs = [
    ...parseCnpjPosicional(arquivoCandidatos.getData().toString("latin1"), "candidato"),
    ...parseCnpjPosicional(arquivoPartidos.getData().toString("latin1"), "partido"),
  ];
  console.log(`${cnpjs.length} CNPJs de campanha lidos (candidatos + partidos)`);

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(path.join(DATA_DIR, "cnpj-campanha.json"), JSON.stringify(cnpjs, null, 2), "utf-8");
  console.log(`Gravado ${cnpjs.length} CNPJs de campanha`);
}

async function main() {
  await mkdir(TMP_DIR, { recursive: true });
  try {
    const ufs = await ingestCandidatos();

    // Sempre roda (não é ingestarOpcional): só depende de candidatos/ já
    // gravado acima, sem ZIP próprio nem rede — ver scripts/build-search-index.ts.
    const ufsIndexadas = await buildSearchIndex(DATA_DIR);
    console.log(`Gravado índice de busca pré-computado para ${ufsIndexadas} UFs`);

    await ingestarOpcional("bem_candidato", ingestBens);
    await ingestarOpcional("rede_social_candidato", ingestRedesSociais);
    await ingestarOpcional("motivo_cassacao", ingestMotivosCassacao);
    await ingestarOpcional("consulta_coligacao", ingestColigacoes);
    await ingestarOpcional("consulta_vagas", ingestVagas);
    await ingestarOpcional("consulta_cand_complementar", ingestCandidatosComplementar);
    await ingestarOpcional("prestacao_de_contas_eleitorais_candidatos", ingestFinancasCandidatos);
    await ingestarOpcional("CNPJ_campanha", ingestCnpjCampanha);

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
