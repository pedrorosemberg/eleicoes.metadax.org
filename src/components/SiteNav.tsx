"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Início" },
  { href: "/buscar", label: "Buscar" },
  { href: "/status", label: "Status" },
  { href: "/sobre", label: "Sobre" },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav
      className="sticky top-0 z-40 border-b bg-[var(--surface-canvas)]/90 backdrop-blur"
      style={{ borderColor: "var(--hairline)" }}
      aria-label="Navegação do site"
    >
      <div className="mx-auto flex max-w-3xl items-center gap-1 overflow-x-auto px-4 py-2 sm:px-6">
        {LINKS.map((link) => {
          const ativo = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={ativo ? "page" : undefined}
              className={[
                "shrink-0 rounded-[8px] px-3 py-1.5 text-sm font-medium transition-colors",
                ativo
                  ? "bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-1)]",
              ].join(" ")}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
