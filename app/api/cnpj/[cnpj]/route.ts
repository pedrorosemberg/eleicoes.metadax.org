import { NextResponse } from "next/server";
import { buscarDadosCnpj } from "@/lib/enrichment";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cnpj: string }> },
) {
  const { cnpj } = await params;
  const dados = await buscarDadosCnpj(cnpj);
  if (!dados) {
    return NextResponse.json({ error: "CNPJ não encontrado" }, { status: 404 });
  }
  return NextResponse.json(dados, {
    headers: { "Cache-Control": "public, max-age=604800, stale-while-revalidate=86400" },
  });
}
