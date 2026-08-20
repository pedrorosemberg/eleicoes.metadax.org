import type { Bem, Candidato } from "@/types/candidato";

/**
 * Dados de EXEMPLO, fictícios, usados apenas enquanto o pipeline de
 * ingestão real (scripts/ingest-tse.ts) ainda não gerou um snapshot.
 * Nunca renderizar sem o aviso "dados de exemplo" na UI.
 */
export const CANDIDATOS_AMOSTRA: Candidato[] = [
  {
    sqCandidato: "amostra-1",
    nomeCompleto: "Nome Completo de Exemplo",
    nomeUrna: "CANDIDATO EXEMPLO",
    numero: "12345",
    cargo: "Deputado Estadual",
    uf: "SP",
    municipio: "São Paulo",
    partido: { sigla: "PEX", numero: "12", nome: "Partido de Exemplo" },
    situacao: "Deferido",
    genero: "Não informado",
    grauInstrucao: "Superior completo",
    ocupacao: "Não informado",
  },
  {
    sqCandidato: "amostra-2",
    nomeCompleto: "Segunda Pessoa de Exemplo",
    nomeUrna: "OUTRA CANDIDATA",
    numero: "45000",
    cargo: "Governador",
    uf: "SP",
    municipio: "São Paulo",
    partido: { sigla: "PEX2", numero: "45", nome: "Segundo Partido de Exemplo" },
    situacao: "Deferido",
  },
];

export const BENS_AMOSTRA: Bem[] = [
  { sqCandidato: "amostra-1", descricao: "Veículo automotor", valor: 45000 },
  { sqCandidato: "amostra-1", descricao: "Imóvel residencial", valor: 320000 },
];
