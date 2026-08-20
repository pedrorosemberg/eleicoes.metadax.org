import Link from "next/link";

/**
 * Rodapé próprio do produto — não substitui o rodapé institucional da
 * METADAX (injetado via CDN, ver layout.tsx), é adicional a ele: aponta
 * para as páginas legais específicas deste projeto, que o rodapé
 * genérico da METADAX não conhece.
 */
export function SiteFooter() {
  return (
    <footer
      className="border-t px-4 py-8 text-sm text-[var(--text-tertiary)] sm:px-6"
      style={{ borderColor: "var(--hairline)" }}
    >
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-4 gap-y-2">
        <Link href="/sobre" className="underline underline-offset-2">
          Sobre e fontes
        </Link>
        <Link href="/privacidade" className="underline underline-offset-2">
          Privacidade
        </Link>
        <Link href="/termos" className="underline underline-offset-2">
          Termos de uso
        </Link>
        <a
          href="https://github.com/pedrorosemberg/eleicoes.metadax.org"
          target="_blank"
          rel="noreferrer noopener"
          className="underline underline-offset-2"
        >
          Código-fonte
        </a>
        <span>
          Um projeto do{" "}
          <a href="https://imi.metadax.org" target="_blank" rel="noreferrer noopener" className="underline underline-offset-2">
            Instituto METADAX de Inovação
          </a>
        </span>
      </div>
    </footer>
  );
}
