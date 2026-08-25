# Contribuindo

Guia técnico para quem vai mexer no código. Para formas mais informais de ajudar (reportar um
dado errado, sugerir uma fonte, validar informação), veja
[/participe](https://fatoeleitoral.metadax.org/participe) no site.

## Configuração local

```bash
git clone https://github.com/pedrorosemberg/eleicoes.metadax.org.git
cd eleicoes.metadax.org
npm install
cp .env.example .env.local
npm run dev
```

O site sobe em `http://localhost:3000` funcionando **sem nenhuma variável de ambiente
configurada** — as seções que dependem de chave externa (Portal da Transparência, visitantes do
site) degradam graciosamente para "indisponível" em vez de quebrar. Variáveis de `.env.example`:

| Variável | Obrigatória? | Para quê |
|---|---|---|
| `PORTAL_TRANSPARENCIA_API_KEY` | Só para o cruzamento com o Portal da Transparência (PEP, contratos, sanções, servidor público, Bolsa Família) | Cadastro gratuito — passo a passo em `docs/DATA_SOURCES.md` §4 |
| `VERCEL_API_TOKEN` | Só para a métrica de visitantes em `/sobre` | Ver `docs/DATA_SOURCES.md` §11 — **use um Personal Access Token de `vercel.com/account/tokens` com expiração longa/sem expiração**, não o token de 1h do fluxo OAuth "Sign in with Vercel" |

Os dados de candidatos em si (`data/2026/**/*.json`) já vêm commitados no repositório — não é
preciso rodar nenhuma ingestão para desenvolver localmente.

## Branch base do PR: `hmg`, não `main`

Este projeto tem dois ambientes — `hmg` (homologação) e `main` (produção, `fatoeleitoral.metadax.org`)
— e uma esteira de CI/CD com duas validações obrigatórias em cada um: um check automatizado (AI
Security Review) e a aprovação do mantenedor. Detalhes completos, incluindo o porquê dessa
arquitetura, em `docs/ARCHITECTURE.md` §15. Na prática, para quem contribui:

1. Abra sua branch a partir de `hmg`, não de `main`.
2. Abra o PR contra `hmg`. Depois de mesclado, a mudança fica disponível para teste no preview de
   `hmg` (URL automática da Vercel para essa branch).
3. A promoção de `hmg` para `main` (produção) é feita pelo mantenedor, num PR separado, depois de
   validar no ambiente de homologação — não é algo que quem contribui precisa fazer.

## Antes de abrir um Pull Request

```bash
npx tsc --noEmit   # typecheck
npm run lint       # eslint
npm run build      # build de produção — pega erros que o dev não pega
```

Os três rodam automaticamente no PR (`.github/workflows/ci.yml`) e precisam passar limpos, mas
rodar localmente primeiro poupa um ciclo de espera pelo CI. Para mudanças em página/UI, rode `npm
run build && npm run start` e confira visualmente (CSS carregou, componentes client hidrataram) —
já houve um incidente de build "quebrado silenciosamente" em produção, ver `docs/ARCHITECTURE.md`
§11.

Todo PR também passa por `.github/workflows/ai-security-review.yml` — uma revisão de segurança
automatizada via um modelo gratuito da NVIDIA (build.nvidia.com), com atenção especial a prompt
injection/prompt poisoning direcionado a um agente de IA que venha a processar este repositório,
não só vulnerabilidade de código no sentido clássico (ver `.github/ai-security-review-instructions.md`
e `docs/ARCHITECTURE.md` §15). Isso é além da revisão humana do mantenedor, não em vez dela — os
dois são obrigatórios.

Além dos dois checks de PR, o repositório também tem CodeQL (SAST) e Dependabot (dependências
vulneráveis/desatualizadas) rodando por conta própria — ver `docs/ARCHITECTURE.md` §15.

Para mudanças em rota que processa muito dado (`/buscar`, `/candidato/[id]`, agregados),
considere um teste de carga rápido antes do PR — `docs/ARCHITECTURE.md` §12 documenta a
metodologia usada (não teste concorrência alta contra produção; use `npm run build && npm run
start` local com `npx autocannon`) e o padrão de bug mais provável de reintroduzir: uma função
nova em `src/lib/data.ts` que lê `data/*.json` sem passar por `lerJsonCacheado`.

## Convenções deste projeto (leia antes de propor uma mudança)

Este projeto tem regras mais rígidas que a média — a maioria existe por causa de um bug real
encontrado em produção, não por preferência estética. As mais importantes:

1. **Nunca fabricar ou inferir dado.** Todo número exibido vem de uma fonte real, rastreável.
   Um dado ausente mostra o motivo real (fonte não consultada vs. consultada e vazia) — nunca um
   espaço em branco silencioso nem um `0`/`null` disfarçado de dado real. Ver
   `docs/DATA_SOURCES.md` §10.
2. **Linguagem neutra em categorias sensíveis.** Texto perto de bens, finanças de campanha,
   certidões criminais, remuneração de servidor ou benefícios sociais descreve o fato, nunca
   interpreta. Nenhuma frase pode sugerir que um dado é bom, ruim, suspeito ou meritório — nem
   por adjetivo, nem por tom, nem por omissão seletiva. Mesmo rigor para todos os partidos e
   candidatos. Ver `docs/DATA_SOURCES.md` §10 para exemplos concretos já aplicados no código.
3. **Zero cor de partido.** Tema estritamente preto e branco — sem azul/vermelho/verde/amarelo
   para diferenciar candidato, partido ou status. Diferenciação vem de tipografia, ícone e texto
   explícito. Ver `docs/DESIGN_SYSTEM.md`.
4. **CORS aberto em `/api/*` é proposital**, não um descuido — qualquer site pode consumir os
   dados agregados livremente. Não adicione autenticação numa rota existente sem discutir antes
   (issue), já que isso é uma mudança de comportamento público. Ver `docs/ARCHITECTURE.md` §10.
5. **Cache em memória do processo para leitura de `data/*.json`.** Qualquer loader novo em
   `src/lib/data.ts` que leia um arquivo estático deve passar por `lerJsonCacheado()` (ou seguir
   o mesmo padrão: cachear a Promise, não só o resultado resolvido). Sem isso, a rota trava sob
   concorrência real — já aconteceu, ver `docs/ARCHITECTURE.md` §12.
6. **Nomes de função/variável em português**, seguindo o resto do código (`buscarCandidatos`,
   `carregarMeta`, `formatarDataBR`) — nomes de tipo/interface do TypeScript e identificadores de
   biblioteca externa continuam em inglês, como é padrão.
7. **Todo horário exibido é `America/Sao_Paulo` (GMT-3)**, independente do fuso do servidor —
   sempre via `src/lib/format.ts`, nunca `Date` bruto formatado à mão.
8. **Documentação não é opcional para decisão de arquitetura ou fonte de dado.** Uma fonte nova,
   um endpoint novo, ou uma decisão de "não fazer X" (com o porquê) vai em `docs/DATA_SOURCES.md`
   ou `docs/ARCHITECTURE.md`, não só na mensagem do commit.

## Estrutura da documentação

- **`docs/DATA_SOURCES.md`** — toda fonte de dado usada (TSE, Portal da Transparência,
  BrasilAPI, Vercel, GitHub): endpoints, limites de uso, testes reais feitos contra cada uma.
  Leia antes de integrar uma fonte nova ou mudar como uma existente é consultada.
- **`docs/ARCHITECTURE.md`** — pipeline de ingestão, modelo de dados, camada de API, cache,
  incidentes registrados e por que foram resolvidos do jeito que foram.
- **`docs/DESIGN_SYSTEM.md`** — tokens de cor, tipografia, componentes.
- **`SECURITY.md`** — como reportar uma vulnerabilidade e riscos conhecidos já avaliados.

## Reportando problemas

Bug funcional ou sugestão: [abra uma issue](https://github.com/pedrorosemberg/eleicoes.metadax.org/issues/new).
Vulnerabilidade de segurança: **não** abra uma issue pública — veja `SECURITY.md`.
