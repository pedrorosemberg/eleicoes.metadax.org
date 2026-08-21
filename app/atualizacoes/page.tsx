import type { Metadata } from "next";
import { buscarAtualizacoesGitHub, buscarReleasesGitHub, type AtualizacaoGitHub } from "@/lib/github";
import { formatarDataBR } from "@/lib/format";
import { IconAlertTriangle, IconCheckCircle, IconInfo, IconExternalLink } from "@/components/icons";

const REPO_URL = "https://github.com/pedrorosemberg/eleicoes.metadax.org";

export const metadata: Metadata = {
  title: "Segurança e atualizações",
  description:
    "Issues, correções, patches e novas features do projeto, espelhados ao vivo do repositório público no GitHub.",
  alternates: { canonical: "/atualizacoes" },
};

/**
 * Sincronizado com o GitHub a cada 10 min (ver REVALIDATE_SEGUNDOS em
 * src/lib/github.ts) em vez de a cada request — mantém a mesma
 * informação publicada aqui e lá sem martelar a API do GitHub.
 */
export const revalidate = 600;

const LABELS_SEGURANCA = ["security", "segurança", "vulnerability", "cve"];
const LABELS_BUG = ["bug", "correção", "fix"];

function classificar(item: AtualizacaoGitHub): { rotulo: string; cor: string; corFundo: string; Icone: typeof IconCheckCircle } {
  const labelsLower = item.labels.map((l) => l.toLowerCase());
  const ehSeguranca = labelsLower.some((l) => LABELS_SEGURANCA.some((s) => l.includes(s)));
  const ehBug = labelsLower.some((l) => LABELS_BUG.some((s) => l.includes(s)));

  if (item.estado === "mesclado") {
    return { rotulo: "mesclado", cor: "var(--color-success)", corFundo: "var(--color-success-bg)", Icone: IconCheckCircle };
  }
  if (item.estado === "fechado") {
    return { rotulo: "fechado", cor: "var(--color-success)", corFundo: "var(--color-success-bg)", Icone: IconCheckCircle };
  }
  if (ehSeguranca) {
    return { rotulo: "segurança — aberto", cor: "var(--color-error)", corFundo: "var(--color-error-bg)", Icone: IconAlertTriangle };
  }
  if (ehBug) {
    return { rotulo: "bug — aberto", cor: "var(--color-error)", corFundo: "var(--color-error-bg)", Icone: IconAlertTriangle };
  }
  return { rotulo: item.tipo === "pull_request" ? "PR aberto" : "aberto", cor: "var(--color-info)", corFundo: "var(--color-info-bg)", Icone: IconInfo };
}

function ItemAtualizacao({ item }: { item: AtualizacaoGitHub }) {
  const { rotulo, cor, corFundo, Icone } = classificar(item);
  return (
    <li className="flex items-start gap-3 border-t py-3 first:border-t-0" style={{ borderColor: "var(--hairline)" }}>
      <span className="mt-0.5 shrink-0" style={{ color: cor }}>
        <Icone />
      </span>
      <div className="min-w-0 flex-1">
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1.5 text-[15px] font-medium text-[var(--text-primary)] underline underline-offset-2"
        >
          #{item.numero} {item.titulo}
          <IconExternalLink />
        </a>
        <p className="mt-1 text-xs text-[var(--text-tertiary)]">
          <span
            className="mr-2 inline-flex items-center rounded-full px-2 py-0.5 font-semibold uppercase tracking-wide"
            style={{ color: cor, background: corFundo }}
          >
            {rotulo}
          </span>
          atualizado em {formatarDataBR(item.atualizadoEm)}
          {item.autor ? ` · @${item.autor}` : ""}
          {item.labels.length > 0 ? ` · ${item.labels.join(", ")}` : ""}
        </p>
      </div>
    </li>
  );
}

