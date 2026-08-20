export function Spinner({ label = "Carregando…", size = 18 }: { label?: string; size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]" role="status">
      <svg
        className="spinner"
        width={size}
        height={size}
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden
      >
        <circle cx="10" cy="10" r="8" stroke="var(--hairline-strong)" strokeWidth="2.5" />
        <path
          d="M18 10a8 8 0 0 0-8-8"
          stroke="var(--text-primary)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      <span>{label}</span>
    </span>
  );
}
