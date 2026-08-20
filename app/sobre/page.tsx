import type { Metadata } from "next";

const REPO_URL = "https://github.com/pedrorosemberg/eleicoes.metadax.org";

export const metadata: Metadata = {
  title: "Sobre e fontes",
  description:
    "Metodologia, fontes de dados e licença do projeto Eleições — METADAX. TSE, Portal da Transparência e Receita Federal.",
};

export default function SobrePage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
      <h1 className="text-[clamp(28px,6vw,40px)] font-semibold text-[var(--text-primary)]">
        Sobre este projeto
      </h1>
      <p className="mt-4 text-[17px] leading-relaxed text-[var(--text-secondary)]">
        O <strong>Eleições — METADAX</strong> cruza dados públicos de candidatos às eleições
        brasileiras — origem no Tribunal Superior Eleitoral (TSE) — com dados de CNPJ da
        Receita Federal e com o Portal da Transparência da Controladoria-Geral da União
        (CGU). O objetivo é permitir consultar, num só lugar, quem é candidato, por qual
        partido, com que patrimônio declarado e se há contratos públicos federais, sanções
        ou status de Pessoa Exposta Politicamente ligados a essa pessoa.
      </p>

      <h2 className="mt-10 text-[22px] font-semibold text-[var(--text-primary)]">
        Por que não usamos cor por partido
      </h2>
      <p className="mt-3 text-[17px] leading-relaxed text-[var(--text-secondary)]">
        A interface é intencionalmente restrita a tema claro, preto e branco. Não usamos
        azul, vermelho, verde ou amarelo para diferenciar candidatos, partidos ou status —
        justamente para não sugerir associação com qualquer legenda. Diferenciação vem de
        tipografia, ícones e texto explícito, nunca de cor.
      </p>

      <h2 className="mt-10 text-[22px] font-semibold text-[var(--text-primary)]">
        Fontes de dados
      </h2>
      <ul className="mt-3 flex flex-col gap-2 text-[17px] text-[var(--text-secondary)]">
        <li>
          <strong className="text-[var(--text-primary)]">TSE — Dados Abertos:</strong> lista
          de candidatos, partido, situação, bens declarados.
        </li>
        <li>
          <strong className="text-[var(--text-primary)]">TSE — DivulgaCandContas:</strong>{" "}
          site oficial, plano de governo, histórico de candidaturas anteriores.
        </li>
        <li>
          <strong className="text-[var(--text-primary)]">BrasilAPI (Receita Federal):</strong>{" "}
          dados cadastrais de CNPJ de partidos e empresas.
        </li>
        <li>
          <strong className="text-[var(--text-primary)]">Portal da Transparência (CGU):</strong>{" "}
          contratos federais, PEP, sanções.
        </li>
      </ul>
      <p className="mt-3 text-[15px] text-[var(--text-tertiary)]">
        Detalhamento completo — endpoints, limites de uso, testes realizados e o que cada
        fonte cobre ou não cobre — em{" "}
        <a className="underline underline-offset-2" href={`${REPO_URL}/blob/main/docs/DATA_SOURCES.md`} target="_blank" rel="noreferrer noopener">
          docs/DATA_SOURCES.md
        </a>
        .
      </p>

      <h2 className="mt-10 text-[22px] font-semibold text-[var(--text-primary)]">
        Licença e código aberto
      </h2>
      <p className="mt-3 text-[17px] leading-relaxed text-[var(--text-secondary)]">
        O conteúdo e o código deste projeto estão sob{" "}
        <a
          className="underline underline-offset-2"
          href="https://creativecommons.org/licenses/by/4.0/"
          target="_blank"
          rel="noreferrer noopener"
        >
          Creative Commons Attribution 4.0 International (CC BY 4.0)
        </a>
        . O repositório é público:{" "}
        <a className="underline underline-offset-2" href={REPO_URL} target="_blank" rel="noreferrer noopener">
          github.com/pedrorosemberg/eleicoes.metadax.org
        </a>
        .
      </p>

      <h2 className="mt-10 text-[22px] font-semibold text-[var(--text-primary)]">Marca</h2>
      <p className="mt-3 text-[17px] leading-relaxed text-[var(--text-secondary)]">
        Design e identidade visual seguem o Design System e o Manual de Marca da METADAX.
        A METADAX é uma marca da METADAX CONSULTORIA LTDA (CNPJ 65.640.808/0001-89).
      </p>
    </main>
  );
}
