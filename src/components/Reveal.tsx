"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/**
 * Revela o conteúdo com fade+translate ao entrar na tela. Com
 * `prefers-reduced-motion: reduce`, o conteúdo já nasce visível — ver
 * src/styles/animations.css. Puramente decorativo, nunca deveria esconder
 * conteúdo de verdade — por isso o timeout de segurança abaixo, e o
 * fallback `<noscript>` em app/layout.tsx para quando JS não roda.
 */
export function Reveal({
  children,
  delayMs = 0,
  className,
  style,
}: {
  children: ReactNode;
  delayMs?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const revelar = () => el.classList.add("is-visible");

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          revelar();
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);

    // Rede de segurança: o conteúdo nunca pode ficar permanentemente
    // invisível se o IntersectionObserver não disparar por qualquer
    // motivo (hidratação lenta, scroll instantâneo, captura
    // automatizada) — revela de qualquer forma após um tempo curto.
    const timeout = setTimeout(revelar, 1200);

    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={["reveal", className].filter(Boolean).join(" ")}
      style={{ ...style, transitionDelay: `${delayMs}ms` }}
    >
      {children}
    </div>
  );
}
