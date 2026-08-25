import type { Metadata } from "next";
import Link from "next/link";
import { SourceMarquee } from "@/components/SourceMarquee";
import { Reveal } from "@/components/Reveal";
import { CounterStat } from "@/components/CounterStat";
import { IconCheckCircle, IconAlertTriangle, IconXCircle, IconStar } from "@/components/icons";
import { buscarEstatisticasRepositorio } from "@/lib/github";

const REPO_URL = "https://github.com/pedrorosemberg/eleicoes.metadax.org";

export const metadata: Metadata = {
  title: "Eleições — METADAX",
  description:
    "Consulta pública de candidatos às eleições brasileiras: dados oficiais do TSE, plano de governo, partido e cruzamento com o Portal da Transparência e a Receita Federal. Projeto de código aberto, sem cor de partido.",
};

type StatusFeature = "disponível" | "em progresso" | "indisponível";

const FEATURES: Array<{ titulo: string; descricao: string; status: StatusFeature }> = [
  {
    titulo: "Busca direta e por filtros",
    descricao:
      "Direta por nome, número ou ID do candidato; ou indireta, filtrando UF, cidade, cargo e partido — combináveis.",
    status: "disponível",
  },
  {
    titulo: "Foto, redes sociais e bens declarados",
    descricao:
      "Foto oficial, redes sociais informadas ao TSE e descrição/valor dos bens declarados, conforme a regra de privacidade do TSE desde 2022 — coletados do site de dados abertos do TSE.",
    status: "disponível",
  },
  {
    titulo: "Plano de governo (PDF)",
    descricao:
      "Link direto ao PDF do plano de governo registrado no TSE, quando o candidato enviou um — coletado do site de dados abertos do TSE.",
    status: "disponível",
  },
  {
    titulo: "Finanças de campanha",
    descricao:
      "Receitas (doações recebidas) e despesas contratadas de cada candidato, e teto de gastos declarado — coletados do site de dados abertos do TSE.",
    status: "disponível",
  },
  {
    titulo: "Coligações e vagas em disputa",
    descricao:
      "Composição e situação da coligação de cada candidato, e o total de vagas em disputa por cargo/UF — coletados do site de dados abertos do TSE.",
    status: "disponível",
  },
  {
    titulo: "Partido → CNPJ → sócios",
    descricao:
      "Dados cadastrais do partido via CNPJ (Receita Federal, através da BrasilAPI): situação, endereço, quadro societário.",
    status: "disponível",
  },
  {
    titulo: "Cruzamento com o Portal da Transparência",
    descricao:
      "Contratos federais, status de Pessoa Exposta Politicamente (PEP), sanções (CEIS/CNEP/CEPIM), situação de servidor público federal e benefícios sociais (Bolsa Família) ligados ao CPF do candidato — consulta ao vivo, com a chave de API já configurada.",
    status: "disponível",
  },
  {
    titulo: "Certidões criminais",
    descricao:
      "Documentos enviados pelo próprio candidato no registro de candidatura, exatamente como publicados pelo TSE — 20.089 candidatos com pelo menos um documento, nas 28 unidades eleitorais.",
    status: "disponível",
  },
  {
    titulo: "Site oficial (link direto) e histórico de candidaturas anteriores",
    descricao:
      "Dependem do sistema DivulgaCandContas do TSE, que não expõe o código de município usado para candidaturas estaduais/federais nos dados coletados até agora — sem ele, essa consulta não pode ser feita com confiança. Ver docs/DATA_SOURCES.md §5.",
    status: "indisponível",
  },
];

const STATUS_CONFIG: Record<StatusFeature, { rotulo: string; cor: string; corFundo: string; Icone: typeof IconCheckCircle }> = {
  disponível: { rotulo: "disponível", cor: "var(--color-success)", corFundo: "var(--color-success-bg)", Icone: IconCheckCircle },
  "em progresso": { rotulo: "em progresso", cor: "var(--color-warning)", corFundo: "var(--color-warning-bg)", Icone: IconAlertTriangle },
  indisponível: { rotulo: "indisponível", cor: "var(--color-error)", corFundo: "var(--color-error-bg)", Icone: IconXCircle },
};

const PRINCIPIOS = [
  {
    titulo: "Sem cor de partido",
    descricao:
      "Interface em tema claro, preto e branco. Nenhuma cor associada a partido é usada para diferenciar candidatos — ver a identidade visual do projeto.",
  },
  {
    titulo: "Fonte pública, sempre citada",
    descricao:
      "Todo dado exibido aponta para sua origem oficial (TSE, CGU, Receita Federal). Nada é inventado ou estimado sem indicar isso claramente.",
  },
  {
    titulo: "Código e documentação abertos",
    descricao:
      "Repositório público no GitHub, licenciado em CC BY 4.0. Toda decisão de arquitetura e fonte de dado está documentada em /docs.",
  },
];

