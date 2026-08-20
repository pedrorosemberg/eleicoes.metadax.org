import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ANO_ELEICAO,
  carregarBensPorUf,
  carregarCandidatoPorId,
  carregarColigacoes,
  carregarMotivosCassacaoPorUf,
  carregarRedesSociaisPorUf,
} from "@/lib/data";
import { buscarDadosCnpj, buscarDetalheDivulgaCand, buscarResumoTransparencia } from "@/lib/enrichment";
import { SnapshotNotice } from "@/components/SnapshotNotice";
import { formatarDataBR, formatarMoedaBRL } from "@/lib/format";
import { IconAlertTriangle, IconCheckCircle, IconExternalLink, IconInfo } from "@/components/icons";

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
    alternates: { canonical: `/candidato/${id}` },
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

  // Enriquecimentos rodam em paralelo — cada um degrada de forma
  // independente (null) se a fonte estiver indisponível, nunca quebra a
  // página. Ver docs/DATA_SOURCES.md para o status de cada integração.
  const [
    dadosCnpjPartido,
    bensResultado,
    detalheDivulgaCand,
    resumoTransparencia,
    redesSociaisDaUf,
    motivosCassacaoDaUf,
    coligacoes,
  ] = await Promise.all([
    candidato.partido.cnpj ? buscarDadosCnpj(candidato.partido.cnpj) : Promise.resolve(null),
    carregarBensPorUf(candidato.uf),
    // codMunicipio fica ausente para candidaturas estaduais/federais neste
    // snapshot — ver src/types/candidato.ts e docs/DATA_SOURCES.md §5 —
    // então esta chamada não roda para nenhum candidato dele por
    // enquanto. Segue condicionada (em vez de removida) para já valer
    // automaticamente se o site passar a ingerir eleições municipais,
    // onde essa coluna existe de verdade.
    candidato.codMunicipio && candidato.codEleicao
      ? buscarDetalheDivulgaCand({
          ano: ANO_ELEICAO,
          municipio: candidato.codMunicipio,
          eleicao: candidato.codEleicao,
          candidato: candidato.sqCandidato,
        })
      : Promise.resolve(null),
    candidato.cpf ? buscarResumoTransparencia(candidato.cpf) : Promise.resolve(null),
    carregarRedesSociaisPorUf(candidato.uf),
    carregarMotivosCassacaoPorUf(candidato.uf),
    carregarColigacoes(),
  ]);

  const bensDoCanditato = bensResultado.bens.filter((b) => b.sqCandidato === candidato.sqCandidato);
  const totalBens = bensDoCanditato.reduce((soma, b) => soma + b.valor, 0);
  const redesSociais = redesSociaisDaUf.filter((r) => r.sqCandidato === candidato.sqCandidato);
  const motivoCassacao = motivosCassacaoDaUf.find((m) => m.sqCandidato === candidato.sqCandidato);
  const coligacaoDoCanditato = candidato.sqColigacao
    ? coligacoes.find((c) => c.sqColigacao === candidato.sqColigacao)
    : undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: candidato.nomeCompleto,
    alternateName: candidato.nomeUrna,
    jobTitle: candidato.cargo,
    memberOf: { "@type": "Organization", name: candidato.partido.nome },
    address: { "@type": "PostalAddress", addressRegion: candidato.uf, addressLocality: candidato.municipio },
    ...(detalheDivulgaCand?.sites?.length || redesSociais.length
      ? { sameAs: [...(detalheDivulgaCand?.sites ?? []), ...redesSociais.map((r) => r.url)] }
      : {}),
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

        {candidato.coligacao && candidato.coligacao !== "PARTIDO ISOLADO" && (
          <>
            <dt className="text-[var(--text-tertiary)]">Coligação</dt>
            <dd className="text-[var(--text-primary)]">
              {candidato.coligacao}
              {coligacaoDoCanditato?.situacao ? ` — ${coligacaoDoCanditato.situacao}` : ""}
            </dd>
          </>
        )}
      </dl>

      {coligacaoDoCanditato?.composicao && coligacaoDoCanditato.composicao !== "#NULO" && (
        <p className="mt-3 text-sm text-[var(--text-tertiary)]">
          Composição da coligação: {coligacaoDoCanditato.composicao}
        </p>
      )}

      {motivoCassacao && (
        <section
          className="mt-6 flex items-start gap-2.5 rounded-[18px] border p-4 text-sm"
          style={{ borderColor: "var(--color-error)", background: "var(--color-error-bg)" }}
        >
          <span className="mt-0.5 shrink-0" style={{ color: "var(--color-error)" }}>
            <IconAlertTriangle />
          </span>
          <div>
            <p className="font-semibold" style={{ color: "var(--color-error)" }}>
              Candidatura cassada — {motivoCassacao.tipoMotivo}
            </p>
            <p className="mt-1 text-[var(--text-secondary)]">
              {motivoCassacao.motivo} (processo {motivoCassacao.numeroProcesso})
            </p>
          </div>
        </section>
      )}

      {/* Site oficial e plano de governo (só quando codMunicipio existir — ver src/types/candidato.ts) + redes sociais (dataset rede_social_candidato, coletado do site do TSE) */}
      {detalheDivulgaCand?.sites?.length || detalheDivulgaCand?.arquivos?.length || redesSociais.length ? (
        <section className="mt-8 rounded-[18px] border p-5" style={{ borderColor: "var(--hairline)" }}>
          <h2 className="text-[17px] font-semibold text-[var(--text-primary)]">
            Site oficial, redes sociais e plano de governo
          </h2>
          {detalheDivulgaCand?.sites?.length ? (
            <ul className="mt-3 flex flex-col gap-1.5 text-sm">
              {detalheDivulgaCand.sites.map((site) => (
                <li key={site}>
                  <a
                    href={site}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1.5 underline underline-offset-2 text-[var(--text-primary)]"
                  >
                    {site}
                    <IconExternalLink />
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          {redesSociais.length ? (
            <ul className="mt-3 flex flex-col gap-1.5 text-sm">
              {redesSociais.map((r, i) => (
                <li key={i}>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1.5 underline underline-offset-2 text-[var(--text-primary)]"
                  >
                    {r.url}
                    <IconExternalLink />
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          {detalheDivulgaCand?.arquivos?.length ? (
            <ul className="mt-3 flex flex-col gap-1.5 text-sm">
              {detalheDivulgaCand.arquivos.map((arquivo) => (
                <li key={arquivo.idArquivo}>
                  <a
                    href={arquivo.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1.5 underline underline-offset-2 text-[var(--text-primary)]"
                  >
                    {arquivo.nome || "Plano de governo (PDF)"}
                    <IconExternalLink />
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : (
        <p className="mt-8 text-sm text-[var(--text-tertiary)]">
          Site oficial, redes sociais e plano de governo ainda não disponíveis para este candidato.
        </p>
      )}

      {/* Histórico de candidaturas anteriores — só quando codMunicipio existir (ver acima) */}
      {detalheDivulgaCand?.eleicoesAnteriores?.length ? (
        <section className="mt-8 rounded-[18px] border p-5" style={{ borderColor: "var(--hairline)" }}>
          <h2 className="text-[17px] font-semibold text-[var(--text-primary)]">
            Histórico de candidaturas anteriores
          </h2>
          <ul className="mt-3 flex flex-col gap-3">
            {detalheDivulgaCand.eleicoesAnteriores.map((h, i) => (
              <li key={i} className="text-sm">
                <p className="font-medium text-[var(--text-primary)]">
                  {h.ano} — {h.cargo}
                </p>
                <p className="text-[var(--text-secondary)]">
                  {h.partido} · {h.local} · {h.situacao}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Bens declarados */}
      <section className="mt-8 rounded-[18px] border p-5" style={{ borderColor: "var(--hairline)" }}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[17px] font-semibold text-[var(--text-primary)]">Bens declarados</h2>
          {bensDoCanditato.length > 0 && (
            <span className="font-financial text-sm font-semibold text-[var(--text-primary)]">
              {formatarMoedaBRL(totalBens)}
            </span>
          )}
        </div>
        {bensDoCanditato.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {bensDoCanditato.map((bem, i) => (
              <li key={i} className="flex items-center justify-between gap-3">
                <span className="text-[var(--text-secondary)]">{bem.descricao}</span>
                <span className="font-financial shrink-0 text-[var(--text-primary)]">
                  {formatarMoedaBRL(bem.valor)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-[var(--text-tertiary)]">
            Nenhum bem declarado encontrado para este candidato{bensResultado.isAmostra ? " (dados de exemplo)" : ""}.
          </p>
        )}
      </section>

      {/* Cruzamento com o Portal da Transparência */}
      <section className="mt-8 rounded-[18px] border p-5" style={{ borderColor: "var(--hairline)" }}>
        <h2 className="text-[17px] font-semibold text-[var(--text-primary)]">Portal da Transparência</h2>
        {resumoTransparencia ? (
          <div className="mt-3 flex flex-col gap-4 text-sm">
            <div className="flex items-center gap-2">
              {resumoTransparencia.pep ? (
                <>
                  <span style={{ color: "var(--color-info)" }}>
                    <IconInfo />
                  </span>
                  <span style={{ color: "var(--color-info)" }} className="font-semibold">
                    Pessoa Exposta Politicamente (PEP)
                  </span>
                </>
              ) : (
                <>
                  <span style={{ color: "var(--color-success)" }}>
                    <IconCheckCircle />
                  </span>
                  <span className="text-[var(--text-secondary)]">Não consta como PEP na base da CGU</span>
                </>
              )}
            </div>

            {resumoTransparencia.contratos.length > 0 && (
              <div>
                <p className="font-medium text-[var(--text-primary)]">Contratos com a União</p>
                <ul className="mt-1.5 flex flex-col gap-1.5">
                  {resumoTransparencia.contratos.map((c, i) => (
                    <li key={i} className="text-[var(--text-secondary)]">
                      {c.objeto} — {c.orgao}, {formatarDataBR(c.dataAssinatura)},{" "}
                      <span className="font-financial">{formatarMoedaBRL(c.valorInicial)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {resumoTransparencia.sancoes.length > 0 && (
              <div>
                <p className="flex items-center gap-1.5 font-medium" style={{ color: "var(--color-error)" }}>
                  <IconAlertTriangle />
                  Sanções encontradas
                </p>
                <ul className="mt-1.5 flex flex-col gap-1.5">
                  {resumoTransparencia.sancoes.map((s, i) => (
                    <li key={i} className="text-[var(--text-secondary)]">
                      {s.tipo} — {s.orgaoSancionador}
                      {s.data ? `, ${formatarDataBR(s.data)}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {resumoTransparencia.contratos.length === 0 && resumoTransparencia.sancoes.length === 0 && (
              <p className="text-[var(--text-tertiary)]">Nenhum contrato ou sanção encontrado na base da CGU.</p>
            )}
          </div>
        ) : (
          <p className="mt-2 text-sm text-[var(--text-tertiary)]">
            Cruzamento indisponível no momento — a chave de acesso ao Portal da Transparência ainda não está
            configurada neste ambiente, ou a fonte está fora do ar.
          </p>
        )}
      </section>

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
    </main>
  );
}
