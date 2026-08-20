"use client";

import { useEffect, useState } from "react";

/**
 * Splash de entrada próprio do projeto — sem nenhuma dependência de rede
 * externa (nada de cdn.metadax.com.br). Curto, não-bloqueante: some
 * sozinho assim que o documento termina de carregar, ou depois de um
 * teto de segurança de 900ms, o que vier primeiro — nunca fica preso na
 * tela como um loader externo poderia ficar se a rede de terceiro
 * travasse. Some para sempre depois da primeira visita da aba (sessionStorage),
 * para não repetir a cada navegação interna.
 */
export function ProjectLoader() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("eleicoes-loader-visto")) return;
    } catch {
      // sessionStorage indisponível (modo privado restrito) — segue sem persistir, sem quebrar.
    }
    // Não dá para saber isso durante a renderização (sessionStorage só
    // existe no browser, e o HTML do servidor precisa nascer sem o
    // loader para não conflitar na hidratação) — por isso é um efeito
    // de verdade, sincronizando com um sistema externo (storage do
    // navegador), não um caso de "estado derivado" que o lint sugere evitar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisivel(true);

    const esconder = () => {
      setVisivel(false);
      try {
        sessionStorage.setItem("eleicoes-loader-visto", "1");
      } catch {
        // ok ignorar
      }
    };

    if (document.readyState === "complete") {
      const t = setTimeout(esconder, 300);
      return () => clearTimeout(t);
    }

    const teto = setTimeout(esconder, 900);
    window.addEventListener("load", esconder, { once: true });
    return () => {
      clearTimeout(teto);
      window.removeEventListener("load", esconder);
    };
  }, []);

  if (!visivel) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: "var(--surface-canvas)" }}
      role="status"
      aria-label="Carregando"
    >
      <div className="flex flex-col items-center gap-3">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden>
          <circle cx="24" cy="24" r="20" stroke="var(--hairline-strong)" strokeWidth="3" />
          <path
            className="spinner"
            style={{ transformOrigin: "24px 24px" }}
            d="M44 24a20 20 0 0 0-20-20"
            stroke="var(--text-primary)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
        <span className="text-sm font-semibold tracking-wide text-[var(--text-secondary)]">
          Eleições
        </span>
      </div>
    </div>
  );
}
