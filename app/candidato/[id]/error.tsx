"use client";

import { ErrorState } from "@/components/ErrorState";

export default function ErrorCandidato({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <ErrorState
        titulo="Não foi possível carregar este candidato"
        descricao="Algo falhou ao buscar os dados. Tente novamente em instantes."
        onRetry={reset}
      />
    </main>
  );
}
