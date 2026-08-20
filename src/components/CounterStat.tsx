"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Número que conta a partir de 0 ao entrar na tela. Com
 * `prefers-reduced-motion: reduce`, pula direto para o valor final —
 * nunca deixa o usuário preso numa animação que ele pediu para evitar.
 */
export function CounterStat({
  valor,
  sufixo = "",
  rotulo,
}: {
  valor: number;
  sufixo?: string;
  rotulo: string;
}) {
  const [exibido, setExibido] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefereReduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();

        if (prefereReduzido) {
          setExibido(valor);
          return;
        }

        const duracaoMs = 1200;
        const inicio = performance.now();
        function passo(agora: number) {
          const progresso = Math.min((agora - inicio) / duracaoMs, 1);
          setExibido(Math.round(valor * (1 - Math.pow(1 - progresso, 3))));
          if (progresso < 1) requestAnimationFrame(passo);
        }
        requestAnimationFrame(passo);
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [valor]);

  return (
    <div ref={ref}>
      <p className="font-financial text-[clamp(28px,5vw,40px)] font-semibold text-[var(--text-primary)]">
        {exibido}
        {sufixo}
      </p>
      <p className="mt-1 text-sm text-[var(--text-tertiary)]">{rotulo}</p>
    </div>
  );
}
