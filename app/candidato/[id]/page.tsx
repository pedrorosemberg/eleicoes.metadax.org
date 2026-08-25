import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ANO_ELEICAO,
  carregarBensPorUf,
  carregarCandidatoPorId,
  carregarColigacoes,
  carregarFinancasPorUf,
  carregarIndiceCertidoesPorUf,
  carregarMeta,
  carregarMotivosCassacaoPorUf,
  carregarRedesSociaisPorUf,
} from "@/lib/data";
import {
  buscarBeneficiosSociais,
  buscarDadosCnpj,
  buscarDetalheDivulgaCand,
  buscarResumoTransparencia,
  buscarServidorPublico,
} from "@/lib/enrichment";
import { SnapshotNotice } from "@/components/SnapshotNotice";
import { formatarDataBR, formatarDataHoraBR, formatarMoedaBRL } from "@/lib/format";
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
    financasDaUf,
    indiceCertidoesDaUf,
    meta,
    beneficiosSociais,
    servidorPublico,
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
    carregarFinancasPorUf(candidato.uf),
    carregarIndiceCertidoesPorUf(candidato.uf),
    carregarMeta(),
    candidato.cpf ? buscarBeneficiosSociais(candidato.cpf) : Promise.resolve(null),
    candidato.cpf ? buscarServidorPublico(candidato.cpf) : Promise.resolve(null),
  ]);

  const bensDoCanditato = bensResultado.bens.filter((b) => b.sqCandidato === candidato.sqCandidato);
  const totalBens = bensDoCanditato.reduce((soma, b) => soma + b.valor, 0);
  const redesSociais = redesSociaisDaUf.filter((r) => r.sqCandidato === candidato.sqCandidato);
  const motivoCassacao = motivosCassacaoDaUf.find((m) => m.sqCandidato === candidato.sqCandidato);
  const coligacaoDoCanditato = candidato.sqColigacao
    ? coligacoes.find((c) => c.sqColigacao === candidato.sqColigacao)
    : undefined;
  const receitas = financasDaUf.receitas.filter((r) => r.sqCandidato === candidato.sqCandidato);
  const despesas = financasDaUf.despesas.filter((d) => d.sqCandidato === candidato.sqCandidato);
  const totalReceitas = receitas.reduce((soma, r) => soma + r.valor, 0);
  const totalDespesas = despesas.reduce((soma, d) => soma + d.valor, 0);
  const certidoesDoCandidato = indiceCertidoesDaUf?.porCandidato[candidato.sqCandidato] ?? [];
  const agora = new Date().toISOString();

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
        <SnapshotNotice isAmostra={isAmostra} geradoEm={meta?.geradoEm} />
      </div>

      <div className="flex items-start gap-4">
        {candidato.fotoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- fonte externa (branch de assets no GitHub), fora dos domínios configurados em next/image
          <img
            src={candidato.fotoUrl}
            alt={`Foto oficial de ${candidato.nomeUrna}`}
            width={80}
            height={112}
            className="h-28 w-20 shrink-0 rounded-[10px] border object-cover"
            style={{ borderColor: "var(--hairline)" }}
          />
        )}
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
            {candidato.cargo} · {candidato.uf}
          </p>
          <h1 className="mt-1 text-[clamp(28px,6vw,40px)] font-semibold text-[var(--text-primary)]">
            {candidato.nomeUrna}
          </h1>
          <p className="mt-1 text-[17px] text-[var(--text-secondary)]">{candidato.nomeCompleto}</p>
        </div>
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-y-4 border-t pt-6 text-sm" style={{ borderColor: "var(--hairline)" }}>
        <dt className="text-[var(--text-tertiary)]">Número</dt>
        <dd className="font-financial text-[var(--text-primary)]">{candidato.numero}</dd>

        <dt className="text-[var(--text-tertiary)]">Partido</dt>
        <dd className="text-[var(--text-primary)]">
          {candidato.partido.sigla} — {candidato.partido.nome}
        </dd>

        <dt className="text-[var(--text-tertiary)]">Município</dt>
        <dd className="text-[var(--text-primary)]">{candidato.municipio}/{candidato.uf}</dd>

        {/* DS_SIT_TOT_TURNO (candidato.situacao) só é preenchido depois da apuração —
            antes da eleição vem "#NULO" da própria fonte; situacaoJulgamento
            (DS_SITUACAO_JULGAMENTO, de consulta_cand_complementar) é o que
            existe de fato nessa fase (deferido/indeferido/etc.). */}
        {candidato.situacao && candidato.situacao !== "#NULO" ? (
          <>
            <dt className="text-[var(--text-tertiary)]">Situação</dt>
            <dd className="text-[var(--text-primary)]">{candidato.situacao}</dd>
          </>
        ) : candidato.situacaoJulgamento ? (
          <>
            <dt className="text-[var(--text-tertiary)]">Situação do registro</dt>
            <dd className="text-[var(--text-primary)]">{candidato.situacaoJulgamento}</dd>
          </>
        ) : null}

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

        {candidato.tetoGastos && (
          <>
            <dt className="text-[var(--text-tertiary)]">Teto de gastos de campanha</dt>
            <dd className="font-financial text-[var(--text-primary)]">{formatarMoedaBRL(candidato.tetoGastos)}</dd>
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

      {/* Site oficial (só quando codMunicipio existir — ver src/types/candidato.ts) e redes sociais */}
      <section className="mt-8 rounded-[18px] border p-5" style={{ borderColor: "var(--hairline)" }}>
        <h2 className="text-[17px] font-semibold text-[var(--text-primary)]">Site oficial e redes sociais</h2>
        {detalheDivulgaCand?.sites?.length || redesSociais.length ? (
          <>
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
          </>
        ) : (
          <p className="mt-2 text-sm text-[var(--text-tertiary)]">
            Nenhum site oficial ou rede social consta no registro deste candidato no TSE.
          </p>
        )}
        {meta && (
          <p className="mt-3 text-xs text-[var(--text-tertiary)]">
            Atualizado em {formatarDataHoraBR(meta.geradoEm)}.
          </p>
        )}
      </section>

      {/* Plano de governo — dataset proposta_governo do TSE */}
      <section className="mt-8 rounded-[18px] border p-5" style={{ borderColor: "var(--hairline)" }}>
        <h2 className="text-[17px] font-semibold text-[var(--text-primary)]">Plano de governo</h2>
        {candidato.planoGovernoUrls?.length ? (
          <ul className="mt-3 flex flex-col gap-1.5 text-sm">
            {candidato.planoGovernoUrls.map((url, i) => (
              <li key={url}>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 underline underline-offset-2 text-[var(--text-primary)]"
                >
                  Plano de governo (PDF{candidato.planoGovernoUrls!.length > 1 ? ` ${i + 1}` : ""})
                  <IconExternalLink />
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-[var(--text-tertiary)]">
            Este candidato não anexou um plano de governo no TSE até a data da coleta.
          </p>
        )}
        {meta && (
          <p className="mt-3 text-xs text-[var(--text-tertiary)]">
            Fonte: dataset proposta_governo, site de dados abertos do TSE. Atualizado em{" "}
            {formatarDataHoraBR(meta.geradoEm)}.
          </p>
        )}
      </section>

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
        {meta && !bensResultado.isAmostra && (
          <p className="mt-3 text-xs text-[var(--text-tertiary)]">
            Atualizado em {formatarDataHoraBR(meta.geradoEm)}.
          </p>
        )}
      </section>

      {/* Finanças de campanha — receitas (dinheiro recebido) e despesas contratadas (dinheiro gasto).
          Sempre renderizada (mesmo vazia) — ver docs/DATA_SOURCES.md §10: toda categoria informa o
          candidato tem a mesma seção disponível, mesmo quando o motivo é "nada consta". */}
      <section className="mt-8 rounded-[18px] border p-5" style={{ borderColor: "var(--hairline)" }}>
        <h2 className="text-[17px] font-semibold text-[var(--text-primary)]">Finanças de campanha</h2>
        {receitas.length > 0 && (
          <div className="mt-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-medium text-[var(--text-primary)]">Receitas</p>
              <span className="font-financial text-sm font-semibold text-[var(--text-primary)]">
                {formatarMoedaBRL(totalReceitas)}
              </span>
            </div>
            <ul className="mt-1.5 flex flex-col gap-1.5 text-sm">
              {receitas.map((r, i) => (
                <li key={i} className="flex items-center justify-between gap-3">
                  <span className="text-[var(--text-secondary)]">
                    {r.doador !== "#NULO" ? r.doador : "Doador não identificado"}
                  </span>
                  <span className="font-financial shrink-0 text-[var(--text-primary)]">
                    {formatarMoedaBRL(r.valor)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {despesas.length > 0 && (
          <div className="mt-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-medium text-[var(--text-primary)]">Despesas contratadas</p>
              <span className="font-financial text-sm font-semibold text-[var(--text-primary)]">
                {formatarMoedaBRL(totalDespesas)}
              </span>
            </div>
            <ul className="mt-1.5 flex flex-col gap-1.5 text-sm">
              {despesas.map((d, i) => (
                <li key={i} className="flex items-center justify-between gap-3">
                  <span className="text-[var(--text-secondary)]">
                    {d.fornecedor !== "#NULO" ? d.fornecedor : "Fornecedor não identificado"}
                  </span>
                  <span className="font-financial shrink-0 text-[var(--text-primary)]">
                    {formatarMoedaBRL(d.valor)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {receitas.length === 0 && despesas.length === 0 && (
          <p className="mt-2 text-sm text-[var(--text-tertiary)]">
            Nenhuma receita ou despesa contratada consta na prestação de contas do TSE para este candidato
            até a data da coleta.
          </p>
        )}
        <p className="mt-3 text-xs text-[var(--text-tertiary)]">
          Fonte: prestação de contas eleitorais, coletada do site de dados abertos do TSE. Só receitas e
          despesas já contratadas com o candidato identificado no dado de origem — não inclui despesas
          pagas em parcelas nem doações a órgãos partidários.
          {meta && ` Atualizado em ${formatarDataHoraBR(meta.geradoEm)}.`}
        </p>
      </section>

      {/* Certidões criminais — documentos enviados pelo próprio candidato no registro
          de candidatura. Só a existência e o link do PDF oficial; o conteúdo não é lido
          nem resumido por este produto (ver docs/DATA_SOURCES.md §10, neutralidade). */}
      <section className="mt-8 rounded-[18px] border p-5" style={{ borderColor: "var(--hairline)" }}>
        <h2 className="text-[17px] font-semibold text-[var(--text-primary)]">Certidões criminais</h2>
        {certidoesDoCandidato.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-1.5 text-sm">
            {certidoesDoCandidato.map((c, i) => (
              <li key={c.arquivo}>
                <a
                  href={`/api/certidao/${candidato.uf}/${candidato.sqCandidato}/${c.arquivo}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 underline underline-offset-2 text-[var(--text-primary)]"
                >
                  Certidão {i + 1} (PDF)
                  <IconExternalLink />
                </a>
              </li>
            ))}
          </ul>
        ) : indiceCertidoesDaUf ? (
          <p className="mt-2 text-sm text-[var(--text-tertiary)]">
            Nenhuma certidão criminal consta anexada ao registro deste candidato no TSE até a data da coleta.
          </p>
        ) : (
          <p className="mt-2 flex items-start gap-2 text-sm text-[var(--text-tertiary)]">
            <IconAlertTriangle />
            Indisponível para esta UF no momento — o arquivo de origem publicado pelo TSE para {candidato.uf}{" "}
            está corrompido (falta o índice do ZIP) e aguarda reenvio. Não é um dado sobre este candidato
            específico; nenhum candidato desta UF tem certidão disponível até isso ser corrigido.
          </p>
        )}
        <p className="mt-3 text-xs text-[var(--text-tertiary)]">
          Fonte: dataset certidao_criminal, publicado pelo TSE. Documentos exatamente como enviados pelo
          candidato — este produto não lê, resume nem classifica o conteúdo.
          {indiceCertidoesDaUf && ` Atualizado em ${formatarDataHoraBR(indiceCertidoesDaUf.atualizadoEm)}.`}
        </p>
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
            {candidato.cpf
              ? "Cruzamento indisponível no momento — a fonte (Portal da Transparência) não respondeu a esta consulta."
              : "Cruzamento indisponível — este candidato não tem CPF registrado no dado de origem do TSE, necessário para esta consulta."}
          </p>
        )}
        <p className="mt-3 text-xs text-[var(--text-tertiary)]">
          Fonte: Portal da Transparência (CGU), consulta ao vivo por CPF a cada visita a esta página.
          Consultado agora, {formatarDataHoraBR(agora)}.
        </p>
      </section>

      {/* Servidor público federal e remuneração — cobre só o Poder Executivo Federal
          (universo do próprio endpoint da CGU); não indica cargos estaduais, municipais,
          nem dos poderes Legislativo/Judiciário. */}
      <section className="mt-8 rounded-[18px] border p-5" style={{ borderColor: "var(--hairline)" }}>
        <h2 className="text-[17px] font-semibold text-[var(--text-primary)]">
          Servidor público federal e remuneração
        </h2>
        {servidorPublico && servidorPublico.situacao !== "não encontrado" ? (
          <div className="mt-3 flex flex-col gap-1.5 text-sm">
            <p className="text-[var(--text-secondary)]">
              Situação: {servidorPublico.situacao} ({servidorPublico.tipoServidor})
            </p>
            {servidorPublico.cargoOuFuncao && (
              <p className="text-[var(--text-secondary)]">Cargo/função: {servidorPublico.cargoOuFuncao}</p>
            )}
            {servidorPublico.orgaoExercicio && (
              <p className="text-[var(--text-secondary)]">Órgão de exercício: {servidorPublico.orgaoExercicio}</p>
            )}
            {servidorPublico.orgaoLotacao &&
              servidorPublico.orgaoLotacao !== servidorPublico.orgaoExercicio && (
                <p className="text-[var(--text-secondary)]">Órgão de lotação: {servidorPublico.orgaoLotacao}</p>
              )}
            {servidorPublico.remuneracaoRecente ? (
              <p className="font-financial text-[var(--text-primary)]">
                Remuneração ({servidorPublico.remuneracaoRecente.mesAno}):{" "}
                {formatarMoedaBRL(servidorPublico.remuneracaoRecente.valor)}
              </p>
            ) : (
              <p className="text-[var(--text-tertiary)]">
                Remuneração dos últimos meses não localizada na base da CGU.
              </p>
            )}
          </div>
        ) : servidorPublico ? (
          <p className="mt-2 text-sm text-[var(--text-tertiary)]">
            Não consta como servidor do Poder Executivo Federal na base da CGU.
          </p>
        ) : (
          <p className="mt-2 text-sm text-[var(--text-tertiary)]">
            {candidato.cpf
              ? "Consulta indisponível no momento — a fonte (Portal da Transparência) não respondeu a esta consulta."
              : "Consulta indisponível — este candidato não tem CPF registrado no dado de origem do TSE, necessário para esta consulta."}
          </p>
        )}
        <p className="mt-3 text-xs text-[var(--text-tertiary)]">
          Fonte: Portal da Transparência (CGU), endpoints servidores/servidores/remuneracao, consulta ao
          vivo por CPF. Cobre só o Poder Executivo Federal — não indica cargos estaduais, municipais, nem
          dos poderes Legislativo/Judiciário. Consultado agora, {formatarDataHoraBR(agora)}.
        </p>
      </section>

      {/* Benefícios sociais — receber (ou não) um programa social é dado de política
          pública, auditável pela Lei de Acesso à Informação, e não é indicador de
          mérito/demérito do candidato. Ver docs/DATA_SOURCES.md §10. */}
      <section className="mt-8 rounded-[18px] border p-5" style={{ borderColor: "var(--hairline)" }}>
        <h2 className="text-[17px] font-semibold text-[var(--text-primary)]">Benefícios sociais</h2>
        {beneficiosSociais && beneficiosSociais.parcelas.length > 0 ? (
          <div className="mt-3 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-medium text-[var(--text-primary)]">Bolsa Família</p>
              <span className="font-financial text-sm font-semibold text-[var(--text-primary)]">
                {formatarMoedaBRL(beneficiosSociais.valorTotal)}
              </span>
            </div>
            <p className="mt-1 text-[var(--text-secondary)]">
              {beneficiosSociais.parcelas.length} parcela(s) disponibilizada(s) nos últimos 12 meses
              {beneficiosSociais.primeiroMesReferencia && beneficiosSociais.ultimoMesReferencia
                ? `, de ${beneficiosSociais.primeiroMesReferencia} a ${beneficiosSociais.ultimoMesReferencia}`
                : ""}
              .
            </p>
          </div>
        ) : beneficiosSociais ? (
          <p className="mt-2 text-sm text-[var(--text-tertiary)]">
            Nenhuma parcela de Bolsa Família disponibilizada para o CPF deste candidato consta na base da
            CGU, nos últimos 12 meses.
          </p>
        ) : (
          <p className="mt-2 text-sm text-[var(--text-tertiary)]">
            {candidato.cpf
              ? "Consulta indisponível no momento — a fonte (Portal da Transparência) não respondeu a esta consulta."
              : "Consulta indisponível — este candidato não tem CPF registrado no dado de origem do TSE, necessário para esta consulta."}
          </p>
        )}
        <p className="mt-3 text-xs text-[var(--text-tertiary)]">
          Fonte: Portal da Transparência (CGU), endpoint bolsa-familia-disponivel-por-cpf-ou-nis, consulta
          ao vivo por CPF, limitada aos últimos 12 meses (a mesma janela para todo candidato — o endpoint
          exige um mês específico por consulta, não existe uma chamada de &ldquo;histórico completo&rdquo;). Receber
          (ou não) este benefício é um dado de política pública, público por força da Lei de Acesso à
          Informação — não é um indicador de mérito ou demérito do candidato. Consultado agora,{" "}
          {formatarDataHoraBR(agora)}.
        </p>
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
