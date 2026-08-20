"use client";

import { ErrorState } from "@/components/ErrorState";

export default function ErrorMapa({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <ErrorState
        titulo="Não foi possível carregar as estatísticas"
        descricao="Algo falhou ao calcular os agregados. Tente novamente em instantes."
        onRetry={reset}
      />
    </main>
  );
}
