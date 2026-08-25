import type { Metadata } from "next";
import Link from "next/link";
import { IconCheckCircle } from "@/components/icons";

const REPO_URL = "https://github.com/pedrorosemberg/eleicoes.metadax.org";

export const metadata: Metadata = {
  title: "Participe",
  description:
    "Vote com consciência e ajude a manter o Fato Eleitoral: reporte dados, contribua com código, valide fontes.",
  alternates: { canonical: "/participe" },
};

const DICAS_VOTO = [
  "Confira o histórico de candidaturas anteriores do candidato, não só a promessa desta eleição.",
  "Veja o patrimônio declarado — não para julgar por si só, mas para comparar com o que a pessoa diz representar.",
  "Cheque se há contratos públicos, sanções ou status de Pessoa Exposta Politicamente ligados ao nome — informação pública, não acusação.",
  "Leia o plano de governo além do discurso de campanha, quando disponível.",
  "Desconfie de informação sem fonte — peça sempre o dado oficial (TSE, CGU, Receita Federal), nunca um print sem origem.",
  "Nenhum dado aqui diz em quem votar — a decisão é sempre sua, informada.",
];

const FORMAS_DE_AJUDAR = [
  {
    titulo: "Reportar um problema",
    descricao:
      "Achou um dado errado, um link quebrado, ou algo que não faz sentido? Abra uma issue no GitHub descrevendo o que viu e, se possível, o link da página.",
    link: `${REPO_URL}/issues/new`,
    linkTexto: "Abrir uma issue ↗",
  },
  {
    titulo: "Sugerir uma melhoria ou dado novo",
    descricao:
      "Veja o que já está planejado — e o que ainda é só ideia — em /roteiro, cada item com a fonte de dado correspondente. Uma sugestão com fonte identificada tem prioridade sobre uma sem fonte clara.",
    link: "/roteiro",
    linkTexto: "Ver o roteiro →",
  },
  {
    titulo: "Contribuir com código",
    descricao:
      "Faça um fork, crie uma branch, e abra um Pull Request. Antes de submeter: rode npm run lint e npm run build localmente — mudanças que quebram o build não são aceitas. Descreva o que mudou e por quê.",
    link: `${REPO_URL}/pulls`,
    linkTexto: "Ver Pull Requests ↗",
  },
  {
    titulo: "Rodar a ingestão de uma rede que funcione",
    descricao:
      "O TSE bloqueia o download dos dados oficiais a partir do ambiente de desenvolvimento e de produção usados neste projeto (ver docs/DATA_SOURCES.md). Se você conseguir rodar npm run ingest -- --ano=2026 de uma rede brasileira sem esse bloqueio, o resultado (pasta data/) é uma contribuição real — abra um PR com os arquivos gerados.",
    link: `${REPO_URL}/blob/main/scripts/ingest-tse.ts`,
    linkTexto: "Ver o script de ingestão ↗",
  },
  {
    titulo: "Validar e documentar fontes de dados",
    descricao:
      "Achou um endpoint, um dataset ou uma API pública que cruza com o que este projeto já faz? Documente como foi testado (não só a URL) e proponha a inclusão.",
    link: `${REPO_URL}/blob/main/docs/DATA_SOURCES.md`,
    linkTexto: "Ver docs/DATA_SOURCES.md ↗",
  },
  {
    titulo: "Melhorar a documentação",
    descricao:
      "Documentação clara é parte do produto aqui, não um extra. Erros de digitação, explicações confusas ou passos desatualizados também merecem PR.",
    link: `${REPO_URL}/tree/main/docs`,
    linkTexto: "Ver a documentação ↗",
  },
];

