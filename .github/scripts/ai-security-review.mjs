#!/usr/bin/env node
/**
 * Revisão de segurança automatizada via NVIDIA NIM (API gratuita,
 * https://build.nvidia.com — endpoint OpenAI-compatible). Substitui a action
 * anthropics/claude-code-security-review: aquela action é hardcoded para a
 * API/CLI da Anthropic (não aceita endpoint/provedor customizado) — decisão
 * do mantenedor (26/08/2026) foi não usar uma ANTHROPIC_API_KEY paga, então
 * este script implementa o equivalente contra um modelo gratuito da NVIDIA.
 *
 * Roda a cada commit de PR (sem cache "já rodei" — o bug que isso causou na
 * action anterior, ver docs/ARCHITECTURE.md §15, simplesmente não existe
 * aqui: cada execução é isolada, cada commit é revisado de verdade).
 *
 * Sem NVIDIA_API_KEY, ou se a chamada à API falhar por qualquer motivo, o
 * script falha (exit 1) — falha fechada, nunca aberta: um gate de segurança
 * obrigatório que "passa" quando não consegue revisar é pior que não ter
 * gate nenhum.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const NVIDIA_MODEL = process.env.NVIDIA_MODEL || "meta/llama-3.3-70b-instruct";
// Override só para desenvolvimento/teste local (apontar para um mock) — em
// produção o workflow nunca define NVIDIA_API_URL, então usa sempre o
// endpoint real.
const NVIDIA_API_URL = process.env.NVIDIA_API_URL || "https://integrate.api.nvidia.com/v1/chat/completions";
const BASE_SHA = process.env.BASE_SHA;
const HEAD_SHA = process.env.HEAD_SHA;
const INSTRUCTIONS_PATH = ".github/ai-security-review-instructions.md";
const MAX_DIFF_CHARS = 60_000; // margem segura para o contexto do modelo + prompt + instruções

function falhar(mensagem) {
  console.error(`::error::${mensagem}`);
  process.exit(1);
}

if (!NVIDIA_API_KEY) {
  falhar(
    "NVIDIA_API_KEY não está configurada. Cadastre uma chave gratuita em " +
      "https://build.nvidia.com (Settings → Secrets and variables → Actions → " +
      "New repository secret → NVIDIA_API_KEY). Sem ela, este gate de segurança " +
      "falha por padrão (falha fechada) — ver docs/ARCHITECTURE.md §15.",
  );
}
if (!BASE_SHA || !HEAD_SHA) {
  falhar("BASE_SHA/HEAD_SHA não foram passados ao script — erro de configuração do workflow.");
}

let diff;
try {
  diff = execFileSync("git", ["diff", `${BASE_SHA}...${HEAD_SHA}`], {
    encoding: "utf-8",
    maxBuffer: 1024 * 1024 * 50,
  });
} catch (err) {
  falhar(`Não consegui calcular o diff (${BASE_SHA}...${HEAD_SHA}): ${err.message}`);
}

if (!diff.trim()) {
  console.log("Diff vazio — nada para revisar.");
  process.exit(0);
}

let diffTruncado = false;
if (diff.length > MAX_DIFF_CHARS) {
  diff = diff.slice(0, MAX_DIFF_CHARS);
  diffTruncado = true;
  console.warn(
    `::warning::Diff maior que ${MAX_DIFF_CHARS} caracteres, truncado para caber no contexto do modelo. ` +
      "A revisão automática cobre só a parte inicial do diff — não substitui revisão humana em PRs grandes.",
  );
}

const instrucoesCustomizadas = readFileSync(INSTRUCTIONS_PATH, "utf-8");

const systemPrompt = `Você é um revisor de segurança de código sênior. Analise o diff de um pull request e responda EXCLUSIVAMENTE com um objeto JSON válido (sem markdown, sem texto antes ou depois), no formato:

{"findings": [{"severity": "critical" | "high" | "medium" | "low", "file": "caminho/do/arquivo", "title": "título curto", "description": "explicação do problema e do impacto concreto"}], "summary": "resumo de 1-2 frases"}

Se não houver nenhum achado, retorne {"findings": [], "summary": "..."}.

Além de vulnerabilidades de código clássicas (injeção, XSS, falhas de autenticação/autorização, tratamento inseguro de dados, dependências vulneráveis), preste atenção especial ao seguinte, específico deste projeto:

${instrucoesCustomizadas}`;

const userPrompt = `Diff do pull request${diffTruncado ? " (truncado — só a parte inicial)" : ""}:\n\n\`\`\`diff\n${diff}\n\`\`\``;

const TENTATIVAS = 2; // 1 tentativa original + 1 retry — só para falha de rede/timeout, não para achado real
const TIMEOUT_MS = 60_000; // por tentativa — sem isso, um fetch travado consome o timeout inteiro do job (~10min) antes de falhar

async function chamarNvidiaUmaVez() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetch(NVIDIA_API_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${NVIDIA_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: NVIDIA_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        top_p: 0.7,
        // 4096, não 1024: o modelo precisa de espaço para o JSON estruturado
        // com múltiplos achados (findings + summary), não uma resposta curta.
        max_tokens: 4096,
      }),
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const corpo = await res.text().catch(() => "");
    throw new Error(
      `NVIDIA API respondeu ${res.status} ${res.statusText}. Verifique se o modelo ` +
        `"${NVIDIA_MODEL}" ainda existe no catálogo de build.nvidia.com (pode ter sido ` +
        `renomeado/removido — confira e ajuste a env NVIDIA_MODEL no workflow se preciso) ` +
        `e se NVIDIA_API_KEY é válida. Corpo da resposta: ${corpo.slice(0, 500)}`,
    );
  }

  const json = await res.json();
  const conteudo = json.choices?.[0]?.message?.content;
  if (!conteudo) {
    throw new Error(`Resposta da NVIDIA sem conteúdo utilizável: ${JSON.stringify(json).slice(0, 500)}`);
  }
  return conteudo;
}

// Retry só cobre falha de transporte (timeout, "fetch failed", instabilidade momentânea da
// API) — não existe para "tentar de novo até dar uma resposta que goste": um erro HTTP
// explícito (401/404/etc.) ou uma resposta sem conteúdo já é um erro determinístico, mas
// deixamos tentar de novo mesmo assim porque não vale a pena distinguir a causa aqui — o
// gate falha fechado de qualquer forma se as duas tentativas falharem.
async function chamarNvidia() {
  let ultimoErro;
  for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
    try {
      return await chamarNvidiaUmaVez();
    } catch (err) {
      ultimoErro = err;
      if (tentativa < TENTATIVAS) {
        console.warn(`::warning::Tentativa ${tentativa}/${TENTATIVAS} falhou (${err.message}) — tentando de novo em 3s.`);
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
  }
  throw ultimoErro;
}

let respostaBruta;
try {
  respostaBruta = await chamarNvidia();
} catch (err) {
  falhar(`Chamada à API da NVIDIA falhou após ${TENTATIVAS} tentativa(s): ${err.message}`);
}

function extrairJson(texto) {
  // Alguns modelos envolvem a resposta em ```json ... ``` mesmo quando instruídos a não fazer isso.
  const semCercas = texto.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(semCercas);
}

let resultado;
try {
  resultado = extrairJson(respostaBruta);
} catch {
  falhar(
    `Não consegui interpretar a resposta do modelo como JSON — tratando como falha (não dá para ` +
      `confiar num resultado que não conseguimos ler). Resposta bruta:\n${respostaBruta.slice(0, 2000)}`,
  );
}

const findings = Array.isArray(resultado.findings) ? resultado.findings : [];
const severidadesGraves = new Set(["critical", "high"]);
const achadosGraves = findings.filter((f) => severidadesGraves.has(String(f.severity).toLowerCase()));

const linhas = [
  `## Revisão de segurança automatizada (NVIDIA ${NVIDIA_MODEL})`,
  "",
  resultado.summary || "Sem resumo.",
  "",
];

if (findings.length === 0) {
  linhas.push("Nenhum achado.");
} else {
  for (const f of findings) {
    linhas.push(`### ${(f.severity || "?").toUpperCase()} — ${f.title || "(sem título)"}`);
    if (f.file) linhas.push(`**Arquivo:** \`${f.file}\``);
    linhas.push(f.description || "");
    linhas.push("");
  }
}
if (diffTruncado) {
  linhas.push("", "_Diff truncado — esta revisão cobriu só a parte inicial do PR._");
}

const corpoComentario = linhas.join("\n");
writeFileSync("ai-security-review-comment.md", corpoComentario, "utf-8");

const summaryPath = process.env.GITHUB_STEP_SUMMARY;
if (summaryPath) {
  writeFileSync(summaryPath, corpoComentario + "\n", { flag: "a" });
}

console.log(corpoComentario);

if (achadosGraves.length > 0) {
  console.error(`::error::${achadosGraves.length} achado(s) de severidade alta/crítica.`);
  process.exit(1);
}

console.log("Sem achados de severidade alta/crítica.");
process.exit(0);
