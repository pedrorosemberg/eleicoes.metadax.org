#!/usr/bin/env node
/**
 * Revisão de segurança automatizada via Gemini API (Google AI Studio, camada
 * gratuita). Substitui a action anthropics/claude-code-security-review:
 * aquela action é hardcoded para a API/CLI da Anthropic (não aceita
 * endpoint/provedor customizado) — decisão do mantenedor (26/08/2026) foi não
 * usar uma ANTHROPIC_API_KEY paga, então este script implementa o
 * equivalente contra um modelo gratuito.
 *
 * Segunda geração deste script (26/08/2026): a primeira usava a API gratuita
 * da NVIDIA (build.nvidia.com). Trocada para Gemini depois de um achado real
 * documentado em docs/ARCHITECTURE.md §19 — a chamada à NVIDIA travava
 * (nunca respondia) sempre que rodava a partir de um runner do GitHub
 * Actions, em 6 tentativas seguidas com 4 valores de timeout diferentes,
 * enquanto a mesma chamada respondia normalmente (401, ~400ms) de fora do
 * GitHub Actions — evidência de bloqueio/limitação silenciosa específica do
 * IP de origem do runner, não um problema no código deste script.
 *
 * Roda a cada commit de PR (sem cache "já rodei" — o bug que isso causou na
 * action anterior, ver docs/ARCHITECTURE.md §15, simplesmente não existe
 * aqui: cada execução é isolada, cada commit é revisado de verdade).
 *
 * Sem GEMINI_API_KEY, ou se a chamada à API falhar por qualquer motivo, o
 * script falha (exit 1) — falha fechada, nunca aberta: um gate de segurança
 * obrigatório que "passa" quando não consegue revisar é pior que não ter
 * gate nenhum.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// gemini-2.5-flash: rápido e no tier gratuito do Google AI Studio — se a API
// começar a responder "model not found", o catálogo pode ter mudado; conferir
// o nome atual em https://aistudio.google.com/ e ajustar GEMINI_MODEL no
// workflow.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
// Override só para desenvolvimento/teste local (apontar para um mock) — em
// produção o workflow nunca define GEMINI_API_URL, então usa sempre o
// endpoint real.
const GEMINI_API_URL =
  process.env.GEMINI_API_URL ||
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const BASE_SHA = process.env.BASE_SHA;
const HEAD_SHA = process.env.HEAD_SHA;
const INSTRUCTIONS_PATH = ".github/ai-security-review-instructions.md";
const MAX_DIFF_CHARS = 60_000; // margem segura para o contexto do modelo + prompt + instruções

function falhar(mensagem) {
  console.error(`::error::${mensagem}`);
  process.exit(1);
}

if (!GEMINI_API_KEY) {
  falhar(
    "GEMINI_API_KEY não está configurada. Gere uma chave gratuita em " +
      "https://aistudio.google.com/apikey (Settings → Secrets and variables → Actions → " +
      "New repository secret → GEMINI_API_KEY). Sem ela, este gate de segurança " +
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
// 60s: valor normal de segurança de rede, não uma correção para um problema conhecido — a API do
// Gemini é infraestrutura do Google, não tem o histórico de travamento que a da NVIDIA tinha a
// partir de runners do GitHub Actions (ver docs/ARCHITECTURE.md §19). Ainda assim, todo fetch de
// rede numa esteira de CI merece um teto explícito: sem isso, uma conexão travada consome o
// timeout inteiro do job (~10min) antes de sequer reportar erro.
const TIMEOUT_MS = 60_000;

async function chamarGeminiUmaVez() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetch(GEMINI_API_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "x-goog-api-key": GEMINI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.2,
          topP: 0.7,
          // 4096, não 1024: o modelo precisa de espaço para o JSON estruturado
          // com múltiplos achados (findings + summary), não uma resposta curta.
          maxOutputTokens: 4096,
          // Pede ao próprio Gemini para gerar só JSON, sem cercas de markdown —
          // mais confiável do que depender só da instrução em texto no prompt.
          responseMimeType: "application/json",
        },
      }),
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const corpo = await res.text().catch(() => "");
    throw new Error(
      `Gemini API respondeu ${res.status} ${res.statusText}. Verifique se o modelo ` +
        `"${GEMINI_MODEL}" ainda existe no catálogo do Google AI Studio (pode ter sido ` +
        `renomeado/removido — confira em https://aistudio.google.com/ e ajuste a env ` +
        `GEMINI_MODEL no workflow se preciso) e se GEMINI_API_KEY é válida. ` +
        `Corpo da resposta: ${corpo.slice(0, 500)}`,
    );
  }

  const json = await res.json();
  const conteudo = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!conteudo) {
    const motivoBloqueio = json.promptFeedback?.blockReason;
    if (motivoBloqueio) {
      throw new Error(
        `Gemini bloqueou a resposta por segurança (blockReason: ${motivoBloqueio}) — não é um ` +
          "achado, é o próprio filtro de conteúdo do Gemini reagindo ao diff (ex.: um PR grande " +
          "com trechos de dados sensíveis). Considere revisar manualmente este PR.",
      );
    }
    throw new Error(`Resposta do Gemini sem conteúdo utilizável: ${JSON.stringify(json).slice(0, 500)}`);
  }
  return conteudo;
}

// Retry só cobre falha de transporte (timeout, "fetch failed", instabilidade momentânea da
// API) — não existe para "tentar de novo até dar uma resposta que goste": um erro HTTP
// explícito (401/404/etc.) ou uma resposta sem conteúdo já é um erro determinístico, mas
// deixamos tentar de novo mesmo assim porque não vale a pena distinguir a causa aqui — o
// gate falha fechado de qualquer forma se as duas tentativas falharem.
async function chamarGemini() {
  let ultimoErro;
  for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
    try {
      return await chamarGeminiUmaVez();
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
  respostaBruta = await chamarGemini();
} catch (err) {
  falhar(`Chamada à API do Gemini falhou após ${TENTATIVAS} tentativa(s): ${err.message}`);
}

function extrairJson(texto) {
  // Alguns modelos envolvem a resposta em ```json ... ``` mesmo quando instruídos a não fazer isso
  // (ou quando responseMimeType não é respeitado por algum motivo) — mantido como rede de segurança.
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
  `## Revisão de segurança automatizada (Gemini ${GEMINI_MODEL})`,
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
