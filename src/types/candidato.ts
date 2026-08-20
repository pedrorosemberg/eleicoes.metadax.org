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
