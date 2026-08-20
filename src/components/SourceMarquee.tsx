const FONTES = [
  { sigla: "TSE", nome: "Tribunal Superior Eleitoral" },
  { sigla: "RFB", nome: "Receita Federal do Brasil" },
  { sigla: "CGU", nome: "Portal da Transparência" },
  { sigla: "API", nome: "BrasilAPI" },
  { sigla: "MDX", nome: "METADAX" },
];

/**
 * Faixa animada com as fontes oficiais. Usa wordmark tipográfico neutro
 * em vez do logo oficial de cada órgão — os arquivos de logo oficiais
 * (SVG do TSE, brasão da RFB, marca da CGU) não foram confirmados/obtidos
 * nesta sessão; trocar por SVG real é uma melhoria futura documentada,
 * não uma limitação escondida. Ver docs/DESIGN_SYSTEM.md.
 */
export function SourceMarquee() {
  const item = (f: (typeof FONTES)[number], key: string) => (
    <div
      key={key}
      className="mx-2 flex shrink-0 items-center gap-3 rounded-[14px] border px-5 py-3"
      style={{ borderColor: "var(--hairline)" }}
    >
      <span
        className="font-financial text-sm font-bold tracking-wide text-[var(--text-primary)]"
        aria-hidden
      >
        {f.sigla}
      </span>
      <span className="h-4 w-px" style={{ background: "var(--hairline-strong)" }} aria-hidden />
      <span className="whitespace-nowrap text-sm text-[var(--text-secondary)]">{f.nome}</span>
    </div>
  );

  return (
    <div
      className="overflow-hidden border-y py-4"
      style={{ borderColor: "var(--hairline)" }}
      aria-label="Fontes oficiais de dados"
    >
      <div className="marquee-track">
        <div className="flex" aria-hidden={false}>
          {FONTES.map((f) => item(f, `a-${f.sigla}`))}
        </div>
        <div className="flex" aria-hidden="true">
          {FONTES.map((f) => item(f, `b-${f.sigla}`))}
        </div>
      </div>
    </div>
  );
}
