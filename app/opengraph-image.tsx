import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Imagem própria do projeto para compartilhamento (OG/Twitter Card) —
 * deliberadamente não usa nenhuma imagem promocional da METADAX. Mesmo
 * motivo do favicon: preto/branco, sem imitar marca oficial, sem azul
 * institucional.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#FFFFFF",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 14,
              background: "#1E1E1E",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="36" height="36" viewBox="0 0 20 20" fill="none">
              <path
                d="M4 10.5 8 14.5 16 6"
                stroke="#FFFFFF"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div style={{ fontSize: 32, fontWeight: 600, color: "#1E1E1E" }}>FatoEleitoral</div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 48,
            fontSize: 56,
            fontWeight: 600,
            color: "#1E1E1E",
            lineHeight: 1.15,
          }}
        >
          <span>Transparência eleitoral,</span>
          <span>sem cor de partido.</span>
        </div>
        <div style={{ marginTop: 28, fontSize: 26, color: "rgba(0,0,0,0.64)", maxWidth: 900 }}>
          TSE · Portal da Transparência · Receita Federal — em um só lugar.
        </div>
      </div>
    ),
    { ...size },
  );
}
