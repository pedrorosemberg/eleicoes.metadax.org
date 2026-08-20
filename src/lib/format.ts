/**
 * Toda data/hora do produto é exibida no padrão brasileiro, fuso
 * America/Sao_Paulo (GMT-3), independentemente do fuso do servidor que
 * renderiza a página (a Vercel roda em UTC por padrão) — requisito
 * explícito do projeto.
 */

const TIME_ZONE = "America/Sao_Paulo";

export function formatarDataHoraBR(data: string | number | Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(data)) + " (GMT-3)";
}

export function formatarDataBR(data: string | number | Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(data));
}

export function formatarHoraBR(data: string | number | Date): string {
  return (
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: TIME_ZONE,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date(data)) + " (GMT-3)"
  );
}

export function formatarMoedaBRL(valor: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}
