import type { Metadata } from "next";
import { carregarCandidatosPorUf, carregarMeta } from "@/lib/data";
import { UFS } from "@/lib/ufs";
import { CandidatoCard } from "@/components/CandidatoCard";
import { SnapshotNotice } from "@/components/SnapshotNotice";

export const metadata: Metadata = {
  title: "Busca de candidatos",
  description:
    "Busque candidatos às eleições de 2026 por UF, cidade, cargo e partido. Dados oficiais do TSE.",
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ uf?: string }>;
}) {
  const { uf: ufParam } = await searchParams;
  const uf = ufParam && UFS.includes(ufParam.toUpperCase() as (typeof UFS)[number])
    ? ufParam.toUpperCase()
    : "SP";

  const [{ candidatos, isAmostra }, meta] = await Promise.all([
    carregarCandidatosPorUf(uf),
    carregarMeta(),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        <h1 className="text-[clamp(28px,6vw,40px)] font-semibold leading-tight text-[var(--text-primary)]">
          Candidatos às eleições
        </h1>
        <p className="mt-2 max-w-prose text-[17px] text-[var(--text-secondary)]">
          Dados oficiais do TSE, cruzados com CNPJ da Receita Federal e o Portal da
          Transparência. Sem cor por partido — leia mais em{" "}
          <a href="/sobre" className="underline underline-offset-2">
            /sobre
          </a>
          .
        </p>
      </header>

      <form className="mb-6 flex flex-wrap items-end gap-3" action="/buscar" method="get">
        <label className="flex flex-col gap-1 text-sm font-medium text-[var(--text-secondary)]">
          UF
          <select
            name="uf"
            defaultValue={uf}
            className="h-11 min-w-24 rounded-[10px] border bg-[var(--surface-1)] px-3 text-base text-[var(--text-primary)]"
            style={{ borderColor: "var(--hairline)" }}
          >
            {UFS.map((sigla) => (
              <option key={sigla} value={sigla}>
                {sigla}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="h-11 rounded-[10px] px-5 text-[15px] font-semibold"
          style={{ background: "var(--action-primary-bg)", color: "var(--action-primary-fg)" }}
        >
          Buscar
        </button>
      </form>

      <div className="mb-6">
        <SnapshotNotice isAmostra={isAmostra} geradoEm={meta?.geradoEm} />
      </div>

      <ul className="flex flex-col gap-3">
        {candidatos.map((candidato) => (
          <li key={candidato.sqCandidato}>
            <CandidatoCard candidato={candidato} />
          </li>
        ))}
      </ul>

      {candidatos.length === 0 && (
        <p className="text-[var(--text-tertiary)]">Nenhum candidato encontrado para {uf}.</p>
      )}
    </main>
  );
}
