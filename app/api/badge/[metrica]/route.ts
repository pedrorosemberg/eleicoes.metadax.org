import { NextResponse } from "next/server";
import { buscarEstatisticasRepositorio } from "@/lib/github";
import { gerarBadgeSvg } from "@/lib/badge-svg";

/**
 * Badges do repositório gerados por este projeto, não pelo shields.io —
 * ver src/lib/badge-svg.ts para o racional completo (cache do shields.io
 * é opaco e ficou visivelmente desatualizado no README). Cache aqui é só
 * o `Cache-Control` abaixo, alinhado com a mesma janela de 10 min que
 * `src/lib/github.ts` já usa para a API do GitHub.
 *
 * OBS. sobre um segundo nível de cache fora do nosso controle: o GitHub
 * embute imagens de README através do seu próprio proxy de imagem
 * (`camo.githubusercontent.com`), que também cacheia por cima do que
 * respondemos aqui. Continua sendo estritamente mais fresco do que
 * depender só do cache do shields.io, mas "atualização instantânea" no
 * README nunca é garantida — só o site (`/sobre`) consulta a API do
 * GitHub direto, sem esse proxy intermediário.
 */

const METRICAS = ["estrelas", "forks", "issues", "ultimo-commit", "licenca"] as const;
type Metrica = (typeof METRICAS)[number];

function ehMetricaValida(valor: string): valor is Metrica {
  return (METRICAS as readonly string[]).includes(valor);
}

function relativoBR(dataIso: string): string {
  const dias = Math.floor((Date.now() - new Date(dataIso).getTime()) / 86_400_000);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 30) return `há ${dias} dias`;
  const meses = Math.floor(dias / 30);
  if (meses < 12) return `há ${meses} ${meses === 1 ? "mês" : "meses"}`;
  const anos = Math.floor(meses / 12);
  return `há ${anos} ${anos === 1 ? "ano" : "anos"}`;
}

export async function GET(_request: Request, { params }: { params: Promise<{ metrica: string }> }) {
  const { metrica } = await params;
  if (!ehMetricaValida(metrica)) {
    return NextResponse.json({ error: "Métrica desconhecida" }, { status: 404 });
  }

  // Licença não depende de nenhuma consulta — é a mesma constante já
  // confirmada em DATA_SOURCES.md §8 e no arquivo LICENSE.
  if (metrica === "licenca") {
    return new NextResponse(gerarBadgeSvg("licença", "CC BY 4.0", "#000000"), {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  }

  const repo = await buscarEstatisticasRepositorio();

  let label: string;
  let valor: string;
  const cor = repo ? "#08c" : "#9f9f9f";

  switch (metrica) {
    case "estrelas":
      label = "estrelas";
      valor = repo ? String(repo.estrelas) : "?";
      break;
    case "forks":
      label = "forks";
      valor = repo ? String(repo.forks) : "?";
      break;
    case "issues":
      label = "issues/PRs abertos";
      valor = repo ? String(repo.issuesEPrsAbertos) : "?";
      break;
    case "ultimo-commit":
      label = "último commit";
      valor = repo ? relativoBR(repo.atualizadoEm) : "?";
      break;
  }

  return new NextResponse(gerarBadgeSvg(label, valor, cor), {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
    },
  });
}
