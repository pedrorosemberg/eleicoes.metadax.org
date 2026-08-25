import Link from "next/link";

const MAPA_DO_SITE: { href: string; label: string }[] = [
  { href: "/", label: "Início" },
  { href: "/buscar", label: "Buscar" },
  { href: "/mapa", label: "Mapa" },
  { href: "/status", label: "Status" },
  { href: "/sobre", label: "Sobre e fontes" },
  { href: "/participe", label: "Participe" },
  { href: "/roteiro", label: "Roteiro" },
  { href: "/atualizacoes", label: "Atualizações" },
];

const LINKS_UTEIS: { href: string; label: string }[] = [
  { href: "https://github.com/pedrorosemberg/eleicoes.metadax.org", label: "Código-fonte no GitHub" },
  { href: "https://github.com/pedrorosemberg/eleicoes.metadax.org/issues/new", label: "Reportar um problema" },
  { href: "https://chat.whatsapp.com/GCXdQNeT7J6FfqkQcqgVKQ", label: "Grupo do WhatsApp" },
  { href: "https://imi.metadax.org", label: "Instituto METADAX de Inovação (IMI)" },
];

/**
 * Rodapé próprio do produto, totalmente autocontido (texto estático) —
 * inclui o bloco institucional obrigatório da METADAX diretamente aqui,
 * em vez de depender do script de injeção externo (ver a nota em
 * app/layout.tsx sobre por que o CDN de header/footer foi removido).
 *
 * Mapa do site interno em coluna própria (26/08/2026) — inclui todas as
 * rotas de navegação, mais Privacidade/Termos numa coluna separada e
 * links externos úteis (repositório, grupo do WhatsApp) numa terceira,
 * a pedido do mantenedor.
 */
export function SiteFooter() {
  return (
    <footer
      className="border-t px-4 py-8 text-sm text-[var(--text-tertiary)] sm:px-6"
      style={{ borderColor: "var(--hairline)" }}
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              Mapa do site
            </span>
            {MAPA_DO_SITE.map((l) => (
              <Link key={l.href} href={l.href} className="underline underline-offset-2">
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              Legal
            </span>
            <Link href="/privacidade" className="underline underline-offset-2">
              Política de Privacidade
            </Link>
            <Link href="/termos" className="underline underline-offset-2">
              Termos de Uso
            </Link>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              Links úteis
            </span>
            {LINKS_UTEIS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noreferrer noopener"
                className="underline underline-offset-2"
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>

        <div className="border-t pt-4 text-xs leading-relaxed" style={{ borderColor: "var(--hairline)" }}>
          <p className="font-semibold text-[var(--text-secondary)]">METADAX — parceira apoiadora</p>
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
