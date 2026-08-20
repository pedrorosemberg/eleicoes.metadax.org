/**
 * Ícones monocromáticos (herdam a cor do texto via currentColor) — nunca
 * cor própria. Diferenciação de status vem do desenho do ícone + texto,
 * nunca de cor. Ver docs/DESIGN_SYSTEM.md §3.
 */
type IconProps = { className?: string };

export function IconCheck({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" className={className} aria-hidden>
      <path d="M4 10.5 8 14.5 16 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconAlertTriangle({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" className={className} aria-hidden>
      <path
        d="M10 2.5 18 17H2L10 2.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M10 8v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="10" cy="14.5" r="0.9" fill="currentColor" />
    </svg>
  );
}

export function IconLock({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" className={className} aria-hidden>
      <rect x="4.5" y="9" width="11" height="8" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 9V6.5a3 3 0 0 1 6 0V9" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function IconX({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" className={className} aria-hidden>
      <path d="M5 5l10 10M15 5 5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconMenu({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" fill="none" className={className} aria-hidden>
      <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconExternalLink({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" width="14" height="14" fill="none" className={className} aria-hidden>
      <path d="M8 5H5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 4h5v5M15.5 4.5 9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
