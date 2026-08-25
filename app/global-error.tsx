"use client";

/**
 * Boundary de erro do próprio layout raiz — substitui todo o <html> se o
 * layout em si falhar. Não pode depender de nada do layout (nem tokens
 * CSS externos), por isso os estilos aqui são inline.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#FFFFFF", color: "#1E1E1E" }}>
        <main style={{ maxWidth: 480, margin: "80px auto", padding: "0 16px", textAlign: "center" }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: "#C4281F" }}>Algo deu errado</h1>
          <p style={{ color: "rgba(0,0,0,0.7)", marginTop: 8 }}>
            Não foi possível carregar o Fato Eleitoral agora. Tente novamente.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 16,
              height: 40,
              padding: "0 20px",
              background: "#1E1E1E",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 10,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Tentar novamente
          </button>
        </main>
      </body>
    </html>
  );
}
