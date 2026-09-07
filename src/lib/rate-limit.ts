import type { NextRequest } from "next/server";

/**
 * Rate limit em memória, por IP, aplicado a toda a camada /api/* (ver
 * proxy.ts). Escopo deliberadamente simples: cada isolado de Edge Function
 * mantém seu próprio contador — não é um limite global exato entre regiões,
 * mas barra o padrão mais comum de abuso (um scraper batendo repetido do
 * mesmo IP) sem depender de um serviço externo (Redis/KV) que este projeto
 * não tem hoje. CORS continua aberto (docs/ARCHITECTURE.md §10) — isto é
 * throttling, não autenticação.
 */
const JANELA_MS = 60_000;
const LIMITE_POR_JANELA = 60;
const MAX_ENTRADAS_RASTREADAS = 5_000;

interface Contador {
  quantidade: number;
  reiniciaEm: number;
}

const contadores = new Map<string, Contador>();

function obterIpCliente(request: NextRequest): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "desconhecido"
  );
}

export interface ResultadoRateLimit {
  limitado: boolean;
  restantes: number;
  reiniciaEmSegundos: number;
}

export function verificarRateLimit(request: NextRequest): ResultadoRateLimit {
  const ip = obterIpCliente(request);
  const agora = Date.now();

  // Poda oportunista: evita crescimento sem limite do Map num isolado que
  // fica quente por muito tempo, sem precisar de um job de limpeza separado.
  if (contadores.size > MAX_ENTRADAS_RASTREADAS) {
    for (const [chave, contador] of contadores) {
      if (contador.reiniciaEm <= agora) contadores.delete(chave);
    }
  }

  const existente = contadores.get(ip);
  if (!existente || existente.reiniciaEm <= agora) {
    contadores.set(ip, { quantidade: 1, reiniciaEm: agora + JANELA_MS });
    return { limitado: false, restantes: LIMITE_POR_JANELA - 1, reiniciaEmSegundos: Math.ceil(JANELA_MS / 1000) };
  }

  existente.quantidade += 1;
  const reiniciaEmSegundos = Math.max(1, Math.ceil((existente.reiniciaEm - agora) / 1000));
  if (existente.quantidade > LIMITE_POR_JANELA) {
    return { limitado: true, restantes: 0, reiniciaEmSegundos };
  }
  return { limitado: false, restantes: LIMITE_POR_JANELA - existente.quantidade, reiniciaEmSegundos };
}
