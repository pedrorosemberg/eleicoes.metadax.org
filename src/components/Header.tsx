"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "./Logo";
import { IconMenu, IconX } from "./icons";

const LINKS = [
  { href: "/", label: "Início" },
  { href: "/buscar", label: "Buscar" },
  { href: "/mapa", label: "Mapa" },
  { href: "/status", label: "Status" },
  { href: "/sobre", label: "Sobre" },
  { href: "/participe", label: "Participe" },
];

export function Header() {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  const [pathnameAnterior, setPathnameAnterior] = useState(pathname);

  // Fecha o menu ao trocar de rota — ajuste de estado durante a
  // renderização (sem efeito), conforme o padrão recomendado pelo React
  // para "resetar estado quando uma prop muda".
  if (pathname !== pathnameAnterior) {
    setPathnameAnterior(pathname);
    setAberto(false);
  }

  const linkAtivo = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header
      className="sticky top-0 z-40 border-b bg-[var(--surface-canvas)]/95 backdrop-blur"
      style={{ borderColor: "var(--hairline)" }}
    >
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-2.5 sm:px-6">
        <Link href="/" aria-label="Eleições — página inicial">
          <Logo />
        </Link>

        {/* Desktop */}
        <nav className="hidden items-center gap-1 sm:flex" aria-label="Navegação principal">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={linkAtivo(link.href) ? "page" : undefined}
              className={[
                "rounded-[8px] px-3 py-1.5 text-sm font-medium transition-colors",
                linkAtivo(link.href)
                  ? "bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-1)]",
              ].join(" ")}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Mobile: hambúrguer */}
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-[8px] text-[var(--text-primary)] hover:bg-[var(--surface-1)] sm:hidden"
          style={{ minHeight: 44, minWidth: 44 }}
          aria-label={aberto ? "Fechar menu" : "Abrir menu"}
          aria-expanded={aberto}
          aria-controls="menu-mobile"
          onClick={() => setAberto((v) => !v)}
        >
          {aberto ? <IconX className="h-5 w-5" /> : <IconMenu />}
        </button>
      </div>

      {/* Mobile: painel do menu */}
      {aberto && (
        <nav
          id="menu-mobile"
          className="flex flex-col gap-1 border-t px-4 py-3 sm:hidden"
          style={{ borderColor: "var(--hairline)" }}
          aria-label="Navegação principal (mobile)"
        >
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={linkAtivo(link.href) ? "page" : undefined}
              className={[
                "rounded-[8px] px-3 py-2.5 text-[15px] font-medium transition-colors",
                linkAtivo(link.href)
                  ? "bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-1)]",
              ].join(" ")}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
