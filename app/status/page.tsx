import type { Metadata } from "next";
import { verificarSaudeFontes } from "@/lib/health";
import { HealthBoard } from "@/components/HealthBoard";

export const metadata: Metadata = {
  title: "Status das fontes de dados",
  description:
    "Disponibilidade em tempo real do TSE, DivulgaCandContas, BrasilAPI e Portal da Transparência.",
  alternates: { canonical: "/status" },
};

// Sempre verificado ao vivo — nunca cacheado, ver docs/DATA_SOURCES.md §5.
export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const checagens = await verificarSaudeFontes();

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
      <h1 className="text-[clamp(28px,6vw,40px)] font-semibold text-[var(--text-primary)]">
        Status das fontes
      </h1>
      <p className="mt-3 max-w-prose text-[17px] leading-relaxed text-[var(--text-secondary)]">
        Checagem em tempo real, feita a partir deste servidor, contra cada fonte externa que o
        projeto usa. Um status de <strong>&ldquo;Bloqueado&rdquo;</strong> nas rotas do TSE
        indica uma restrição de rede do lado do TSE, não um erro do produto.
      </p>

      <div className="mt-8">
        <HealthBoard inicial={checagens} />
      </div>
    </main>
  );
}
