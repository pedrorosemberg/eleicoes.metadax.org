import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Quais dados este site coleta, para quê, e como são usados.",
  alternates: { canonical: "/privacidade" },
};

export default function PrivacidadePage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
      <h1 className="text-[clamp(28px,6vw,40px)] font-semibold text-[var(--text-primary)]">
        Política de Privacidade
      </h1>
      <p className="mt-3 text-sm text-[var(--text-tertiary)]">
        Última atualização: agosto de 2026.
      </p>

      <p className="mt-6 max-w-prose text-[17px] leading-relaxed text-[var(--text-secondary)]">
        O <strong>Eleições — METADAX</strong> é um projeto do{" "}
        <a className="underline underline-offset-2" href="https://imi.metadax.org" target="_blank" rel="noreferrer noopener">
          Instituto METADAX de Inovação (IMI)
        </a>
        . Este site não exige cadastro, login ou envio de dados pessoais para ser usado — a
        consulta de candidatos é 100% pública e anônima. Esta página descreve, com
        transparência, tudo o que é coletado sobre quem visita o site.
      </p>

      <h2 className="mt-10 text-[22px] font-semibold text-[var(--text-primary)]">
        O que coletamos e por quê
      </h2>

      <h3 className="mt-6 text-[17px] font-semibold text-[var(--text-primary)]">
        Analytics de audiência (Vercel Web Analytics)
      </h3>
      <p className="mt-2 text-[17px] leading-relaxed text-[var(--text-secondary)]">
        Usamos o{" "}
        <a className="underline underline-offset-2" href="https://vercel.com/docs/analytics" target="_blank" rel="noreferrer noopener">
          Vercel Web Analytics
        </a>{" "}
        para entender quantas pessoas visitam o site, quais páginas são mais acessadas e de
        onde vêm (país/região, tipo de dispositivo, página de origem). Essa ferramenta é
        desenhada para não usar cookies e não registrar o IP completo do visitante — os
        dados são agregados, não identificam uma pessoa específica.
      </p>

      <h3 className="mt-6 text-[17px] font-semibold text-[var(--text-primary)]">
        Desempenho técnico (Vercel Speed Insights)
      </h3>
      <p className="mt-2 text-[17px] leading-relaxed text-[var(--text-secondary)]">
        Medimos métricas de performance do carregamento das páginas (tempo de carregamento,
        estabilidade visual), para saber se o site está rápido o bastante — sem identificar
        quem acessou.
      </p>

      <h3 className="mt-6 text-[17px] font-semibold text-[var(--text-primary)]">
        Eventos de uso da busca
      </h3>
      <p className="mt-2 text-[17px] leading-relaxed text-[var(--text-secondary)]">
        Quando alguém faz uma busca em <code className="font-financial text-sm">/buscar</code>,
        registramos um evento anônimo com a <em>forma</em> da busca — se foi direta ou por
        filtro, e quais campos foram usados (ex.: UF = &quot;SP&quot;, cargo preenchido) —
        para entender quais funcionalidades são mais usadas. <strong>Nunca registramos o
        texto livre que a pessoa digitou</strong> (nome ou número buscado), só a estrutura
        do filtro.
      </p>

      <h3 className="mt-6 text-[17px] font-semibold text-[var(--text-primary)]">
        Logs de servidor
      </h3>
      <p className="mt-2 text-[17px] leading-relaxed text-[var(--text-secondary)]">
        Como qualquer aplicação hospedada na Vercel, requisições passam por logs técnicos
        padrão de infraestrutura (data/hora, rota acessada, código de resposta) usados
        apenas para operação e depuração, com retenção limitada pela própria Vercel.
      </p>

      <h2 className="mt-10 text-[22px] font-semibold text-[var(--text-primary)]">
        O que NÃO coletamos
      </h2>
      <ul className="mt-3 flex flex-col gap-1.5 text-[17px] text-[var(--text-secondary)]">
        <li>Não pedimos nome, e-mail, CPF ou qualquer dado de identificação do visitante.</li>
        <li>Não usamos cookies de rastreamento publicitário nem pixels de terceiros para anúncios.</li>
        <li>Não vendemos, compartilhamos ou monetizamos dados de visitantes.</li>
      </ul>

      <h2 className="mt-10 text-[22px] font-semibold text-[var(--text-primary)]">
        Sobre os dados de candidatos exibidos
      </h2>
      <p className="mt-3 text-[17px] leading-relaxed text-[var(--text-secondary)]">
        Os dados de candidatos (nome, partido, bens declarados etc.) não são &quot;dados de
        usuário&quot; — são dados públicos por força da legislação eleitoral brasileira,
        obtidos do TSE, da Receita Federal (via BrasilAPI) e do Portal da Transparência
        (CGU). Ver{" "}
        <a
          className="underline underline-offset-2"
          href="https://github.com/pedrorosemberg/eleicoes.metadax.org/blob/main/docs/DATA_SOURCES.md"
          target="_blank"
          rel="noreferrer noopener"
        >
          docs/DATA_SOURCES.md
        </a>{" "}
        §7 para o detalhamento legal e de LGPD dessa distinção.
      </p>

      <h2 className="mt-10 text-[22px] font-semibold text-[var(--text-primary)]">
        Infraestrutura e ferramentas usadas para publicar este site
      </h2>
      <p className="mt-3 text-[17px] leading-relaxed text-[var(--text-secondary)]">
        Nenhuma delas recebe dado pessoal de quem visita o site além do que já está descrito
        acima (Vercel Analytics/Speed Insights e logs técnicos de infraestrutura):
      </p>
      <ul className="mt-3 flex flex-col gap-1.5 text-[17px] text-[var(--text-secondary)]">
        <li>
          <strong className="text-[var(--text-primary)]">Vercel</strong> — hospedagem, funções
          serverless e CDN. Ver{" "}
          <a
            className="underline underline-offset-2"
            href="https://vercel.com/legal/privacy-notice"
            target="_blank"
            rel="noreferrer noopener"
          >
            Aviso de Privacidade da Vercel
          </a>
          .
        </li>
        <li>
          <strong className="text-[var(--text-primary)]">GitHub</strong> — código-fonte público e
          rastreamento de issues; a página{" "}
          <a className="underline underline-offset-2" href="/atualizacoes">
            /atualizacoes
          </a>{" "}
          consulta a API pública do GitHub a partir do servidor (nunca do navegador de quem
          visita), então nenhum dado do visitante é enviado ao GitHub por causa dela.
        </li>
      </ul>
      <p className="mt-3 text-[17px] leading-relaxed text-[var(--text-secondary)]">
        Detalhes completos de todas as ferramentas usadas para desenvolver e publicar este site
        — incluindo o uso de IA como apoio ao desenvolvimento — estão em{" "}
        <a className="underline underline-offset-2" href="/termos">
          /termos
        </a>
        .
      </p>

      <h2 className="mt-10 text-[22px] font-semibold text-[var(--text-primary)]">Contato</h2>
      <p className="mt-3 text-[17px] leading-relaxed text-[var(--text-secondary)]">
        Dúvidas sobre esta política: veja os canais institucionais em{" "}
        <a className="underline underline-offset-2" href="https://imi.metadax.org" target="_blank" rel="noreferrer noopener">
          imi.metadax.org
        </a>
        .
      </p>
    </main>
  );
}
