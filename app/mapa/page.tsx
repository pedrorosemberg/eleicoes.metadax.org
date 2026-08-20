import type { Metadata } from "next";
import { calcularEstatisticas } from "@/lib/stats";
import { SnapshotNotice } from "@/components/SnapshotNotice";
import { carregarMeta } from "@/lib/data";
import { BrazilHeatmap } from "@/components/BrazilHeatmap";

export const metadata: Metadata = {
  title: "Mapa e estatísticas",
  description:
    "Distribuição de candidatos por UF, cargo e partido — visualização pública dos dados oficiais do TSE.",
  alternates: { canonical: "/mapa" },
};

function Barra({ rotulo, total, maximo }: { rotulo: string; total: number; maximo: number }) {
  const largura = maximo > 0 ? Math.max((total / maximo) * 100, 2) : 0;
  return (
    <li className="flex items-center gap-3">
      <span
        className="w-32 shrink-0 truncate text-sm text-[var(--text-secondary)] sm:w-40"
        title={rotulo}
      >
        {rotulo}
      </span>
      <div className="h-5 flex-1 overflow-hidden rounded-[4px]" style={{ background: "var(--surface-2)" }}>
        <div
          className="h-full rounded-[4px]"
          style={{ width: `${largura}%`, background: "var(--action-primary-bg)" }}
        />
      </div>
      <span className="w-12 shrink-0 text-right font-financial text-sm text-[var(--text-primary)]">
        {total}
      </span>
    </li>
  );
}

export default async function MapaPage() {
  const [estatisticas, meta] = await Promise.all([calcularEstatisticas(), carregarMeta()]);
  const maxUf = Math.max(...estatisticas.porUf.map((u) => u.total), 1);
  const maxCargo = Math.max(...estatisticas.porCargo.map((c) => c.total), 1);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
      <h1 className="text-[clamp(28px,6vw,40px)] font-semibold text-[var(--text-primary)]">
        Mapa e estatísticas
      </h1>
      <p className="mt-3 max-w-prose text-[17px] leading-relaxed text-[var(--text-secondary)]">
        Distribuição pública dos candidatos por UF, cargo e partido — agregados, sem dado
        individual. Consumível também via{" "}
        <code className="font-financial text-sm">GET /api/estatisticas</code> (JSON, CORS
        aberto).
      </p>
      <div className="mt-6">
        <SnapshotNotice isAmostra={estatisticas.isAmostra} geradoEm={meta?.geradoEm} />
      </div>

      <section className="mt-8">
        <h2 className="text-[20px] font-semibold text-[var(--text-primary)]">Mapa por UF</h2>
        <p className="mt-1 text-sm text-[var(--text-tertiary)]">
          Fronteiras reais dos estados (IBGE) — quanto mais escuro, mais candidatos. Clique
          num estado para ir direto à busca filtrada por ele.
        </p>
        <div className="mt-4">
          <BrazilHeatmap porUf={estatisticas.porUf} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-[20px] font-semibold text-[var(--text-primary)]">
          Candidatos por UF <span className="font-financial text-base text-[var(--text-tertiary)]">({estatisticas.totalCandidatos} no total)</span>
        </h2>
        <ul className="mt-4 flex flex-col gap-2">
          {estatisticas.porUf.map((u) => (
            <Barra key={u.uf} rotulo={u.uf} total={u.total} maximo={maxUf} />
          ))}
        </ul>
        {estatisticas.porUf.length === 0 && (
          <p className="mt-2 text-sm text-[var(--text-tertiary)]">Sem dados ainda.</p>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-[20px] font-semibold text-[var(--text-primary)]">Candidatos por cargo</h2>
        <ul className="mt-4 flex flex-col gap-2">
          {estatisticas.porCargo.map((c) => (
            <Barra key={c.cargo} rotulo={c.cargo} total={c.total} maximo={maxCargo} />
          ))}
        </ul>
      </section>
    </main>
  );
}
