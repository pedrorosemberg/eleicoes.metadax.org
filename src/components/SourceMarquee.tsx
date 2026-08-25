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
  {
    sigla: "API",
    nome: "BrasilAPI",
    logo: "/assets/fontes_images/brasilapi-logo-medium.webp",
    largura: 384,
    altura: 96,
  },
  {
    sigla: "MDX",
    nome: "METADAX",
    // Único logo remoto (CDN da própria METADAX) — os outros quatro são
    // arquivos locais em public/assets/fontes_images/. largura/altura são um
    // palpite (512×512): o sandbox de desenvolvimento não tem acesso de rede
    // a cdn.metadax.com.br para confirmar as dimensões reais do arquivo —
    // ajustar aqui se a proporção não bater no preview.
    logo: "https://cdn.metadax.com.br/assets/metadax_branding_marks/png/logos/metadax_dark.png",
    largura: 512,
    altura: 512,
  },
];

/**
 * Faixa animada com as fontes oficiais. Logos reais enviados pelo
 * mantenedor (26/08/2026, assets/fontes_images/, mais o logo remoto da
 * METADAX) para as cinco fontes — usados aqui só para atribuição da fonte
 * do dado, não como marca deste produto: por isso a cor de cada logo
 * oficial é preservada como está, sem contrariar a regra de neutralidade
 * cromática do restante do site (ver docs/DESIGN_SYSTEM.md, seção sobre
 * cores de marca).
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
          // maxWidth + objectFit: contain — trava o tamanho mesmo se a
          // proporção largura/altura declarada acima não bater exatamente
          // com o arquivo real (caso do logo remoto da METADAX, cujas
          // dimensões reais não puderam ser confirmadas neste ambiente).
          // Sem isso, um palpite errado de proporção deixa o logo
          // visivelmente maior ou menor que os outros da faixa.
          style={{ height: 22, width: "auto", maxWidth: 110, objectFit: "contain" }}
          className="h-[22px] w-auto max-w-[110px] object-contain"
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
