import type { Metadata } from "next";
import Link from "next/link";
import { buscarCandidatos, carregarCandidatosPorUf, carregarMeta } from "@/lib/data";
import { UFS } from "@/lib/ufs";
import { CandidatoCard } from "@/components/CandidatoCard";
import { SnapshotNotice } from "@/components/SnapshotNotice";
import { BuscaTracker } from "@/components/BuscaTracker";

export const metadata: Metadata = {
  title: "Busca de candidatos",
  description:
    "Busque candidatos às eleições de 2026 por nome, número ou ID, ou filtre por UF, cidade, cargo e partido. Dados oficiais do TSE.",
  alternates: { canonical: "/buscar" },
};

type Modo = "direta" | "indireta";

/**
 * Achado real do teste de carga em 26/08/2026: um termo comum ("silva")
 * bate em milhares de candidatos (ex.: 3.284) e, sem paginação, a página
 * renderizava todos de uma vez, em toda requisição — sob concorrência,
 * isso sozinho já bastava para saturar o processo (independente do cache
 * de dados em src/lib/data.ts, que resolve a outra metade do problema).
 * 24 por página também é mais usável para quem está lendo a lista.
 */
const TAMANHO_PAGINA = 24;

function tabClass(ativo: boolean) {
  return [
    "inline-flex h-10 items-center rounded-[10px] px-4 text-sm font-semibold",
    ativo
      ? "bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)]"
      : "border text-[var(--text-secondary)] hover:bg-[var(--surface-1)]",
  ].join(" ");
}

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{
    modo?: string;
    q?: string;
    uf?: string;
    cidade?: string;
    cargo?: string;
    partido?: string;
    pagina?: string;
  }>;
}) {
  const sp = await searchParams;
  const modo: Modo = sp.modo === "direta" ? "direta" : "indireta";
  const ufsValidas = [...UFS, "BR"] as readonly string[];
  const uf = sp.uf && ufsValidas.includes(sp.uf.toUpperCase()) ? sp.uf.toUpperCase() : "SP";
  const paginaAtual = Math.max(1, Number.parseInt(sp.pagina ?? "1", 10) || 1);

  const meta = await carregarMeta();

  // Opções dos filtros indiretos derivadas dos próprios dados carregados
  // da UF selecionada — evita erro de digitação e se adapta ao dataset real.
  const { candidatos: candidatosDaUf } = await carregarCandidatosPorUf(uf);
  const cargosDisponiveis = [...new Set(candidatosDaUf.map((c) => c.cargo))].sort();

  let resultado: { candidatos: Awaited<ReturnType<typeof buscarCandidatos>>["candidatos"]; isAmostra: boolean };
  if (modo === "direta") {
    resultado = sp.q
      ? await buscarCandidatos({ q: sp.q })
      : { candidatos: [], isAmostra: false };
  } else {
    resultado = await buscarCandidatos({
      uf,
      cidade: sp.cidade,
      cargo: sp.cargo,
      partido: sp.partido,
    });
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <BuscaTracker
        modo={modo}
        temTermo={Boolean(sp.q)}
        uf={modo === "indireta" ? uf : undefined}
        cargo={sp.cargo}
        temCidade={Boolean(sp.cidade)}
        temPartido={Boolean(sp.partido)}
      />
      <header className="mb-6">
        <h1 className="text-[clamp(28px,6vw,40px)] font-semibold leading-tight text-[var(--text-primary)]">
          Candidatos às eleições
        </h1>
        <p className="mt-2 max-w-prose text-[17px] text-[var(--text-secondary)]">
          Dados oficiais do TSE, cruzados com CNPJ da Receita Federal e o Portal da
          Transparência. Sem cor por partido — leia mais em{" "}
          <Link href="/sobre" className="underline underline-offset-2">
            /sobre
          </Link>
          .
        </p>
      </header>

      <div className="mb-5 flex gap-2" role="tablist" aria-label="Modo de busca">
        <Link
          href="/buscar?modo=direta"
          role="tab"
          aria-selected={modo === "direta"}
          className={tabClass(modo === "direta")}
          style={modo !== "direta" ? { borderColor: "var(--hairline)" } : undefined}
        >
          Buscar por nome/número/ID
        </Link>
        <Link
          href={`/buscar?modo=indireta&uf=${uf}`}
          role="tab"
          aria-selected={modo === "indireta"}
          className={tabClass(modo === "indireta")}
          style={modo !== "indireta" ? { borderColor: "var(--hairline)" } : undefined}
        >
          Filtrar (UF, cidade, cargo, partido)
        </Link>
      </div>

      {modo === "direta" ? (
        <form className="mb-6 flex flex-wrap items-end gap-3" action="/buscar" method="get">
          <input type="hidden" name="modo" value="direta" />
          <label className="flex flex-1 min-w-48 flex-col gap-1 text-sm font-medium text-[var(--text-secondary)]">
            Nome, nome de urna, número ou ID do candidato
            <input
              type="search"
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Ex.: Maria Silva, 12345…"
              className="h-11 rounded-[10px] border bg-[var(--surface-1)] px-3 text-base text-[var(--text-primary)]"
              style={{ borderColor: "var(--hairline)" }}
            />
          </label>
          <button
            type="submit"
            className="h-11 rounded-[10px] px-5 text-[15px] font-semibold"
            style={{ background: "var(--action-primary-bg)", color: "var(--action-primary-fg)" }}
          >
            Buscar
          </button>
        </form>
      ) : (
        <form className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4" action="/buscar" method="get">
          <input type="hidden" name="modo" value="indireta" />
          <label className="flex flex-col gap-1 text-sm font-medium text-[var(--text-secondary)]">
            UF
            <select
              name="uf"
              defaultValue={uf}
              className="h-11 rounded-[10px] border bg-[var(--surface-1)] px-3 text-base text-[var(--text-primary)]"
              style={{ borderColor: "var(--hairline)" }}
            >
              {UFS.map((sigla) => (
                <option key={sigla} value={sigla}>
                  {sigla}
                </option>
              ))}
              <option value="BR">BR — Nacional (Presidente/Vice)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-[var(--text-secondary)]">
            Cidade
            <input
              type="text"
              name="cidade"
              defaultValue={sp.cidade ?? ""}
              placeholder="Todas"
              className="h-11 rounded-[10px] border bg-[var(--surface-1)] px-3 text-base text-[var(--text-primary)]"
              style={{ borderColor: "var(--hairline)" }}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-[var(--text-secondary)]">
            Cargo
            <select
              name="cargo"
              defaultValue={sp.cargo ?? ""}
              className="h-11 rounded-[10px] border bg-[var(--surface-1)] px-3 text-base text-[var(--text-primary)]"
              style={{ borderColor: "var(--hairline)" }}
            >
              <option value="">Todos</option>
              {cargosDisponiveis.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-[var(--text-secondary)]">
            Partido/legenda
            <input
              type="text"
              name="partido"
              defaultValue={sp.partido ?? ""}
              placeholder="Sigla ou nome"
              className="h-11 rounded-[10px] border bg-[var(--surface-1)] px-3 text-base text-[var(--text-primary)]"
              style={{ borderColor: "var(--hairline)" }}
            />
          </label>
          <button
            type="submit"
            className="col-span-2 h-11 rounded-[10px] px-5 text-[15px] font-semibold sm:col-span-4"
            style={{ background: "var(--action-primary-bg)", color: "var(--action-primary-fg)" }}
          >
            Filtrar
          </button>
        </form>
      )}

      <div className="mb-6">
        <SnapshotNotice isAmostra={resultado.isAmostra} geradoEm={meta?.geradoEm} />
      </div>

      {(() => {
        const total = resultado.candidatos.length;
        const totalPaginas = Math.max(1, Math.ceil(total / TAMANHO_PAGINA));
        const pagina = Math.min(paginaAtual, totalPaginas);
        const inicio = (pagina - 1) * TAMANHO_PAGINA;
        const candidatosDaPagina = resultado.candidatos.slice(inicio, inicio + TAMANHO_PAGINA);

        const paramsBase = new URLSearchParams();
        paramsBase.set("modo", modo);
        if (sp.q) paramsBase.set("q", sp.q);
        if (modo === "indireta") paramsBase.set("uf", uf);
        if (sp.cidade) paramsBase.set("cidade", sp.cidade);
        if (sp.cargo) paramsBase.set("cargo", sp.cargo);
        if (sp.partido) paramsBase.set("partido", sp.partido);

        function linkPagina(p: number): string {
          const params = new URLSearchParams(paramsBase);
          params.set("pagina", String(p));
          return `/buscar?${params.toString()}`;
        }

        return (
          <>
            {total > 0 && (
              <p className="mb-3 text-sm text-[var(--text-tertiary)]">
                Mostrando {inicio + 1}–{Math.min(inicio + TAMANHO_PAGINA, total)} de {total}{" "}
                {total === 1 ? "candidato" : "candidatos"}
                {totalPaginas > 1 && ` — página ${pagina} de ${totalPaginas}`}.
              </p>
            )}

            <ul className="flex flex-col gap-3">
              {candidatosDaPagina.map((candidato) => (
                <li key={candidato.sqCandidato}>
                  <CandidatoCard candidato={candidato} />
                </li>
              ))}
            </ul>

            {total === 0 && (
              <p className="text-[var(--text-tertiary)]">
                {modo === "direta" && !sp.q
                  ? "Digite um nome, número ou ID para buscar."
                  : "Nenhum candidato encontrado com esses filtros."}
              </p>
            )}

            {totalPaginas > 1 && (
              <nav className="mt-6 flex items-center justify-between gap-3" aria-label="Paginação de resultados">
                {pagina > 1 ? (
                  <Link
                    href={linkPagina(pagina - 1)}
                    className="inline-flex h-10 items-center rounded-[10px] border px-4 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-1)]"
                    style={{ borderColor: "var(--hairline)" }}
                  >
                    ← Anterior
                  </Link>
                ) : (
                  <span />
                )}
                {pagina < totalPaginas && (
                  <Link
                    href={linkPagina(pagina + 1)}
                    className="inline-flex h-10 items-center rounded-[10px] border px-4 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-1)]"
                    style={{ borderColor: "var(--hairline)" }}
                  >
                    Próxima →
                  </Link>
                )}
              </nav>
            )}
          </>
        );
      })()}
    </main>
  );
}
