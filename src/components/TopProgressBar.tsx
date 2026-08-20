/**
 * Feedback visual de "página carregando" — uma barra fina animada no
 * topo, mostrada automaticamente pelo App Router enquanto o loading.tsx
 * de uma rota está ativo (a navegação real ainda não terminou).
 */
export function TopProgressBar() {
  return <div className="top-progress" role="status" aria-label="Carregando página" />;
}
