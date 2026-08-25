import Image from "next/image";

/**
 * Marca do produto — FatoEleitoral (assets/fatoeleitoral.svg), enviada
 * pelo mantenedor em 26/08/2026 para substituir a marca provisória
 * anterior (checkmark neutro, ver git history de app/icon.tsx).
 */
export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src="/assets/fatoeleitoral.svg"
      alt="FatoEleitoral"
      width={8620}
      height={1961}
      priority
      // Estilo inline além da classe Tailwind: a imagem tem largura intrínseca
      // de 8620px (viewBox do SVG fornecido) — sem um tamanho já resolvido no
      // primeiro paint, uma folha de estilo externa atrasada deixaria o
      // <img> renderizar no tamanho nativo por um instante, estourando o
      // layout horizontal da página.
      style={{ height: 32, width: "auto" }}
      className={["h-8 w-auto sm:h-9", className].filter(Boolean).join(" ")}
    />
  );
}
