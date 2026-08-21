import "server-only";
import { USER_AGENT } from "./http";

/**
 * Espelha issues, pull requests e releases do repositório público no
 * GitHub — para a página /atualizacoes ("segurança e atualizações"), que
 * existe para não obrigar quem acompanha o projeto a manter duas fontes
 * sincronizadas manualmente (GitHub e o site). Usa a API REST pública,
 * sem autenticação — uso normal e dentro do permitido pelos Termos de
 * Serviço do GitHub, seção "API Terms" (não é scraping, não excede limite
 * de taxa, não é para fins de spam/revenda): 60 requisições/hora por IP
 * sem token, o que o `revalidate` abaixo respeita com folga.
 *
 * Degrada graciosamente: se o GitHub estiver fora do ar, com rate limit
 * excedido, ou inacessível a partir do ambiente de execução, a página
 * mostra um aviso em vez de quebrar — mesmo padrão do resto do projeto
 * (ver src/lib/enrichment.ts).
 */

const REPO = "pedrorosemberg/eleicoes.metadax.org";
const GITHUB_API_BASE = `https://api.github.com/repos/${REPO}`;
const REVALIDATE_SEGUNDOS = 600; // 10 min — sincronizado o bastante sem se aproximar do limite de taxa

export interface AtualizacaoGitHub {
  numero: number;
  titulo: string;
  url: string;
  estado: "aberto" | "fechado" | "mesclado";
  tipo: "issue" | "pull_request";
  labels: string[];
  criadoEm: string;
  atualizadoEm: string;
  autor: string | null;
}

export interface ReleaseGitHub {
  nome: string;
  tag: string;
  url: string;
  publicadoEm: string | null;
  corpo: string | null;
  prerelease: boolean;
}

async function buscarGitHub<T>(caminho: string): Promise<T | null> {
  try {
    const res = await fetch(`${GITHUB_API_BASE}${caminho}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": USER_AGENT,
      },
      next: { revalidate: REVALIDATE_SEGUNDOS },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

interface IssueBruta {
  number: number;
  title: string;
  html_url: string;
  state: "open" | "closed";
  state_reason?: string | null;
  pull_request?: { merged_at: string | null };
  labels: Array<{ name: string } | string>;
  created_at: string;
  updated_at: string;
  user: { login: string } | null;
}

function mapearIssue(bruta: IssueBruta): AtualizacaoGitHub {
  const ehPr = Boolean(bruta.pull_request);
  const mesclado = ehPr && Boolean(bruta.pull_request?.merged_at);
  return {
    numero: bruta.number,
    titulo: bruta.title,
    url: bruta.html_url,
    estado: mesclado ? "mesclado" : bruta.state === "open" ? "aberto" : "fechado",
    tipo: ehPr ? "pull_request" : "issue",
    labels: bruta.labels.map((l) => (typeof l === "string" ? l : l.name)),
    criadoEm: bruta.created_at,
    atualizadoEm: bruta.updated_at,
    autor: bruta.user?.login ?? null,
  };
}

/**
 * `GET /issues` do GitHub já inclui pull requests (com o campo
 * `pull_request` presente) — não precisa de uma segunda chamada.
 */
export async function buscarAtualizacoesGitHub(): Promise<AtualizacaoGitHub[] | null> {
  const brutas = await buscarGitHub<IssueBruta[]>(
    "/issues?state=all&sort=updated&direction=desc&per_page=30",
  );
  if (!brutas) return null;
  return brutas.map(mapearIssue);
}

interface ReleaseBruta {
  name: string | null;
  tag_name: string;
  html_url: string;
  published_at: string | null;
  body: string | null;
  prerelease: boolean;
}

export async function buscarReleasesGitHub(): Promise<ReleaseGitHub[] | null> {
  const brutas = await buscarGitHub<ReleaseBruta[]>("/releases?per_page=10");
  if (!brutas) return null;
  return brutas.map((r) => ({
    nome: r.name || r.tag_name,
    tag: r.tag_name,
    url: r.html_url,
    publicadoEm: r.published_at,
    corpo: r.body,
    prerelease: r.prerelease,
  }));
}
