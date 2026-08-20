import { NextResponse } from "next/server";
import { calcularEstatisticas } from "@/lib/stats";

/**
 * Endpoint público de agregados (nunca dado individual). CORS aberto via
 * middleware.ts. Cache curto — os agregados mudam conforme a ingestão
 * roda (ver docs/ARCHITECTURE.md §4).
 */
export async function GET() {
  const estatisticas = await calcularEstatisticas();
  return NextResponse.json(estatisticas, {
    headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" },
  });
}
