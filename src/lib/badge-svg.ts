/**
 * Gerador próprio de badge SVG, estilo shields.io "flat" — construído para
 * não depender do cache opaco do shields.io. Confirmado em 25/08/2026: o
 * badge de estrelas do README continuou mostrando "0" bem depois do
 * repositório já ter 1 estrela real (visível corretamente no site, que
 * consulta a API do GitHub direto, sem passar pelo shields.io). Gerando o
 * SVG aqui, o único cache que existe é o `Cache-Control` que este projeto
 * define (ver app/api/badge/[metrica]/route.ts) — a mesma janela de 10 min
 * que o resto do projeto já usa para chamadas ao GitHub.
 */

const ALTURA = 20;
const COR_LABEL = "#555";
const PADDING_HORIZONTAL = 10;

/** Aproximação de largura de texto em Verdana 11px — suficiente para um
 * badge legível, sem precisar medir texto de verdade (não há canvas/DOM
 * disponível no runtime de servidor). */
function larguraTexto(texto: string): number {
  let largura = 0;
  for (const ch of texto) {
    if (/[iIl.,:;'!|]/.test(ch)) largura += 4;
    else if (/[mMW]/.test(ch)) largura += 10;
    else if (/[A-Z]/.test(ch)) largura += 8;
    else largura += 7;
  }
  return Math.round(largura);
}

function escaparXml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function gerarBadgeSvg(label: string, valor: string, corValor: string): string {
  const larguraLabel = larguraTexto(label) + PADDING_HORIZONTAL * 2;
  const larguraValor = larguraTexto(valor) + PADDING_HORIZONTAL * 2;
  const larguraTotal = larguraLabel + larguraValor;
  const labelEsc = escaparXml(label);
  const valorEsc = escaparXml(valor);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${larguraTotal}" height="${ALTURA}" role="img" aria-label="${labelEsc}: ${valorEsc}">
<linearGradient id="s" x2="0" y2="100%">
<stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
<stop offset="1" stop-opacity=".1"/>
</linearGradient>
<clipPath id="r"><rect width="${larguraTotal}" height="${ALTURA}" rx="3" fill="#fff"/></clipPath>
<g clip-path="url(#r)">
<rect width="${larguraLabel}" height="${ALTURA}" fill="${COR_LABEL}"/>
<rect x="${larguraLabel}" width="${larguraValor}" height="${ALTURA}" fill="${corValor}"/>
<rect width="${larguraTotal}" height="${ALTURA}" fill="url(#s)"/>
</g>
<g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
<text x="${larguraLabel / 2}" y="14">${labelEsc}</text>
<text x="${larguraLabel + larguraValor / 2}" y="14">${valorEsc}</text>
</g>
</svg>`;
}
