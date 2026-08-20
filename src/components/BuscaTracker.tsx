"use client";

import { useEffect, useRef } from "react";
import { track } from "@vercel/analytics";

/**
 * Registra um evento customizado no Vercel Analytics a cada busca
 * efetivamente realizada (com pelo menos um filtro preenchido) — base
 * para "quantidade de consultas realizadas" em docs/PRIVACIDADE.md.
 * Nenhum dado pessoal é enviado, só a forma da consulta (modo/UF/cargo),
 * nunca o texto livre digitado pelo usuário.
 */
export function BuscaTracker({
  modo,
  temTermo,
  uf,
  cargo,
  temCidade,
  temPartido,
}: {
  modo: "direta" | "indireta";
  temTermo?: boolean;
  uf?: string;
  cargo?: string;
  temCidade?: boolean;
  temPartido?: boolean;
}) {
  const ultimaChave = useRef<string | null>(null);

  useEffect(() => {
    const relevante = modo === "direta" ? Boolean(temTermo) : Boolean(uf || cargo || temCidade || temPartido);
    if (!relevante) return;

    const chave = JSON.stringify({ modo, uf, cargo, temCidade, temPartido, temTermo });
    if (ultimaChave.current === chave) return;
    ultimaChave.current = chave;

    track("busca", {
      modo,
      ...(uf ? { uf } : {}),
      ...(cargo ? { cargo } : {}),
      ...(temCidade ? { temCidade: true } : {}),
      ...(temPartido ? { temPartido: true } : {}),
    });
  }, [modo, temTermo, uf, cargo, temCidade, temPartido]);

  return null;
}
