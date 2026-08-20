import { NextResponse } from "next/server";
import { verificarSaudeFontes } from "@/lib/health";

export async function GET() {
  const checagens = await verificarSaudeFontes();
  return NextResponse.json(
    { checagens, verificadoEm: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
