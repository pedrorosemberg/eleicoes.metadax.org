import { ImageResponse } from "next/og";

/** Mesmo ícone do favicon (app/icon.tsx), em 180×180 para iOS/Apple. */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
          borderRadius: 40,
        }}
      >
        <svg width="112" height="112" viewBox="0 0 20 20" fill="none">
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
