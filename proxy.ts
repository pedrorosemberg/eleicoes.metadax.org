import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { CORS_HEADERS } from "@/lib/cors";

/**
 * CORS aberto para toda a camada /api/* — ver src/lib/cors.ts para a
 * justificativa (dados públicos, consumo livre por qualquer site,
 * incluindo *.metadax.org e *.metadax.com.br). Centralizado aqui em vez
 * de repetido em cada route.ts.
 */
export function proxy(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
  }

  const response = NextResponse.next();
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