export default async function LandingPage() {
  const estatisticasRepo = await buscarEstatisticasRepositorio();

  return (
    <>
      <section className="mx-auto max-w-3xl px-4 pt-10 sm:px-6 sm:pt-16">
        <div className="fade-in-on-load flex flex-col gap-5">
          <span
            className="w-fit rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]"
            style={{ borderColor: "var(--hairline-strong)" }}
          >
            Projeto open source
          </span>
          <h1 className="text-[clamp(32px,7vw,56px)] font-semibold leading-[1.07] tracking-tight text-[var(--text-primary)]">
            Transparência eleitoral, sem cor de partido.
          </h1>
          <p className="max-w-prose text-[19px] leading-relaxed text-[var(--text-secondary)] sm:text-[24px]">
            Um cruzamento público de dados de candidatos e candidatas: TSE, Portal da
            Transparência e Receita Federal, em um só lugar — para entender quem se
            candidata, com que partido, com que patrimônio e com que histórico.
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <Link
              href="/buscar"
              className="inline-flex h-11 items-center rounded-[10px] px-5 text-[15px] font-semibold"
              style={{ background: "var(--action-primary-bg)", color: "var(--action-primary-fg)" }}
            >
              Ver busca de candidatos
            </Link>
            <a
              href={`${REPO_URL}/stargazers`}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex h-11 items-center gap-1.5 rounded-[10px] border px-5 text-[15px] font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-1)]"
              style={{ borderColor: "var(--action-ghost-border)" }}
            >
              <IconStar />
              Curtir no GitHub
              {estatisticasRepo && (
                <span className="font-financial text-[var(--text-secondary)]">
                  · {estatisticasRepo.estrelas}
                </span>
              )}
            </a>
            <Link
              href="/participe"
              className="inline-flex h-11 items-center rounded-[10px] border px-5 text-[15px] font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-1)]"
              style={{ borderColor: "var(--action-ghost-border)" }}
            >
              Participar do projeto
            </Link>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex h-11 items-center rounded-[10px] border px-5 text-[15px] font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-1)]"
              style={{ borderColor: "var(--action-ghost-border)" }}
            >
              Código-fonte no GitHub ↗
            </a>
            <Link
              href="/status"
              className="inline-flex h-11 items-center rounded-[10px] border px-5 text-[15px] font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-1)]"
              style={{ borderColor: "var(--action-ghost-border)" }}
            >
              Status das fontes, ao vivo
            </Link>
          </div>
        </div>

        <Reveal
          className="mt-12 grid grid-cols-3 gap-4 border-t pt-8"
          style={{ borderColor: "var(--hairline)" }}
        >
          <CounterStat valor={27} rotulo="UFs cobertas pela busca" />
          <CounterStat valor={4} rotulo="fontes oficiais cruzadas" />
          <CounterStat valor={100} sufixo="%" rotulo="código aberto (CC BY 4.0)" />
        </Reveal>
      </section>

      <div className="mt-12">
        <SourceMarquee />
      </div>

      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <section>
          <h2 className="text-[28px] font-semibold text-[var(--text-primary)] sm:text-[32px]">
            O que o projeto faz
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {FEATURES.map((f, i) => {
              const { rotulo, cor, corFundo, Icone } = STATUS_CONFIG[f.status];
              return (
                <Reveal key={f.titulo} delayMs={i * 60}>
                  <div
                    className="h-full rounded-[18px] border p-4 sm:p-5"
                    style={{ borderColor: "var(--hairline)" }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-[17px] font-semibold text-[var(--text-primary)]">{f.titulo}</h3>
                      <span
                        className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
                        style={{ color: cor, background: corFundo }}
                      >
                        <Icone className="h-3 w-3" />
                        {rotulo}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{f.descricao}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-[28px] font-semibold text-[var(--text-primary)] sm:text-[32px]">
            Princípios do projeto
          </h2>
          <div className="mt-6 flex flex-col gap-4">
            {PRINCIPIOS.map((p, i) => (
              <Reveal key={p.titulo} delayMs={i * 60}>
                <div className="border-t pt-4" style={{ borderColor: "var(--hairline)" }}>
                  <h3 className="text-[17px] font-semibold text-[var(--text-primary)]">{p.titulo}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{p.descricao}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Link
            href="/participe"
            className="mt-6 inline-flex h-11 items-center rounded-[10px] border px-5 text-[15px] font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-1)]"
            style={{ borderColor: "var(--action-ghost-border)" }}
          >
            Vote com consciência e participe do projeto →
          </Link>
        </section>

        <Reveal className="mt-16">
          <section
            className="rounded-[18px] border p-5 sm:p-6"
            style={{ borderColor: "var(--hairline)", background: "var(--surface-1)" }}
          >
            <h2 className="text-[20px] font-semibold text-[var(--text-primary)]">Documentação completa</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Toda fonte de dado testada e validada, a arquitetura do sistema e as decisões de
              design estão documentadas no repositório:
            </p>
            <ul className="mt-3 flex flex-col gap-1.5 text-sm">
              <li>
                <a className="underline underline-offset-2" href={`${REPO_URL}/blob/main/docs/DATA_SOURCES.md`} target="_blank" rel="noreferrer noopener">
                  docs/DATA_SOURCES.md
                </a>{" "}
                — TSE, DivulgaCandContas, BrasilAPI, Portal da Transparência: endpoints, limites, testes reais
              </li>
              <li>
                <a className="underline underline-offset-2" href={`${REPO_URL}/blob/main/docs/ARCHITECTURE.md`} target="_blank" rel="noreferrer noopener">
                  docs/ARCHITECTURE.md
                </a>{" "}
                — pipeline de ingestão, proxies de API, modelo de dados
              </li>
              <li>
                <a className="underline underline-offset-2" href={`${REPO_URL}/blob/main/docs/DESIGN_SYSTEM.md`} target="_blank" rel="noreferrer noopener">
                  docs/DESIGN_SYSTEM.md
                </a>{" "}
                — identidade visual neutra (preto/branco) do projeto, do Instituto METADAX de Inovação
              </li>
              <li>
                <a className="underline underline-offset-2" href={`${REPO_URL}/blob/main/LICENSE`} target="_blank" rel="noreferrer noopener">
                  LICENSE
                </a>{" "}
                — CC BY 4.0
              </li>
            </ul>
          </section>
        </Reveal>
      </main>
    </>
  );
}
