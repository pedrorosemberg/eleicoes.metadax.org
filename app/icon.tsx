import { ImageResponse } from "next/og";

/**
 * Favicon gerado dinamicamente — deliberadamente NÃO é uma cópia do
 * favicon oficial do governo federal (gov.br). Usar o ícone oficial num
 * domínio que não é `.gov.br` arriscaria sugerir que este é um site
 * governamental oficial, o que não é verdade; a cor institucional do
 * governo (azul) também contrariaria a regra de neutralidade
 * político-partidária deste projeto (ver docs/DESIGN_SYSTEM.md). Este
 * ícone é original: preto e branco, uma marca de checagem — remete a
 * "consulta/validação" sem imitar nenhuma marca oficial. Tamanhos maiores
 * (192/512, para o manifest PWA) vivem em app/icons/[size]/route.tsx.
 */
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 7,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
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
    { ...size },
  );
}
