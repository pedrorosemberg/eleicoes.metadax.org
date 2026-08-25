import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Usos autorizados dos dados e do serviço do Fato Eleitoral.",
  alternates: { canonical: "/termos" },
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
        O <strong>Fato Eleitoral</strong> é um projeto de código aberto e interesse
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

      <h2 className="mt-10 text-[22px] font-semibold text-[var(--text-primary)]">
        Infraestrutura, ferramentas e como este site foi construído
      </h2>
      <p className="mt-3 text-[17px] leading-relaxed text-[var(--text-secondary)]">
        Por transparência, e porque revisamos explicitamente os termos de uso de cada uma antes
        de publicar este projeto (ver{" "}
        <a
          className="underline underline-offset-2"
          href="https://github.com/pedrorosemberg/eleicoes.metadax.org/blob/main/docs/DATA_SOURCES.md"
          target="_blank"
          rel="noreferrer noopener"
        >
          docs/DATA_SOURCES.md
        </a>{" "}
        §9):
      </p>
      <ul className="mt-3 flex flex-col gap-1.5 text-[17px] text-[var(--text-secondary)]">
        <li>
          <strong className="text-[var(--text-primary)]">Hospedagem:</strong> Vercel (funções
          serverless, CDN, build) — uso padrão de hospedagem web, sob os{" "}
          <a
            className="underline underline-offset-2"
            href="https://vercel.com/legal/terms"
            target="_blank"
            rel="noreferrer noopener"
          >
            Termos de Serviço
          </a>{" "}
          e{" "}
          <a
            className="underline underline-offset-2"
            href="https://vercel.com/legal/acceptable-use-policy"
            target="_blank"
            rel="noreferrer noopener"
          >
            Política de Uso Aceitável
          </a>{" "}
          da Vercel. Este site não usa nenhum produto de IA da Vercel para gerar, processar ou
          transmitir conteúdo de campanha eleitoral — só hospeda uma aplicação Next.js padrão que
          exibe dados públicos, sem promover ou se opor a nenhum candidato.
        </li>
        <li>
          <strong className="text-[var(--text-primary)]">Código-fonte e controle de versão:</strong>{" "}
          GitHub, repositório público, sob os{" "}
          <a
            className="underline underline-offset-2"
            href="https://docs.github.com/en/site-policy/github-terms/github-terms-of-service"
            target="_blank"
            rel="noreferrer noopener"
          >
            Termos de Serviço do GitHub
          </a>
          . A página{" "}
          <a className="underline underline-offset-2" href="/atualizacoes">
            /atualizacoes
          </a>{" "}
          consulta a API pública do GitHub em uso normal (sem automação abusiva, sem exceder
          limite de taxa), permitido pela seção &quot;API Terms&quot; desses Termos.
        </li>
        <li>
          <strong className="text-[var(--text-primary)]">Framework e bibliotecas:</strong>{" "}
          Next.js, React, Tailwind CSS e demais dependências open source listadas em{" "}
          <code className="font-financial text-sm">package.json</code>, cada uma sob sua própria
          licença (majoritariamente MIT).
        </li>
        <li>
          <strong className="text-[var(--text-primary)]">Assistência de desenvolvimento por IA:</strong>{" "}
          partes do código, da documentação e da ingestão de dados deste projeto foram
          desenvolvidas com apoio do{" "}
          <a
            className="underline underline-offset-2"
            href="https://www.anthropic.com/claude"
            target="_blank"
            rel="noreferrer noopener"
          >
            Claude, da Anthropic
          </a>
          , como ferramenta de programação assistida — usada por um responsável humano que revisa,
          testa e decide o que é publicado. A IA não seleciona nem edita o conteúdo dos dados de
          candidatos exibidos (esses vêm sempre da fonte oficial, sem interpretação); seu uso se
          limita ao desenvolvimento e à manutenção do software em si.
        </li>
      </ul>

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
