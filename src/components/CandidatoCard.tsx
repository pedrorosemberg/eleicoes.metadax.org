import Link from "next/link";
import type { Candidato } from "@/types/candidato";

/**
 * Cartão de resultado de busca. Sem cor por categoria/partido de propósito
 * — ver docs/DESIGN_SYSTEM.md §3 (diferenciação por tipografia/ícone, nunca hue).
 */
export function CandidatoCard({ candidato }: { candidato: Candidato }) {
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
        <span>{candidato.situacao}</span>
      </div>
    </Link>
  );
}
