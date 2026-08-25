import type { Metadata } from "next";
import Link from "next/link";
import { IconAlertTriangle, IconInfo } from "@/components/icons";

const REPO_URL = "https://github.com/pedrorosemberg/eleicoes.metadax.org";
const SUGERIR_URL = `${REPO_URL}/issues/new?labels=sugest%C3%A3o&title=%5Bsugest%C3%A3o%5D%20`;

export const metadata: Metadata = {
  title: "Roteiro e sugestões",
  description:
    "O que está planejado para o projeto, de onde vem cada dado, e como sugerir uma melhoria ou nova funcionalidade.",
  alternates: { canonical: "/roteiro" },
};

type StatusItem = "planejado" | "bloqueado";

const STATUS_CONFIG: Record<StatusItem, { rotulo: string; cor: string; corFundo: string; Icone: typeof IconInfo }> = {
  planejado: { rotulo: "planejado", cor: "var(--color-info)", corFundo: "var(--color-info-bg)", Icone: IconInfo },
  bloqueado: { rotulo: "bloqueado", cor: "var(--color-error)", corFundo: "var(--color-error-bg)", Icone: IconAlertTriangle },
};

interface ItemRoteiro {
  titulo: string;
  descricao: string;
  fonte: string;
  status: StatusItem;
}

const PLANEJADOS: ItemRoteiro[] = [
  {
    titulo: "Despesas pagas e doações originárias (detalhe de finanças)",
    descricao:
      "As finanças de campanha já mostram receitas e despesas contratadas (com SQ_CANDIDATO direto). Faltam duas tabelas mais detalhadas do mesmo ZIP — despesas efetivamente pagas e o doador originário por trás de cada receita — que exigem um join a mais (via SQ_DESPESA/SQ_RECEITA) ainda não implementado.",
    fonte: "TSE — dataset prestacao_de_contas_eleitorais_candidatos (mesmo ZIP já ingerido), coletado do site de dados abertos do TSE",
    status: "planejado",
  },
  {
    titulo: "Emendas parlamentares na Portal da Transparência",
    descricao:
      "O endpoint já está liberado no proxy interno do projeto (/api/transparencia/emendas), só falta incorporar ao resumo cruzado exibido no perfil do candidato.",
    fonte: "Portal da Transparência (CGU) — endpoint emendas, já mapeado em src/lib/enrichment.ts",
    status: "planejado",
  },
  {
    titulo: "Página do partido (/partido/[sigla])",
    descricao:
      "Dados cadastrais do partido via CNPJ e lista de todos os candidatos filiados numa UF, num único lugar. Também daria um lugar natural para exibir a prestação de contas de órgãos partidários e os CNPJs de campanha por partido, já ingeridos mas sem interface própria ainda.",
    fonte: "TSE (candidatos por partido, prestacao_de_contas_eleitorais_orgaos_partidarios) + Receita Federal via BrasilAPI (dados cadastrais)",
    status: "planejado",
  },
  {
    titulo: "CNPJ do partido no perfil do candidato",
    descricao:
      "Investigado em 25/08/2026: o dataset CNPJ_campanha tem ~120 mil entradas de diretório por partido (nacional, estadual e municipal, um CNPJ para cada), sem uma chave limpa que ligue a sigla do partido ao CNPJ nacional — o campo de nome é inconsistente (grafias diferentes, \"NACIONAL\" aparece tanto como nível de diretório quanto como parte do nome de partidos como o PMN). Cruzar por nome seria uma inferência não confiável, então fica de fora até existir uma lista curada e verificada dos ~30 CNPJs nacionais dos partidos (não gerada por correspondência automática).",
    fonte: "TSE — dataset CNPJ_campanha, já ingerido (ver docs/DATA_SOURCES.md §1)",
    status: "planejado",
  },
];

const BLOQUEADOS: ItemRoteiro[] = [
  {
    titulo: "Site oficial (link direto) e histórico de candidaturas anteriores ao vivo",
    descricao:
      "Dependem do sistema DivulgaCandContas do TSE, que exige um código de município na URL de consulta — código que não existe em consulta_cand para candidaturas estaduais/federais nos dados coletados até agora. Sem esse código, essa consulta ao vivo não pode ser feita com confiança.",
    fonte: "TSE — DivulgaCandContas (ver docs/DATA_SOURCES.md §5 para o achado completo)",
    status: "bloqueado",
  },
];

