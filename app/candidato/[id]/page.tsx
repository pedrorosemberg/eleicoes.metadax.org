import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { carregarCandidatoPorId } from "@/lib/data";
import { buscarDadosCnpj } from "@/lib/enrichment";
import { SnapshotNotice } from "@/components/SnapshotNotice";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { candidato } = await carregarCandidatoPorId(id);
  if (!candidato) return { title: "Candidato não encontrado" };
  return {
    title: `${candidato.nomeUrna} — ${candidato.cargo} (${candidato.uf})`,
    description: `${candidato.nomeUrna}, número ${candidato.numero}, candidato(a) a ${candidato.cargo} por ${candidato.uf}/${candidato.municipio}, pelo ${candidato.partido.sigla}.`,
  };
}

export default async function CandidatoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { candidato, isAmostra } = await carregarCandidatoPorId(id);
  if (!candidato) notFound();

  const dadosCnpjPartido = candidato.partido.cnpj
    ? await buscarDadosCnpj(candidato.partido.cnpj)
    : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: candidato.nomeCompleto,
    alternateName: candidato.nomeUrna,
    jobTitle: candidato.cargo,
    memberOf: { "@type": "Organization", name: candidato.partido.nome },
    address: { "@type": "PostalAddress", addressRegion: candidato.uf, addressLocality: candidato.municipio },
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mb-6">
        <SnapshotNotice isAmostra={isAmostra} />
      </div>

      <p className="text-sm font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
        {candidato.cargo} · {candidato.uf}
      </p>
      <h1 className="mt-1 text-[clamp(28px,6vw,40px)] font-semibold text-[var(--text-primary)]">
        {candidato.nomeUrna}
      </h1>
      <p className="mt-1 text-[17px] text-[var(--text-secondary)]">{candidato.nomeCompleto}</p>

      <dl className="mt-8 grid grid-cols-2 gap-y-4 border-t pt-6 text-sm" style={{ borderColor: "var(--hairline)" }}>
        <dt className="text-[var(--text-tertiary)]">Número</dt>
        <dd className="font-financial text-[var(--text-primary)]">{candidato.numero}</dd>

        <dt className="text-[var(--text-tertiary)]">Partido</dt>
        <dd className="text-[var(--text-primary)]">
          {candidato.partido.sigla} — {candidato.partido.nome}
        </dd>

        <dt className="text-[var(--text-tertiary)]">Município</dt>
        <dd className="text-[var(--text-primary)]">{candidato.municipio}/{candidato.uf}</dd>

        <dt className="text-[var(--text-tertiary)]">Situação</dt>
        <dd className="text-[var(--text-primary)]">{candidato.situacao}</dd>

        {candidato.ocupacao && (
          <>
            <dt className="text-[var(--text-tertiary)]">Ocupação</dt>
            <dd className="text-[var(--text-primary)]">{candidato.ocupacao}</dd>
          </>
        )}
      </dl>

      {dadosCnpjPartido && (
        <section className="mt-8 rounded-[18px] border p-5" style={{ borderColor: "var(--hairline)" }}>
          <h2 className="text-[17px] font-semibold text-[var(--text-primary)]">
            Dados do partido (CNPJ)
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {dadosCnpjPartido.razao_social} — {dadosCnpjPartido.descricao_situacao_cadastral}
          </p>
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">
            {dadosCnpjPartido.municipio}/{dadosCnpjPartido.uf}
          </p>
        </section>
      )}

      <p className="mt-10 text-sm text-[var(--text-tertiary)]">
        Plano de governo, site oficial e histórico de candidaturas anteriores dependem do
        enriquecimento via DivulgaCandContas — ver docs/DATA_SOURCES.md §2 e §5 para o status
        dessa integração.
      </p>
    </main>
  );
}
