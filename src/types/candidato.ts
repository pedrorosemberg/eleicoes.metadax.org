/**
 * Modelos de dados. Campos e origem documentados em docs/DATA_SOURCES.md
 * e no modelo de dados descrito em docs/ARCHITECTURE.md §3.
 */

export interface Partido {
  sigla: string;
  numero: string;
  nome: string;
  cnpj?: string;
}

export interface Candidato {
  sqCandidato: string;
  nomeCompleto: string;
  nomeUrna: string;
  numero: string;
  cargo: string;
  uf: string;
  municipio: string;
  partido: Partido;
  coligacao?: string;
  situacao: string;
  genero?: string;
  grauInstrucao?: string;
  ocupacao?: string;
  /** CPF completo nunca deve ser renderizado sem máscara na UI — ver docs/DATA_SOURCES.md §7. */
  cpf?: string;
  fotoUrl?: string;
  /**
   * Códigos usados para consultar o detalhe ao vivo no DivulgaCandContas
   * (site oficial, plano de governo, histórico de candidaturas) — ver
   * src/lib/enrichment.ts#buscarDetalheDivulgaCand. `codEleicao` vem do
   * CSV `consulta_cand` (`CD_ELEICAO`), confirmado contra um ZIP real
   * (20/08/2026). `codMunicipio` fica ausente neste snapshot: a coluna
   * `CD_MUNICIPIO` não existe em `consulta_cand` para candidaturas de
   * abrangência estadual/federal (confirmado contra o mesmo ZIP) — só
   * eleições municipais (vereador/prefeito) devem ter esse código de
   * verdade. Sem `codMunicipio`, o enriquecimento ao vivo fica desativado
   * para o candidato (degrada graciosamente) — ver scripts/ingest-tse.ts
   * e docs/DATA_SOURCES.md §5.
   */
  codMunicipio?: string;
  codEleicao?: string;
  /** Chave para cruzar com `data/{ano}/coligacoes.json` (composição e situação da coligação). */
  sqColigacao?: string;
  /**
   * PDF(s) do plano de governo — coletados do TSE (dataset `proposta_governo`)
   * e servidos via a branch `assets-tse-2026` do próprio repositório (não
   * cabem em `data/`, são binários). Um candidato pode ter mais de um
   * arquivo (ex.: retificação). Ver scripts/build-asset-index.ts.
   */
  planoGovernoUrls?: string[];
  /** Origem: `consulta_cand_complementar` — teto de gastos de campanha declarado (VR_DESPESA_MAX_CAMPANHA). */
  tetoGastos?: number;
  /** Origem: `consulta_cand_complementar` — situação do julgamento do registro de candidatura (DS_SITUACAO_JULGAMENTO). */
  situacaoJulgamento?: string;
}

export interface Bem {
  sqCandidato: string;
  descricao: string;
  valor: number;
}

/** Origem: dataset `rede_social_candidato` do TSE — ver docs/DATA_SOURCES.md §1. */
export interface RedeSocial {
  sqCandidato: string;
  url: string;
}

/** Origem: dataset `motivo_cassacao` do TSE — só existe registro para candidatos com candidatura cassada. */
export interface MotivoCassacao {
  sqCandidato: string;
  numeroProcesso: string;
  tipoMotivo: string;
  motivo: string;
}

/** Origem: dataset `consulta_coligacao` do TSE — uma entrada por coligação (não por candidato). */
export interface Coligacao {
  sqColigacao: string;
  uf: string;
  cargo: string;
  nome: string;
  composicao: string;
  situacao: string;
}

/** Origem: dataset `consulta_vagas` do TSE — vagas em disputa por cargo/UF, não por candidato. */
export interface Vaga {
  uf: string;
  cargo: string;
  quantidade: number;
}

export interface HistoricoCandidatura {
  ano: number;
  cargo: string;
  partido: string;
  situacao: string;
  local: string;
  link?: string;
}

export interface DivulgaCandDetalhe {
  sites: string[];
  emails: string[];
  arquivos: Array<{
    idArquivo: number;
    nome: string;
    url: string;
    tipo: string;
  }>;
  eleicoesAnteriores: HistoricoCandidatura[];
}

