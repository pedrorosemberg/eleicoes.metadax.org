import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Usos autorizados dos dados e do serviço do Eleições — METADAX.",
};

export default function TermosPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
      <h1 className="text-[clamp(28px,6vw,40px)] font-semibold text-[var(--text-primary)]">
        Termos de Uso
      </h1>
      <p className="mt-3 text-sm text-[var(--text-tertiary)]">
        Última atualização: agosto de 2026.
      </p>

      <p className="mt-6 max-w-prose text-[17px] leading-relaxed text-[var(--text-secondary)]">
        O <strong>Eleições — METADAX</strong> é um projeto de código aberto e interesse
        público do{" "}
        <a className="underline underline-offset-2" href="https://imi.metadax.org" target="_blank" rel="noreferrer noopener">
          Instituto METADAX de Inovação (IMI)
        </a>{" "}
        —{" "}
        <a className="underline underline-offset-2" href="https://www.metadax.org" target="_blank" rel="noreferrer noopener">
          metadax.org
        </a>
        . Estes termos são específicos deste site; como iniciativa vinculada à METADAX, o
        uso também está sujeito, no que for aplicável, aos{" "}
        <a
          className="underline underline-offset-2"
          href="https://www.metadax.com.br/termos-de-uso"
          target="_blank"
          rel="noreferrer noopener"
        >
          Termos de Uso gerais da METADAX
        </a>
        .

      </p>

      <h2 className="mt-10 text-[22px] font-semibold text-[var(--text-primary)]">O que este site é</h2>
      <p className="mt-3 text-[17px] leading-relaxed text-[var(--text-secondary)]">
        Uma ferramenta de consulta pública que cruza dados oficiais já públicos — TSE,
        Portal da Transparência (CGU) e Receita Federal (via BrasilAPI) — sem alterar,
        reinterpretar ou atribuir juízo de valor a esses dados. Não é um site oficial do
        governo, de nenhum partido, candidato ou coligação, e não recebe ou processa
        pagamentos, doações ou qualquer forma de apoio a campanha.
      </p>

      <h2 className="mt-10 text-[22px] font-semibold text-[var(--text-primary)]">Usos autorizados</h2>
      <ul className="mt-3 flex flex-col gap-1.5 text-[17px] text-[var(--text-secondary)]">
        <li>Consultar candidatos, partidos e os dados cruzados exibidos, livremente e sem necessidade de cadastro.</li>
        <li>Consumir os endpoints públicos em <code className="font-financial text-sm">/api/*</code> (aberto a qualquer origem) para fins não abusivos.</li>
        <li>Reutilizar, citar e redistribuir o conteúdo original deste projeto (documentação, código, agregados), respeitando a licença <a className="underline underline-offset-2" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer noopener">CC BY 4.0</a> — atribuição obrigatória.</li>
      </ul>

      <h2 className="mt-10 text-[22px] font-semibold text-[var(--text-primary)]">Usos não autorizados</h2>
      <ul className="mt-3 flex flex-col gap-1.5 text-[17px] text-[var(--text-secondary)]">
        <li>Apresentar os dados aqui exibidos como se fossem produzidos ou avalizados pelo TSE, pela CGU, pela Receita Federal ou por qualquer órgão público — a fonte de cada dado é sempre a original, este site só cruza e exibe.</li>
        <li>Automatizar consultas em volume que sobrecarregue as fontes de dados que este site consulta (BrasilAPI, Portal da Transparência) além do razoável.</li>
        <li>Usar o serviço para fins ilegais, para desinformação eleitoral, ou para qualquer forma de assédio a candidatos ou terceiros citados nos dados.</li>
        <li>Reivindicar exclusividade ou direito autoral sobre dados de origem pública (TSE/CGU/Receita Federal) — eles continuam públicos independentemente deste site.</li>
      </ul>

      <h2 className="mt-10 text-[22px] font-semibold text-[var(--text-primary)]">Isenção de responsabilidade</h2>
      <p className="mt-3 text-[17px] leading-relaxed text-[var(--text-secondary)]">
        Os dados exibidos vêm de terceiros (TSE, CGU, Receita Federal) e podem estar
        desatualizados, incompletos ou conter erros da fonte original — a data do último
        snapshot é sempre exibida junto aos dados. Este projeto não garante exatidão,
        completude ou atualidade em tempo real, e não se responsabiliza por decisões
        tomadas com base nesses dados. Em caso de divergência, a fonte oficial (TSE, CGU)
        prevalece sempre.
      </p>

      <h2 className="mt-10 text-[22px] font-semibold text-[var(--text-primary)]">Alterações</h2>
      <p className="mt-3 text-[17px] leading-relaxed text-[var(--text-secondary)]">
        Estes termos podem mudar conforme o projeto evolui. A versão vigente é sempre a
        publicada nesta página e no{" "}
        <a
          className="underline underline-offset-2"
          href="https://github.com/pedrorosemberg/eleicoes.metadax.org"
          target="_blank"
          rel="noreferrer noopener"
        >
          repositório público
        </a>
        .
      </p>
    </main>
  );
}
