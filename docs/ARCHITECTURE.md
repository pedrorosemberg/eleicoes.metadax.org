# Arquitetura — eleicoes.metadax.org

> Pré-requisito de leitura: `docs/DATA_SOURCES.md` (fontes, endpoints, limites e o bloqueio de rede do TSE já testados e documentados).

## 1. Visão geral

```
                         ┌─────────────────────────────┐
                         │   Ingestão (fora do runtime  │
                         │   do site, rede não bloqueada)│
                         │                               │
                         │  scripts/ingest-tse.ts         │
                         │  - baixa ZIP consulta_cand      │
                         │  - baixa ZIP bem_candidato       │
                         │  - normaliza CSV (Latin-1→UTF-8)  │
                         │  - grava JSON por UF em /data/2026 │
                         └───────────────┬───────────────────┘
                                         │ commit / push (ou upload p/ storage)
                                         ▼
                         ┌───────────────────────────────┐
                         │   Dados estáticos versionados   │
                         │   /data/2026/candidatos/{UF}.json│
                         │   /data/2026/bens/{UF}.json       │
                         │   /data/2026/meta.json (timestamp) │
                         └───────────────┬───────────────────┘
                                         │ servidos via CDN estático
                                         ▼
┌───────────────┐   fetch on-demand   ┌───────────────────────────┐
│  Frontend       │◄───────────────────►│  Camada de API (serverless) │
│  React + Vite    │                   │  /api/cnpj/:cnpj              │
│  mobile-first      │                 │  /api/divulgacand/:id           │
│  tema claro P&B      │               │  /api/transparencia/:tipo/:cpf   │
└───────────────┘                     └──────────────┬─────────────────┘
                                                        │
                          ┌─────────────────────────────┼─────────────────────────┐
                          ▼                              ▼                          ▼
                  BrasilAPI (CNPJ/IBGE)      DivulgaCandContas (TSE)      Portal da Transparência (CGU)
                  sem chave, cache longo     sem CORS, per-município,     chave própria do usuário,
                  (funcionou nesta sessão)   sujeito ao mesmo bloqueio    cache curto (dados mudam)
                                             de rede do TSE (§5 do doc
                                             de fontes) — testar em
                                             produção antes de confiar
```

**Princípio central:** a carga pesada e "todos os candidatos" vem de **dados estáticos pré-processados** (gerados por um script de ingestão que roda **fora** do runtime público do site), não de chamadas em tempo real à API do TSE. As APIs em tempo real (DivulgaCandContas, BrasilAPI, Portal da Transparência) são usadas apenas para **enriquecimento sob demanda**, quando um usuário abre o perfil de um candidato específico — e sempre atrás de um proxy serverless, nunca direto do browser.

Essa divisão existe por três motivos, todos documentados em `DATA_SOURCES.md`:
1. DivulgaCandContas não suporta CORS — chamada direta do browser é bloqueada pelo navegador.
2. DivulgaCandContas não tem endpoint de listagem em massa (é por município) — inviável para popular a busca principal.
3. O TSE está bloqueando, no edge Akamai, o IP de saída usado por este agente durante o desenvolvimento — a ingestão precisa rodar de uma rede validada como não-bloqueada (ver §5 do doc de fontes), e deve ser desacoplada do deploy do site para não travar o site inteiro se o bloqueio persistir.

## 2. Stack

**Decisão (usuário):** GitHub + Vercel + Next.js — App Router, com foco explícito em SEO/AEO/GEO (mecanismos de busca tradicionais **e** mecanismos de resposta de IA/crawlers de LLM devem conseguir ler e citar o conteúdo).

