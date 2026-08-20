import Link from "next/link";

/**
 * Rodapé próprio do produto, totalmente autocontido (texto estático) —
 * inclui o bloco institucional obrigatório da METADAX diretamente aqui,
 * em vez de depender do script de injeção externo (ver a nota em
 * app/layout.tsx sobre por que o CDN de header/footer foi removido).
 */
export function SiteFooter() {
  return (
    <footer
      className="border-t px-4 py-8 text-sm text-[var(--text-tertiary)] sm:px-6"
      style={{ borderColor: "var(--hairline)" }}
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link href="/sobre" className="underline underline-offset-2">
            Sobre e fontes
          </Link>
          <Link href="/participe" className="underline underline-offset-2">
            Participe
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

        <div className="border-t pt-4 text-xs leading-relaxed" style={{ borderColor: "var(--hairline)" }}>
          <p className="font-semibold text-[var(--text-secondary)]">METADAX</p>
          <p>METADAX — CNPJ 65.640.808/0001-89</p>
          <p>Av. Getúlio Vargas, 671, Sala 500, Parte 1364 — Savassi, Belo Horizonte, MG — CEP 30112-021</p>
          <a href="https://www.metadax.com.br" target="_blank" rel="noreferrer noopener" className="underline underline-offset-2">
            metadax.com.br
          </a>
        </div>
      </div>
    </footer>
  );
}
