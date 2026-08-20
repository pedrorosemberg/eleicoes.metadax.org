/**
 * Marca do produto — mesmo motivo do favicon (checkmark), para
 * consistência entre aba do navegador e cabeçalho. Original, preto e
 * branco, sem imitar nenhuma marca oficial (ver app/icon.tsx).
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={["inline-flex items-center gap-2", className].filter(Boolean).join(" ")}>
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px]"
        style={{ background: "#1E1E1E" }}
        aria-hidden
      >
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
          <path
            d="M4 10.5 8 14.5 16 6"
            stroke="#FFFFFF"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="text-[17px] font-semibold tracking-tight text-[var(--text-primary)]">
        Eleições
      </span>
    </span>
  );
}