| Camada | Escolha | Motivo |
|---|---|---|
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript | Server Components renderizam o conteúdo no HTML do primeiro request — essencial para SEO/AEO/GEO (crawlers que não executam JS ainda leem o conteúdo principal); roteamento e API routes no mesmo framework, deploy nativo na Vercel |
| Estilo | Tailwind CSS v4 (`@tailwindcss/postcss`) + tokens CSS custom (`src/styles/tokens.css`) | Ver `docs/DESIGN_SYSTEM.md` — tokens derivados do Design System METADAX v2, restritos a tema claro P&B |
| Roteamento | App Router nativo (`app/`) | `/candidato/[id]`, `/partido/[sigla]`, `/buscar`, `/sobre` — cada um com `generateMetadata` próprio |
| Camada de API | Route Handlers (`app/api/**/route.ts`) | Mesmo motivo do proxy documentado abaixo (CORS, esconder chave da CGU); rodam como Vercel Functions sem configuração extra |
| Hospedagem | Vercel, repositório público no GitHub (`pedrorosemberg/eleicoes.metadax.org`) | Deploy contínuo a partir do `main`; domínio customizado (`eleicoes.metadax.org`) configurado na Vercel |
| Cache de enriquecimento | `fetch(..., { next: { revalidate } })` do Next.js (ISR/cache de dados) — 7 dias para CNPJ, 6h para DivulgaCandContas, 1h para Portal da Transparência | CNPJ muda raramente; dados da CGU mudam mais |
| Ingestão de dados TSE | Script Node standalone (`scripts/ingest-tse.ts`, rodado com `npm run ingest`), executado manualmente ou via cron **fora** do build da Vercel (ex.: GitHub Actions com runner cujo IP não esteja bloqueado, ou máquina do usuário) | Ver §5 do `DATA_SOURCES.md` — o resultado (`data/{ano}/**/*.json`) é lido por Server Components via `fs`, não via HTTP |
| SEO/AEO/GEO | `generateMetadata` por rota, JSON-LD (`WebSite`, `Person` por candidato), `app/sitemap.ts`, `app/robots.ts` (permissivo, libera crawlers de IA), `public/llms.txt` | Ver §9 abaixo |

## 3. Modelo de dados

Entidades centrais, já refletidas nos tipos TypeScript em `src/types/`:

```ts
interface Candidato {
  sqCandidato: string;        // chave primária, vem do TSE (SQ_CANDIDATO)
  nomeCompleto: string;
  nomeUrna: string;
  numero: string;
  cargo: string;
  uf: string;
  municipio: string;
  partido: { sigla: string; numero: string; nome: string };
  coligacao?: string;
  situacao: string;           // DS_SIT_TOT_TURNO
  genero?: string;
  grauInstrucao?: string;
  ocupacao?: string;
  cpf?: string;                // exibir mascarado na UI
  // Enriquecimento sob demanda (não vem do CSV — carregado ao abrir o perfil):
  enriquecimento?: {
    divulgaCand?: DivulgaCandDetalhe;   // sites, plano de governo, eleicoesAnteriores
    transparencia?: TransparenciaResumo; // peps, contratos, sanções
  };
}

interface Bem {
  sqCandidato: string;
  descricao: string;          // genérica desde 2022, ver LGPD em DATA_SOURCES.md
  valor: number;
}

interface Partido {
  sigla: string;
  nome: string;
  cnpj?: string;
  dadosCnpj?: BrasilApiCnpjResponse; // carregado sob demanda
}
```

## 4. Fluxo de ingestão (`scripts/ingest-tse.ts`)

1. Baixa `consulta_cand_2026.zip` e `bem_candidato_2026.zip` do CDN do TSE.
2. Descompacta, lê os CSVs consolidados (`_BRASIL.csv`) em Latin-1, converte para UTF-8.
3. Faz o parsing com um parser de CSV tolerante a `;` como separador (ex.: `csv-parse`).
4. Agrupa por UF e grava `data/{ano}/candidatos/{UF}.json` e `data/{ano}/bens/{UF}.json` — arquivos pequenos o bastante para serem buscados no client sem backend.
5. Grava `data/{ano}/meta.json` com timestamp da ingestão — **a UI deve sempre mostrar essa data**, pois os dados do TSE mudam a cada hora durante o julgamento de registros.
6. Idempotente: pode ser reexecutado a qualquer momento sem duplicar dados (sobrescreve os JSON).

