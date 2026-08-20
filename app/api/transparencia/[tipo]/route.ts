import { NextResponse } from "next/server";
import { buscarTransparencia } from "@/lib/enrichment";

const ALLOWLIST = ["peps", "contratos/cpf-cnpj", "ceis", "cnep", "cepim", "emendas"] as const;
type TipoPermitido = (typeof ALLOWLIST)[number];

/**
 * Proxy restrito por allowlist — nunca expor a API do Portal da
 * Transparência como proxy genérico. Ver docs/DATA_SOURCES.md §4.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ tipo: string }> },
) {
  const { tipo } = await params;
  if (!ALLOWLIST.includes(tipo as TipoPermitido)) {
    return NextResponse.json({ error: "Tipo de consulta não permitido" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const query: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    query[key] = value;
  });

  const dados = await buscarTransparencia(tipo as TipoPermitido, query);
  if (dados === null) {
    // null = chave não configurada ou a chamada falhou; um array vazio
    // ([]) é um resultado válido ("nada encontrado") e não cai aqui.
    return NextResponse.json(
      { error: "Indisponível: chave de API não configurada ou fonte fora do ar" },
      { status: 404 },
    );
  }
  return NextResponse.json(dados, {
    headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=600" },
  });
}