const SUGESTOES_COMUNIDADE = [
  {
    titulo: "Comparador de candidatos lado a lado",
    descricao: "Selecionar 2–3 candidatos e ver bens, partido e histórico numa tabela comparativa.",
  },
  {
    titulo: "Exportação dos dados agregados em CSV",
    descricao:
      "Hoje só há JSON via /api/estatisticas — um CSV facilitaria o uso por quem faz análise em planilha, não em código.",
  },
  {
    titulo: "Consulta de CNPJs de campanha",
    descricao:
      "O dataset CNPJ_campanha do TSE já foi ingerido (140 mil CNPJs de candidatos e partidos), mas não cruza com um candidato específico — o arquivo de origem só traz CNPJ + nome fiscal, sem o SQ_CANDIDATO que os outros datasets têm. Uma busca própria por CNPJ/nome, sem tentar adivinhar o candidato dono, resolveria isso sem risco de associar o CNPJ errado a alguém.",
  },
  {
    titulo: "Aprofundar o mapa por cargo",
    descricao:
      "Hoje o /mapa mostra o total de candidatos por UF; um filtro por cargo (só deputados estaduais, só senadores etc.) daria uma leitura mais específica.",
  },
];

export default function RoteiroPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
      <h1 className="text-[clamp(28px,6vw,40px)] font-semibold text-[var(--text-primary)]">
        Roteiro e sugestões
      </h1>
      <p className="mt-3 max-w-prose text-[17px] leading-relaxed text-[var(--text-secondary)]">
        O que está planejado para o projeto, com a fonte de cada item — e como sugerir algo novo.
        Nenhum item aqui tem prazo prometido; é um projeto de código aberto mantido conforme o
        tempo disponível (ver{" "}
        <Link className="underline underline-offset-2" href="/participe">
          /participe
        </Link>{" "}
        para ajudar a acelerar). Para o que já está funcionando hoje, veja{" "}
        <Link className="underline underline-offset-2" href="/">
          a home
        </Link>
        .
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <a
          href={SUGERIR_URL}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex h-11 items-center rounded-[10px] px-5 text-[15px] font-semibold"
          style={{ background: "var(--action-primary-bg)", color: "var(--action-primary-fg)" }}
        >
          Sugerir uma melhoria ou dado novo
        </a>
        <Link
          href="/atualizacoes"
          className="inline-flex h-11 items-center rounded-[10px] border px-5 text-[15px] font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-1)]"
          style={{ borderColor: "var(--action-ghost-border)" }}
        >
          Ver issues e atualizações
        </Link>
      </div>

      <section className="mt-10">
        <h2 className="text-[22px] font-semibold text-[var(--text-primary)]">Planejado</h2>
        <p className="mt-1 text-sm text-[var(--text-tertiary)]">
          Caminho claro para implementar — falta só a ingestão do dado (ver{" "}
          <Link className="underline underline-offset-2" href="/participe">
            como ajudar a coletar
          </Link>
          ).
        </p>
        <ul className="mt-4 flex flex-col gap-4">
          {PLANEJADOS.map((item) => (
            <ItemCard key={item.titulo} item={item} />
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-[22px] font-semibold text-[var(--text-primary)]">Bloqueado</h2>
        <p className="mt-1 text-sm text-[var(--text-tertiary)]">
          Depende de algo fora do controle do projeto — não é falta de tempo, é um obstáculo real.
        </p>
        <ul className="mt-4 flex flex-col gap-4">
          {BLOQUEADOS.map((item) => (
            <ItemCard key={item.titulo} item={item} />
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-[22px] font-semibold text-[var(--text-primary)]">
          Sugestões em aberto (sem compromisso)
        </h2>
        <p className="mt-1 text-sm text-[var(--text-tertiary)]">
          Ideias levantadas mas ainda sem decisão de implementar — vote ou discuta abrindo um issue.
        </p>
        <ul className="mt-4 flex flex-col gap-4">
          {SUGESTOES_COMUNIDADE.map((item) => (
            <li key={item.titulo} className="rounded-[18px] border p-4" style={{ borderColor: "var(--hairline)" }}>
              <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">{item.titulo}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">{item.descricao}</p>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-10 text-sm text-[var(--text-tertiary)]">
        Tem uma ideia que não está aqui?{" "}
        <a className="underline underline-offset-2" href={SUGERIR_URL} target="_blank" rel="noreferrer noopener">
          Abra um issue sugerindo
        </a>{" "}
        — toda sugestão com fonte de dado identificada tem prioridade sobre ideias sem fonte clara.
      </p>
    </main>
  );
}

function ItemCard({ item }: { item: ItemRoteiro }) {
  const { rotulo, cor, corFundo, Icone } = STATUS_CONFIG[item.status];
  return (
    <li className="rounded-[18px] border p-4" style={{ borderColor: "var(--hairline)" }}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">{item.titulo}</h3>
        <span
          className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: cor, background: corFundo }}
        >
          <Icone />
          {rotulo}
        </span>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">{item.descricao}</p>
      <p className="mt-2 text-xs text-[var(--text-tertiary)]">Fonte: {item.fonte}</p>
    </li>
  );
}