**Cadência recomendada:** diária fora do período crítico; a cada poucas horas entre a data-limite de registro e o primeiro turno, já que impugnações/indeferimentos mudam a situação de candidatos nesse intervalo.

## 5. Camada de API (proxies serverless)

Todas em `/api/*`, todas com cache de borda e, quando aplicável, normalização de erro para o frontend nunca vazar detalhe de infraestrutura de terceiros.

| Rota | Proxied para | Cache | Observação |
|---|---|---|---|
| `GET /api/cnpj/:cnpj` | BrasilAPI | 7 dias | Sem chave. Testado funcionando nesta sessão. |
| `GET /api/divulgacand/candidato/:ano/:municipio/:eleicao/:id` | DivulgaCandContas | 6 horas | Necessário para contornar CORS. Pode falhar se o bloqueio de rede do TSE também atingir o runtime de produção — nesse caso, a UI deve degradar graciosamente (mostrar "dados adicionais indisponíveis no momento", nunca quebrar a página). |
| `GET /api/transparencia/:tipo/:documento` | Portal da Transparência | 1 hora | Requer `PORTAL_TRANSPARENCIA_API_KEY` em variável de ambiente server-side — nunca no client. `:tipo` restrito a um allowlist (`peps`, `contratos`, `ceis`, `cnep`, `emendas`) para não expor a API da CGU como proxy genérico. |
| `GET /api/health` | TSE ×3, BrasilAPI, Portal da Transparência | Sem cache (`no-store`) | Checagem ao vivo para a página `/status` — classifica cada fonte como operacional, bloqueada (edge do TSE), indisponível, ou "requer autenticação" |

**Nota operacional confirmada nesta sessão:** a BrasilAPI retorna `403` para o `User-Agent` padrão que o `fetch` do Node/undici envia (`node`) — por isso toda chamada de saída deste projeto usa um `User-Agent` explícito (`src/lib/http.ts`), não apenas por boa prática, mas porque sem isso o endpoint pareceria fora do ar. Ver `docs/DATA_SOURCES.md` (seção BrasilAPI).

## 6. Contingência: bloqueio do TSE também em produção

Se, ao testar a partir do ambiente de produção real (Vercel ou onde for hospedado), `cdn.tse.jus.br` e `divulgacandcontas.tse.jus.br` também retornarem 403 do Akamai:

1. **Ingestão:** rodar `scripts/ingest-tse.ts` de uma máquina/CI com saída de rede brasileira residencial/institucional (não datacenter de nuvem genérico) e fazer commit dos JSON gerados no repositório — a ingestão não precisa, estritamente, rodar na mesma infraestrutura do site.
2. **Proxy do DivulgaCandContas:** se o runtime de produção também for bloqueado, avaliar um serviço de proxy dedicado com IP brasileiro (ex.: uma função em uma VPS nacional) apenas para essa rota — não vale a pena redesenhar a arquitetura toda por causa de um único endpoint de enriquecimento opcional.

## 7. Estrutura de páginas (mobile-first, ver `docs/DESIGN_SYSTEM.md` para os componentes)

| Rota | Status | Conteúdo |
|---|---|---|
| `/` | **Implementado** | Landing/apresentação do projeto — hero, lista de funcionalidades (disponível vs. em desenvolvimento), princípios, link para o repositório público e para `/buscar` |
| `/buscar` | **Implementado** (com dado de exemplo até a ingestão real rodar) | Busca — filtro por UF; lista de resultados em cards |
| `/candidato/[id]` | **Implementado** (enriquecimento parcial) | Perfil: dados básicos, dados do partido via CNPJ; plano de governo/site oficial/histórico de candidaturas pendentes de ligar ao proxy DivulgaCandContas na UI |
| `/partido/[sigla]` | **Pendente** | Dados cadastrais via CNPJ (BrasilAPI), lista de candidatos do partido na UF selecionada |
| `/sobre` | **Implementado** | Transparência do próprio produto: metodologia, fontes, licença |
| `/status` | **Implementado** | Saúde em tempo real de cada fonte externa (TSE ×3, BrasilAPI, Portal da Transparência) — checagem ao vivo no servidor a cada carregamento + polling client-side a cada 30s via `/api/health` |

