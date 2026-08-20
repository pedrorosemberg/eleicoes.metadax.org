import Link from "next/link";
import type { Candidato } from "@/types/candidato";

/**
 * Classifica a situação da candidatura em uma cor semântica — só quando
 * reconhecemos o texto do TSE com confiança; qualquer valor não mapeado
 * fica neutro (nunca "adivinha" uma cor para um status desconhecido).
 */
function corSituacao(situacao: string): { cor: string; fundo: string } | null {
  const s = situacao.toUpperCase();
  if (s.includes("DEFERID")) return { cor: "var(--color-success)", fundo: "var(--color-success-bg)" };
  if (s.includes("INDEFERID") || s.includes("CASSAD") || s.includes("INAPT")) {
    return { cor: "var(--color-error)", fundo: "var(--color-error-bg)" };
  }
  if (s.includes("SUB JUDICE") || s.includes("RENUNC") || s.includes("PENDENTE")) {
    return { cor: "var(--color-info)", fundo: "var(--color-info-bg)" };
  }
  return null;
}

/**
 * Cartão de resultado de busca. Sem cor por partido/cargo — diferenciação
 * por tipografia e ícone. A situação da candidatura é a única exceção,
 * usando as cores semânticas de erro/execução/sucesso quando aplicável.
 */
export function CandidatoCard({ candidato }: { candidato: Candidato }) {
  const situacaoCor = corSituacao(candidato.situacao);
  return (
    <Link
      href={`/candidato/${candidato.sqCandidato}`}
      className="block rounded-[18px] border p-4 transition-colors hover:bg-[var(--surface-1)] sm:p-5"
      style={{ borderColor: "var(--hairline)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[17px] font-semibold text-[var(--text-primary)]">
            {candidato.nomeUrna}
          </p>
          <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
            {candidato.cargo} · {candidato.municipio}/{candidato.uf}
          </p>
        </div>
        <span
          className="shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide"
          style={{ borderColor: "var(--hairline-strong)", color: "var(--text-secondary)" }}
        >
          {candidato.numero}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--text-tertiary)]">
        <span className="font-medium text-[var(--text-primary)]">{candidato.partido.sigla}</span>
        <span aria-hidden>·</span>
        <span>{candidato.partido.nome}</span>
        <span aria-hidden>·</span>
        {situacaoCor ? (
          <span
            className="rounded-full px-2 py-0.5 text-xs font-semibold"
            style={{ background: situacaoCor.fundo, color: situacaoCor.cor }}
          >
            {candidato.situacao}
          </span>
        ) : (
          <span>{candidato.situacao}</span>
        )}
      </div>
    </Link>
  );
}