export interface BrasilApiCnpjResponse {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  descricao_situacao_cadastral: string;
  data_inicio_atividade: string;
  logradouro: string;
  numero: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  porte: string;
  capital_social: number;
  cnae_fiscal_descricao: string;
  qsa: Array<{
    nome_socio: string;
    qualificacao_socio: string;
    faixa_etaria: string;
  }>;
}

export interface TransparenciaContrato {
  numero: string;
  objeto: string;
  valorInicial: number;
  dataAssinatura: string;
  orgao: string;
}

export interface TransparenciaResumo {
  pep: boolean;
  contratos: TransparenciaContrato[];
  sancoes: Array<{ tipo: "CEIS" | "CNEP" | "CEPIM"; orgaoSancionador: string; data: string }>;
}

/** Origem: dataset `prestacao_de_contas_eleitorais_candidatos` (receitas), do TSE — dinheiro recebido pela campanha. */
export interface ReceitaCampanha {
  sqCandidato: string;
  doador: string;
  cpfCnpjDoador?: string;
  descricao: string;
  valor: number;
}

/** Origem: dataset `prestacao_de_contas_eleitorais_candidatos` (despesas contratadas), do TSE — dinheiro gasto/contratado pela campanha. */
export interface DespesaCampanha {
  sqCandidato: string;
  fornecedor: string;
  cpfCnpjFornecedor?: string;
  descricao: string;
  valor: number;
}

/**
 * Origem: dataset `CNPJ_campanha` do TSE (arquivo posicional, não CSV — ver
 * scripts/ingest-tse.ts). Sem `sqCandidato`: o dataset original só traz CNPJ
 * + nome fiscal (formato "ELEIÇÃO {ano} {nome} {cargo}" para candidatos),
 * sem uma chave numérica de candidato — cruzar por nome seria uma
 * inferência não confiável, então este dataset fica como lista de
 * referência solta, não associado a um `Candidato` específico.
 */
export interface CnpjCampanha {
  tipo: "candidato" | "partido";
  cnpj: string;
  nome: string;
  naturezaJuridica: string;
  cnae: string;
}

/**
 * Origem: dataset `certidao_criminal` do TSE (release "arquivos_de_certidoes_criminais"),
 * documentos enviados pelo próprio candidato no registro da candidatura.
 * `arquivo` é o nome original dentro do ZIP oficial da UF
 * (`{ano}{UF}{sqCandidato}_{sqArquivoDocumento}.pdf.pdf`), usado como
 * identificador único e servido sob demanda via `/api/certidao/[uf]/[arquivo]`
 * — ver scripts/ingest-certidoes.ts e docs/DATA_SOURCES.md §1.
 *
 * Este produto expõe apenas a existência e o link do documento oficial tal
 * como publicado pelo TSE — o conteúdo do PDF não é lido, resumido nem
 * classificado por este produto, para não emitir juízo sobre o candidato.
 */
export interface CertidaoCriminal {
  sqCandidato: string;
  uf: string;
  arquivo: string;
  tamanhoBytes: number;
}

/**
 * Origem: Portal da Transparência (CGU), endpoint
 * `bolsa-familia-disponivel-por-cpf-ou-nis` — consulta pública por CPF,
 * ao vivo (não pré-carregada). Cada item é uma parcela mensal
 * disponibilizada, não necessariamente sacada — ver
 * src/lib/enrichment.ts#buscarBeneficiosSociais.
 */
export interface ParcelaBeneficioSocial {
  programa: "Bolsa Família";
  mesReferencia: string;
  mesCompetencia: string;
  valor: number;
  municipio?: string;
  uf?: string;
}

export interface ResumoBeneficiosSociais {
  parcelas: ParcelaBeneficioSocial[];
  valorTotal: number;
  primeiroMesReferencia?: string;
  ultimoMesReferencia?: string;
}

/**
 * Origem: Portal da Transparência (CGU), endpoints `servidores` e
 * `servidores/remuneracao` — indica se o candidato é ou foi servidor
 * público do Poder Executivo Federal, e (quando localizável) a
 * remuneração do mês mais recente disponível. Não é um histórico
 * completo de remuneração — ver docs/DATA_SOURCES.md §4.
 */
export interface ServidorPublicoFederal {
  situacao: string;
  tipoServidor: string;
  orgaoLotacao?: string;
  orgaoExercicio?: string;
  cargoOuFuncao?: string;
  remuneracaoRecente?: { mesAno: string; valor: number };
}