## 8. O que este projeto explicitamente não faz (fora de escopo do MVP)

- Não replica autenticação/login — é 100% leitura pública.
- Não faz scraping de páginas HTML de campanha (apenas os links oficiais informados ao TSE) — evita fragilidade e problemas de direitos autorais sobre conteúdo de terceiros.
- Não calcula "score" ou ranking de candidatos — o produto expõe dado cruzado, não emite juízo de valor, alinhado ao requisito de neutralidade político-partidária do design.

## 9. SEO / AEO / GEO — otimizado para ser lido por qualquer agente, humano ou de IA

Requisito explícito do projeto: o site deve poder ser encontrado, lido e citado tanto por buscadores tradicionais (SEO) quanto por mecanismos de resposta de IA — ChatGPT, Claude, Perplexity, Gemini, etc. (AEO — *Answer Engine Optimization* — e GEO — *Generative Engine Optimization*) — e por crawlers/raspadores em geral. Isso é o oposto do endurecimento anti-bot que a maioria dos sites aplica hoje; aqui o objetivo é máxima legibilidade automatizada, porque o produto é, por natureza, uma ferramenta de transparência pública.

O que está implementado:

1. **Conteúdo renderizado no servidor.** Todo dado central (lista de candidatos, perfil, texto institucional) é produzido por React Server Components — chega pronto no HTML do primeiro request, sem depender de execução de JavaScript no cliente. Isso beneficia igualmente um crawler de busca clássico e um crawler que só lê HTML estático.
2. **Metadados por rota** (`generateMetadata` em cada `page.tsx`): título, descrição e Open Graph específicos por candidato/UF, não um título genérico repetido em todo o site.
3. **Dados estruturados (JSON-LD)** — `schema.org/WebSite` no layout raiz (com `SearchAction` apontando para `/buscar`) e `schema.org/Person` em cada página de candidato (nome, cargo, partido via `memberOf`, localização via `address`). Isso é o mecanismo que motores de busca e de resposta usam para entender "quem é esta entidade" além do texto solto.
4. **`app/sitemap.ts`** — gerado dinamicamente, incluindo uma entrada por UF na busca (não depende só do formulário client-side para ser descoberto).
5. **`app/robots.ts`** — política deliberadamente permissiva, com regras explícitas liberando os principais crawlers de IA conhecidos (GPTBot, ClaudeBot, Google-Extended, PerplexityBot, CCBot, entre outros), além do `*` genérico. **Atenção operacional:** a lista de user-agents de IA muda com frequência — revisar contra a documentação de cada provedor antes de assumir que está completa, especialmente ao longo do tempo.
6. **`public/llms.txt`** — convenção emergente ([llmstxt.org](https://llmstxt.org)) para dar a um LLM um resumo direto do site e de como citá-lo corretamente (incluindo a instrução de atribuir à fonte original — TSE/CGU — não apenas a este site).
7. **JSON puro como fonte de dado** (`data/{ano}/**/*.json`, servido/lido diretamente) — mais fácil de raspar corretamente do que fazer parsing de HTML, e evita que um scraper precise reconstruir dado que já está estruturado.

O que fica como trabalho futuro, não implementado nesta sessão: ISR/revalidação agressiva ligada à cadência real da ingestão (hoje o cache é por tempo fixo, não por evento), sitemap de candidatos individuais (hoje só há sitemap por UF — o volume de milhares de páginas de candidato precisa de sitemap paginado antes de ativar), e Open Graph image dinâmica por candidato.
