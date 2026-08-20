/**
 * Skeleton loader — bloco cinza sólido, nunca spinner como padrão
 * principal (ver docs/DESIGN_SYSTEM.md §6: "skeleton loaders, não
 * spinners" para listas/conteúdo). Uso: <Skeleton className="h-4 w-32" />.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={["skeleton", className].filter(Boolean).join(" ")} aria-hidden />;
}

export function SkeletonCard() {
  return (
    <div className="rounded-[18px] border p-4 sm:p-5" style={{ borderColor: "var(--hairline)" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-2 h-3 w-56" />
        </div>
        <Skeleton className="h-6 w-14 shrink-0 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-3 w-full max-w-64" />
    </div>
  );
}

export function SkeletonLista({ itens = 4 }: { itens?: number }) {
  return (
    <ul className="flex flex-col gap-3" role="status" aria-label="Carregando conteúdo">
      {Array.from({ length: itens }).map((_, i) => (
        <li key={i}>
          <SkeletonCard />
        </li>
      ))}
    </ul>
  );
}
