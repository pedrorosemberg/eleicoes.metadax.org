/**
 * Alguns provedores (confirmado: BrasilAPI) bloqueiam com 403 o User-Agent
 * padrão que o `fetch` nativo do Node/undici envia ("node"). Identificar
 * o chamador explicitamente também é boa prática de API — permite ao
 * provedor nos contatar/whitelistar se necessário.
 */
export const USER_AGENT = "fatoeleitoral.metadax.org/1.0 (+https://fatoeleitoral.metadax.org)";
