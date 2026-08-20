import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";

/**
 * Ícones PWA em tamanhos maiores (192/512) para o manifest — mesmo
 * desenho do favicon (app/icon.tsx), sem imitar marca oficial (ver
 * comentário lá). Apenas os tamanhos usados pelo manifest são aceitos.
 */
const TAMANHOS_PERMITIDOS = [192, 512];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size: sizeParam } = await params;
  const tamanho = Number(sizeParam);
  if (!TAMANHOS_PERMITIDOS.includes(tamanho)) {
    return NextResponse.json({ error: "Tamanho não suportado" }, { status: 404 });
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1E1E1E",
          borderRadius: Math.round(tamanho * 0.22),
        }}
      >
        <svg
          width={Math.round(tamanho * 0.62)}
          height={Math.round(tamanho * 0.62)}
          viewBox="0 0 20 20"
          fill="none"
        >
          <path
            d="M4 10.5 8 14.5 16 6"
            stroke="#FFFFFF"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    { width: tamanho, height: tamanho },
  );
}
