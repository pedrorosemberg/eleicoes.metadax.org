"use client";

import { ErrorState } from "@/components/ErrorState";

export default function ErrorBusca({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <ErrorState
        titulo="Não foi possível carregar a busca"
        descricao="Algo falhou ao buscar os candidatos. Tente novamente em instantes."
        onRetry={reset}
      />
    </main>
  );
}
