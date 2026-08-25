import Image from "next/image";

const FONTES = [
  {
    sigla: "TSE",
    nome: "Tribunal Superior Eleitoral",
    logo: "/assets/fontes_images/Tribunal_Superior_Eleitoral.png",
    largura: 3500,
    altura: 1617,
  },
  {
    sigla: "RFB",
    nome: "Receita Federal do Brasil",
    logo: "/assets/fontes_images/receita-federal-logo.png",
    largura: 4096,
    altura: 961,
  },
  {
    sigla: "CGU",
    nome: "Portal da Transparência",
    logo: "/assets/fontes_images/transparencia.png",
    largura: 691,
    altura: 236,
  },
  { sigla: "API", nome: "BrasilAPI", logo: null },
  { sigla: "MDX", nome: "METADAX", logo: null },
];

/**
 * Faixa animada com as fontes oficiais. Logos reais enviados pelo
 * mantenedor em 26/08/2026 para TSE, RFB e CGU (assets/fontes_images/) —
 * usados aqui só para atribuição da fonte do dado, não como marca deste
 * produto: por isso a cor de cada logo oficial é preservada como está,
 * sem contrariar a regra de neutralidade cromática do restante do site
 * (ver docs/DESIGN_SYSTEM.md, seção sobre cores de marca). BrasilAPI e
 * METADAX continuam com wordmark tipográfico — nenhum arquivo de logo
 * foi enviado para essas duas.
 */
export function SourceMarquee() {
  const item = (f: (typeof FONTES)[number], key: string) => (
    <div
      key={key}
      className="mx-2 flex h-[52px] shrink-0 items-center gap-3 rounded-[14px] border px-5"
      style={{ borderColor: "var(--hairline)" }}
    >
      {f.logo ? (
        <Image
          src={f.logo}
          alt={f.nome}
          width={f.largura}
          height={f.altura}
          style={{ height: 22, width: "auto" }}
          className="h-[22px] w-auto"
        />
      ) : (
        <span
          className="font-financial text-sm font-bold tracking-wide text-[var(--text-primary)]"
          aria-hidden
        >
          {f.sigla}
        </span>
      )}
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
