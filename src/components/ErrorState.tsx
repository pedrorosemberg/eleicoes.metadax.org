"use client";

import { IconAlertTriangle } from "./icons";

/**
 * Estado de erro padrão do produto — usado pelos boundaries error.tsx de
 * cada rota. Ícone + texto, nunca cor sozinha (ver docs/DESIGN_SYSTEM.md §3).
 */
export function ErrorState({
  titulo = "Algo deu errado",
  descricao = "Não foi possível carregar esta página. Tente novamente.",
  onRetry,
}: {
  titulo?: string;
  descricao?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-[18px] border px-6 py-12 text-center"
      style={{ borderColor: "var(--hairline)" }}
      role="alert"
    >
      <span className="text-[var(--text-secondary)]">
        <IconAlertTriangle className="h-8 w-8" />
      </span>
      <h2 className="text-[17px] font-semibold text-[var(--text-primary)]">{titulo}</h2>
      <p className="text-sm text-[var(--text-secondary)]">{descricao}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 h-10 rounded-[10px] px-5 text-sm font-semibold"
          style={{ background: "var(--action-primary-bg)", color: "var(--action-primary-fg)" }}
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}
