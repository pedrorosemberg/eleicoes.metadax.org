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
   * Códigos necessários para consultar o detalhe ao vivo no
   * DivulgaCandContas (site oficial, plano de governo, histórico de
   * candidaturas) — ver src/lib/enrichment.ts#buscarDetalheDivulgaCand.
   * Vêm do CSV (`CD_MUNICIPIO`, `CD_ELEICAO`) — nomes de coluna não
   * confirmados contra o leiame.pdf real, mesma ressalva do restante do
   * script de ingestão. Ausentes nos dados de exemplo (não faz sentido
   * chamar a API ao vivo para um candidato fictício).
   */
  codMunicipio?: string;
  codEleicao?: string;
}

export interface Bem {
  sqCandidato: string;
  descricao: string;
  valor: number;
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
