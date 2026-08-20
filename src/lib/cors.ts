/**
 * CORS deliberadamente permissivo nas rotas de API: os dados servidos
 * aqui são públicos por natureza (candidatos, CNPJ, transparência) — a
 * ideia é que qualquer site ou aplicação possa consultar livremente,
 * inclusive subdomínios da própria METADAX (*.metadax.org,
 * *.metadax.com.br), que têm acesso garantido por não haver CORS algum
 * capaz de bloqueá-los. Aplicado globalmente em middleware.ts. Ver
 * docs/ARCHITECTURE.md sobre o uso público dessas rotas como uma espécie
 * de proxy de dados.
 */
export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};