export default async function AtualizacoesPage() {
  const [atualizacoes, releases] = await Promise.all([buscarAtualizacoesGitHub(), buscarReleasesGitHub()]);

  const abertos = atualizacoes?.filter((a) => a.estado === "aberto") ?? [];
  const resolvidos = atualizacoes?.filter((a) => a.estado !== "aberto") ?? [];

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
      <h1 className="text-[clamp(28px,6vw,40px)] font-semibold text-[var(--text-primary)]">
        Segurança e atualizações
      </h1>
      <p className="mt-3 max-w-prose text-[17px] leading-relaxed text-[var(--text-secondary)]">
        Issues, correções emergenciais, patches, melhorias e novas features — espelhados ao vivo
        do{" "}
        <a className="underline underline-offset-2" href={REPO_URL} target="_blank" rel="noreferrer noopener">
          repositório público no GitHub
        </a>{" "}
        (sincronizado a cada 10 minutos), para não manter duas fontes de verdade separadas.
        Encontrou um problema de segurança? Reporte por um{" "}
        <a
          className="underline underline-offset-2"
          href={`${REPO_URL}/issues/new?labels=security&title=%5Bseguran%C3%A7a%5D%20`}
          target="_blank"
          rel="noreferrer noopener"
        >
          issue rotulado &quot;security&quot;
        </a>
        .
      </p>

      {atualizacoes === null ? (
        <p
          className="mt-8 rounded-[18px] border p-5 text-sm"
          style={{ borderColor: "var(--color-info)", background: "var(--color-info-bg)", color: "var(--color-info)" }}
        >
          Não foi possível carregar as atualizações do GitHub agora. Veja diretamente em{" "}
          <a className="underline underline-offset-2" href={`${REPO_URL}/issues`} target="_blank" rel="noreferrer noopener">
            {REPO_URL}/issues
          </a>
          .
        </p>
      ) : (
        <>
          {releases && releases.length > 0 && (
            <section className="mt-8">
              <h2 className="text-[20px] font-semibold text-[var(--text-primary)]">Últimas versões</h2>
              <ul className="mt-3 flex flex-col">
                {releases.map((r) => (
                  <li key={r.tag} className="border-t py-3 first:border-t-0" style={{ borderColor: "var(--hairline)" }}>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1.5 text-[15px] font-medium text-[var(--text-primary)] underline underline-offset-2"
                    >
                      {r.nome}
                      <IconExternalLink />
                    </a>
                    <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                      {r.publicadoEm ? formatarDataBR(r.publicadoEm) : "data não informada"}
                      {r.prerelease ? " · pré-lançamento" : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-8">
            <h2 className="text-[20px] font-semibold text-[var(--text-primary)]">
              Em aberto <span className="font-financial text-base text-[var(--text-tertiary)]">({abertos.length})</span>
            </h2>
            {abertos.length > 0 ? (
              <ul className="mt-3 flex flex-col">
                {abertos.map((item) => (
                  <ItemAtualizacao key={item.numero} item={item} />
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-[var(--text-tertiary)]">Nada em aberto no momento.</p>
            )}
          </section>

          <section className="mt-10">
            <h2 className="text-[20px] font-semibold text-[var(--text-primary)]">
              Resolvidos recentemente{" "}
              <span className="font-financial text-base text-[var(--text-tertiary)]">({resolvidos.length})</span>
            </h2>
            {resolvidos.length > 0 ? (
              <ul className="mt-3 flex flex-col">
                {resolvidos.map((item) => (
                  <ItemAtualizacao key={item.numero} item={item} />
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-[var(--text-tertiary)]">Nada resolvido recentemente.</p>
            )}
          </section>
        </>
      )}

      <p className="mt-10 text-sm text-[var(--text-tertiary)]">
        Quer sugerir uma melhoria ou nova funcionalidade em vez de reportar um problema? Veja{" "}
        <a className="underline underline-offset-2" href="/roteiro">
          /roteiro
        </a>
        .
      </p>
    </main>
  );
}