export default function ParticipePage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
      <h1 className="text-[clamp(28px,6vw,40px)] font-semibold text-[var(--text-primary)]">
        Participe
      </h1>
      <p className="mt-4 max-w-prose text-[17px] leading-relaxed text-[var(--text-secondary)]">
        Este projeto existe para ajudar duas coisas: você votar com mais informação, e a
        comunidade manter uma ferramenta de transparência eleitoral que não depende de
        nenhum partido, candidato ou governo para continuar existindo.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/buscar"
          className="inline-flex h-11 items-center rounded-[10px] px-5 text-[15px] font-semibold"
          style={{ background: "var(--action-primary-bg)", color: "var(--action-primary-fg)" }}
        >
          Consultar candidatos
        </Link>
        <a
          href={`${REPO_URL}/issues`}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex h-11 items-center rounded-[10px] border px-5 text-[15px] font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-1)]"
          style={{ borderColor: "var(--action-ghost-border)" }}
        >
          Issues no GitHub ↗
        </a>
      </div>

      <h2 className="mt-12 text-[22px] font-semibold text-[var(--text-primary)]">
        Vote com consciência
      </h2>
      <ul className="mt-4 flex flex-col gap-3">
        {DICAS_VOTO.map((dica) => (
          <li key={dica} className="flex items-start gap-2.5 text-[15px] text-[var(--text-secondary)]">
            <span className="mt-0.5 shrink-0" style={{ color: "var(--color-success)" }}>
              <IconCheckCircle />
            </span>
            {dica}
          </li>
        ))}
      </ul>

      <h2 className="mt-12 text-[22px] font-semibold text-[var(--text-primary)]">
        Grupo do WhatsApp
      </h2>
      <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-[var(--text-secondary)]">
        Grupo aberto para discussão sobre o projeto — dúvida, sugestão, achar parceiro para
        contribuir com código ou com dado. Grupos de WhatsApp têm um limite de membros definido
        pelo próprio WhatsApp (hoje 1.024 participantes); se este grupo atingir o limite, um novo
        grupo será criado e o link aqui nesta página será atualizado para o novo — esta página é
        sempre a fonte do link atual, não uma cópia que pode ficar desatualizada em outro lugar.
      </p>
      <a
        href="https://chat.whatsapp.com/GCXdQNeT7J6FfqkQcqgVKQ"
        target="_blank"
        rel="noreferrer noopener"
        className="mt-4 inline-flex h-11 items-center rounded-[10px] border px-5 text-[15px] font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-1)]"
        style={{ borderColor: "var(--action-ghost-border)" }}
      >
        Entrar no grupo do WhatsApp ↗
      </a>

      <h2 className="mt-12 text-[22px] font-semibold text-[var(--text-primary)]">
        Como ajudar o projeto
      </h2>
      <p className="mt-3 text-[15px] text-[var(--text-tertiary)]">
        Padrão de qualquer projeto open source: fork → branch → commit claro → Pull Request.
        Toda contribuição é revisada antes de entrar no repositório principal.
      </p>
      <div className="mt-6 flex flex-col gap-5">
        {FORMAS_DE_AJUDAR.map((f) => (
          <div key={f.titulo} className="rounded-[18px] border p-4 sm:p-5" style={{ borderColor: "var(--hairline)" }}>
            <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">{f.titulo}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">{f.descricao}</p>
            {f.link.startsWith("/") ? (
              <Link
                href={f.link}
                className="mt-2 inline-block text-sm underline underline-offset-2 text-[var(--text-primary)]"
              >
                {f.linkTexto}
              </Link>
            ) : (
              <a
                href={f.link}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-2 inline-block text-sm underline underline-offset-2 text-[var(--text-primary)]"
              >
                {f.linkTexto}
              </a>
            )}
          </div>
        ))}
      </div>

      <h2 className="mt-12 text-[22px] font-semibold text-[var(--text-primary)]">Conduta</h2>
      <p className="mt-3 text-[17px] leading-relaxed text-[var(--text-secondary)]">
        Este é um espaço de dado público, não de disputa partidária. Contribuições que
        tentem inserir viés, cor de partido, ou opinião não sustentada por fonte oficial não
        são aceitas — ver{" "}
        <Link href="/sobre" className="underline underline-offset-2">
          /sobre
        </Link>{" "}
        para os princípios do projeto. Fora isso, toda ajuda é bem-vinda, de qualquer nível de
        experiência técnica.
      </p>
      <p className="mt-4 text-sm text-[var(--text-tertiary)]">
        Código e conteúdo licenciados sob{" "}
        <a className="underline underline-offset-2" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer noopener">
          CC BY 4.0
        </a>
        .
      </p>
    </main>
  );
}
