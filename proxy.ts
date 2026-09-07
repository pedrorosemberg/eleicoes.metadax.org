import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { CORS_HEADERS } from "@/lib/cors";
import { verificarRateLimit } from "@/lib/rate-limit";

/**
 * CORS aberto para toda a camada /api/* — ver src/lib/cors.ts para a
 * justificativa (dados públicos, consumo livre por qualquer site,
 * incluindo *.metadax.org e *.metadax.com.br). Centralizado aqui em vez
 * de repetido em cada route.ts.
 *
 * Rate limit por IP também centralizado aqui (ver src/lib/rate-limit.ts) —
 * proteção contra scraping automatizado nas rotas que fazem proxy para
 * fontes externas (CNPJ, Portal da Transparência, certidões), sem exigir
 * autenticação (o CORS aberto continua de propósito).
 */
export function proxy(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
  }

  const { limitado, restantes, reiniciaEmSegundos } = verificarRateLimit(request);
  if (limitado) {
    return new NextResponse(JSON.stringify({ erro: "Limite de requisições excedido. Tente novamente em instantes." }), {
      status: 429,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json",
        "Retry-After": String(reiniciaEmSegundos),
      },
    });
  }

  const response = NextResponse.next();
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  response.headers.set("X-RateLimit-Remaining", String(restantes));
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
