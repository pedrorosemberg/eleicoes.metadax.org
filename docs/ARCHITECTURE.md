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
| Estilo | Tailwind CSS v4 (`@tailwindcss/postcss`) + tokens CSS custom (`src/styles/tokens.css`) | Ver `docs/DESIGN_SYSTEM.md` — identidade visual própria do projeto, restrita a tema claro P&B |
| Roteamento | App Router nativo (`app/`) | `/candidato/[id]`, `/partido/[sigla]`, `/buscar`, `/sobre` — cada um com `generateMetadata` próprio |
| Camada de API | Route Handlers (`app/api/**/route.ts`) | Mesmo motivo do proxy documentado abaixo (CORS, esconder chave da CGU); rodam como Vercel Functions sem configuração extra |
| Hospedagem | Vercel, repositório público no GitHub (`pedrorosemberg/eleicoes.metadax.org`) | Deploy contínuo a partir do `main`; domínio customizado (`eleicoes.metadax.org`) configurado na Vercel |
| Cache de enriquecimento | `fetch(..., { next: { revalidate } })` do Next.js (ISR/cache de dados) — 7 dias para CNPJ, 6h para DivulgaCandContas, 1h para Portal da Transparência | CNPJ muda raramente; dados da CGU mudam mais |
| Ingestão de dados TSE | Script Node standalone (`scripts/ingest-tse.ts`, rodado com `npm run ingest`), executado manualmente ou via cron **fora** do build da Vercel (ex.: GitHub Actions com runner cujo IP não esteja bloqueado, ou máquina do usuário) | Ver §5 do `DATA_SOURCES.md` — o resultado (`data/{ano}/**/*.json`) é lido por Server Components via `fs`, não via HTTP |
| SEO/AEO/GEO | `generateMetadata` por rota, JSON-LD (`WebSite`, `Person` por candidato), `app/sitemap.ts`, `app/robots.ts` (permissivo, libera crawlers de IA), `public/llms.txt` | Ver §9 abaixo |
| Mapa (`/mapa`) | Leaflet + `react-leaflet`, GeoJSON oficial do IBGE (`public/geo/brasil-uf.json`, ver `docs/DATA_SOURCES.md` §4c) | Coroplético real das fronteiras estaduais, cor em escala de cinza (intensidade = nº de candidatos) — sem camada de mapa-base (tiles), que introduziria cor fora da regra de neutralidade do projeto |

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

Desde 24/08/2026 o mesmo script também ingere `consulta_cand_complementar` (merge nos
candidatos), `prestacao_de_contas_eleitorais_candidatos` (receitas/despesas em
`data/{ano}/financas/{UF}.json`) e `CNPJ_campanha` (arquivo posicional de largura fixa, não CSV
— ver `docs/DATA_SOURCES.md` §1). Fotos e PDFs de plano de governo passam por um segundo script,
`scripts/build-asset-index.ts`, que não baixa nada — só cruza arquivos já extraídos localmente
com os candidatos e grava as URLs (hospedadas na branch `assets-tse-2026`, não em `data/`). Ver
`docs/DATA_SOURCES.md` §1 para a origem e o formato de cada um.

**Cadência recomendada:** diária fora do período crítico; a cada poucas horas entre a data-limite de registro e o primeiro turno, já que impugnações/indeferimentos mudam a situação de candidatos nesse intervalo.

**Tratamento de erro:** `baixarZip()` tenta 3x com backoff exponencial antes de desistir — exceto num `403`, que é tratado como bloqueio de rede (não transitório) e falha imediatamente com uma mensagem apontando para `docs/DATA_SOURCES.md` §5, em vez de gastar tentativas inúteis. Depois do parsing, `validarColunaCritica()` confere se colunas-chave (`SQ_CANDIDATO`, `SG_UF`) vieram preenchidas na maioria das linhas — se não, é sinal de que o nome da coluna mudou nesta eleição (o mapeamento é hardcoded e não confirmado contra o leiame.pdf real, ver cabeçalho do script) e o script falha alto e claro em vez de gravar um dataset silenciosamente errado.

**Por que não existe "busca em tempo real via API" para a listagem (e por que isso não é uma lacuna):** confirmado em `docs/DATA_SOURCES.md` §2 — o DivulgaCandContas não tem endpoint de listagem em massa por UF/Brasil, só por município + cargo + eleição, um de cada vez. Listar todos os candidatos de uma UF ao vivo exigiria descobrir o município, depois o cargo, depois os candidatos — centenas a milhares de chamadas por UF, inviável por requisição numa função serverless e ainda mais bloqueado pelo TSE (ver §6). Por isso a busca (`/buscar`) **sempre** usa o snapshot gerado por este script (ou o fixture de exemplo, nunca escondido — ver `SnapshotNotice`), e não uma chamada ao vivo. Onde a API ao vivo *é* usada de verdade é no **detalhe do candidato** (§5) — site oficial, plano de governo, histórico de candidaturas, e o cruzamento com o Portal da Transparência — que são, de fato, consultas pontuais por candidato, o caso de uso para o qual essas APIs foram desenhadas.

## 5. Camada de API (proxies serverless)

Todas em `/api/*`, todas com cache de borda e, quando aplicável, normalização de erro para o frontend nunca vazar detalhe de infraestrutura de terceiros.

| Rota | Proxied para | Cache | Observação |
|---|---|---|---|
| `GET /api/cnpj/:cnpj` | BrasilAPI | 7 dias | Sem chave. Testado funcionando nesta sessão. |
| `GET /api/certidao/:uf/:candidato/:arquivo` | Release do GitHub (`arquivos_de_certidoes_criminais`) | 1 dia (`immutable`) | Serve um PDF de certidão criminal individual via um único HTTP Range GET direto no ZIP oficial da UF — sem baixar nem duplicar o ZIP (~9,5 GB no total). Offset e tamanho do documento vêm do índice pré-calculado em `data/{ano}/certidoes/{UF}.json` (`scripts/ingest-certidoes.ts`); ver `src/lib/zip-range.ts` e `DATA_SOURCES.md` §1 para o mecanismo completo, testado de ponta a ponta (download de um byte-range específico produzindo um PDF válido). |
| `GET /api/divulgacand/candidato/:ano/:municipio/:eleicao/:id` | DivulgaCandContas | 6 horas | Necessário para contornar CORS. Consumido ao vivo pela página de candidato (`app/candidato/[id]/page.tsx`, via `buscarDetalheDivulgaCand`) para site oficial, plano de governo e histórico de candidaturas — requer `codMunicipio`/`codEleicao` do candidato (colunas do CSV, ver §4); ausentes, essas seções somem em vez de quebrar. Pode falhar se o bloqueio de rede do TSE também atingir o runtime de produção — confirmado que atinge, ver §6 — nesse caso a UI degrada graciosamente ("ainda não disponível", nunca quebra a página). |
| `GET /api/transparencia/:tipo/:documento` | Portal da Transparência | 1 hora | Requer `PORTAL_TRANSPARENCIA_API_KEY` em variável de ambiente server-side — nunca no client. **Chave configurada e confirmada operacional em produção em 24/08/2026** (`GET /api/health` retorna `"status":"operacional"` para `portal-transparencia`, e o cruzamento real aparece em perfis de candidato). `:tipo` restrito a um allowlist (`peps`, `contratos/cpf-cnpj`, `ceis`, `cnep`, `cepim`, `emendas`) para não expor a API da CGU como proxy genérico. `bolsa-familia-disponivel-por-cpf-ou-nis` e `servidores`/`servidores/remuneracao` (benefícios sociais e servidor público federal) são consultados só server-side, **fora** deste proxy público — dado de CPF de pessoa comum, diferente de PEP/contratos/sanções (que dizem respeito a quem já tem dever de prestar contas públicas), ver `DATA_SOURCES.md` §4. A página de candidato não usa esta rota diretamente — chama `buscarResumoTransparencia()`, `buscarBeneficiosSociais()` e `buscarServidorPublico()` (`src/lib/enrichment.ts`). |
| `GET /api/health` | TSE ×3, BrasilAPI, Portal da Transparência | Sem cache (`no-store`) | Checagem ao vivo para a página `/status` — classifica cada fonte como operacional, bloqueada (edge do TSE), indisponível, ou "requer autenticação" |
| `GET /api/estatisticas` | Dados internos (agregados) | 5 min | Contagem de candidatos por UF/cargo/partido — nunca dado individual. Ver §10. |
| `GET /api/estatisticas-projeto` | GitHub (API pública) + Vercel Web Analytics | 5 min | Estrelas/forks/issues do repositório e visitantes únicos/páginas vistas do site (30 dias) — números reais consumidos por `/sobre`. Ver `DATA_SOURCES.md` §11. |
| `GET /api/badge/:metrica` | GitHub (API pública) | 5 min (`stale-while-revalidate=600`) | SVG de badge estilo shields.io, gerado por este projeto (`src/lib/badge-svg.ts`) — `estrelas`, `forks`, `issues`, `ultimo-commit` dinâmicos; `licenca` fixo (`max-age=86400`). Substitui badges do shields.io no README, cujo cache era opaco e ficou visivelmente desatualizado. Ver `DATA_SOURCES.md` §11. |

**Nota operacional confirmada nesta sessão:** a BrasilAPI retorna `403` para o `User-Agent` padrão que o `fetch` do Node/undici envia (`node`) — por isso toda chamada de saída deste projeto usa um `User-Agent` explícito (`src/lib/http.ts`), não apenas por boa prática, mas porque sem isso o endpoint pareceria fora do ar. Ver `docs/DATA_SOURCES.md` (seção BrasilAPI).

**CORS:** todas as rotas `/api/*` respondem com `Access-Control-Allow-Origin: *` (aplicado globalmente em `proxy.ts`, ver `src/lib/cors.ts`) — deliberadamente aberto, para que qualquer site (incluindo qualquer subdomínio de `metadax.org` e `metadax.com.br`, que ficam automaticamente cobertos por não haver nenhuma restrição de origem) possa consumir os dados sem bloqueio de navegador. Ver §10 sobre até onde isso torna o projeto utilizável como fonte de dados por terceiros.

## 6. Contingência: bloqueio do TSE também em produção

Se, ao testar a partir do ambiente de produção real (Vercel ou onde for hospedado), `cdn.tse.jus.br` e `divulgacandcontas.tse.jus.br` também retornarem 403 do Akamai:

1. **Ingestão:** rodar `scripts/ingest-tse.ts` de uma máquina/CI com saída de rede brasileira residencial/institucional (não datacenter de nuvem genérico) e fazer commit dos JSON gerados no repositório — a ingestão não precisa, estritamente, rodar na mesma infraestrutura do site.
2. **Proxy do DivulgaCandContas:** se o runtime de produção também for bloqueado, avaliar um serviço de proxy dedicado com IP brasileiro (ex.: uma função em uma VPS nacional) apenas para essa rota — não vale a pena redesenhar a arquitetura toda por causa de um único endpoint de enriquecimento opcional.

## 7. Estrutura de páginas (mobile-first, ver `docs/DESIGN_SYSTEM.md` para os componentes)

| Rota | Status | Conteúdo |
|---|---|---|
| `/` | **Implementado** | Landing/apresentação do projeto — hero, lista de funcionalidades com status real (disponível/em progresso/indisponível), princípios, link para o repositório público e para `/buscar` |
| `/buscar` | **Implementado**, snapshot real commitado (20/08/2026) | Busca direta (nome/número/ID) e indireta (UF/cidade/cargo/partido), combináveis |
| `/candidato/[id]` | **Implementado** | Perfil: foto, dados básicos (com teto de gastos e situação de julgamento), bens declarados, finanças de campanha (receitas/despesas), redes sociais, plano de governo (PDF), certidões criminais (28 das 28 UFs — 6 recuperadas de upload truncado via varredura de headers locais, ver `DATA_SOURCES.md` §1), coligação (composição/situação), dados do partido via CNPJ, cruzamento com o Portal da Transparência (PEP/contratos/sanções, servidor público federal e remuneração, benefícios sociais). Cada seção mostra a fonte e a data/hora da última atualização; quando uma categoria está vazia, o texto sempre diz o motivo real (nada consta na fonte vs. fonte indisponível) — nunca um espaço em branco (ver `DATA_SOURCES.md` §10, neutralidade). Site oficial/histórico via DivulgaCandContas fica desativado neste snapshot — falta um `codMunicipio` confiável para candidaturas estaduais/federais, só `codEleicao` foi confirmado (ver §4/§5 do `DATA_SOURCES.md`) |
| `/mapa` | **Implementado** | Coroplético real dos estados (Leaflet + GeoJSON do IBGE) e estatísticas por UF/cargo, também via `/api/estatisticas` |
| `/status` | **Implementado** | Saúde em tempo real de cada fonte externa (TSE ×3, BrasilAPI, Portal da Transparência) — checagem ao vivo no servidor a cada carregamento + polling client-side a cada 30s via `/api/health` |
| `/sobre` | **Implementado** | Transparência do próprio produto: metodologia, fontes, licença, responsável pelo projeto |
| `/participe` | **Implementado** | Dicas de voto consciente + guia de contribuição ao projeto (issues, PRs, ajudar com a ingestão) |
| `/roteiro` | **Implementado** | Features planejadas/bloqueadas/sugeridas, cada uma com a fonte de dado citada, e CTA para propor novas via issue do GitHub |
| `/atualizacoes` | **Implementado** | Issues, PRs e releases espelhados ao vivo da API pública do GitHub (`src/lib/github.ts`), revalidado a cada 10 min — ver `docs/DATA_SOURCES.md` §9.3 para a análise dos Termos de Serviço do GitHub |
| `/privacidade`, `/termos` | **Implementado** | O que é coletado (Vercel Analytics/eventos de busca), usos autorizados do site/dados, infraestrutura/ferramentas usadas (Vercel, GitHub, uso de IA no desenvolvimento) — ver `docs/DATA_SOURCES.md` §9 |
| `/partido/[sigla]` | **Pendente** | Dados cadastrais via CNPJ (BrasilAPI), lista de candidatos do partido na UF selecionada |

## 8. O que este projeto explicitamente não faz (fora de escopo)

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

## 10. O projeto como proxy público de dados — viabilidade

Pergunta levantada pelo usuário: dá para outras pessoas/empresas se conectarem neste projeto para consumir os dados que ele já consome, usando-o como intermediário?

**Sim, e já está funcionando hoje**, dentro de limites claros — não foi construída nenhuma camada nova de "API pública para terceiros" com autenticação/chaves/planos (isso seria um projeto à parte); o que existe é a reutilização honesta da própria camada de proxy que o produto já precisa para si:

- Todas as rotas em `/api/*` (§5) respondem com CORS aberto (`Access-Control-Allow-Origin: *`) — qualquer site pode fazer `fetch()` para elas do navegador, sem bloqueio.
- `GET /api/estatisticas` é o caso mais direto de "dado pronto para consumo externo": contagens agregadas de candidatos por UF/cargo/partido, sem nenhum dado individual.
- `GET /api/cnpj/:cnpj` funciona como um proxy de fato para a BrasilAPI, já com o `User-Agent` correto (§5) e cache de borda — um terceiro que bater nessa rota está, na prática, usando este projeto como intermediário para a BrasilAPI.

**Limites que isso não resolve, e por que não foram construídos nesta sessão:**
1. **Sem autenticação/chave própria.** Não há como emitir uma "chave de API do projeto" para terceiros, medir uso por consumidor ou aplicar limites por cliente — implicaria criar uma camada de gestão de chaves e um banco de dados, que é infraestrutura nova, não uma extensão do proxy existente.
2. **Capacidade compartilhada com o próprio site.** Os limites de taxa de cada fonte upstream (documentados em `docs/DATA_SOURCES.md`) são por IP/aplicação, não por consumidor final — uso pesado por terceiros consome a mesma cota que os usuários do site. Em caso de abuso, a mitigação disponível hoje é bloquear por origem/IP na Vercel, não um sistema de quotas dedicado.
3. **`/api/transparencia/:tipo` continua restrito por allowlist** (§5) — não vira uma porta aberta para toda a API da CGU, mesmo com CORS liberado.

**Conclusão:** o projeto já serve como proxy público de fato para os dados agregados e para a consulta de CNPJ, sem trabalho adicional. Uma oferta formal de "API para desenvolvedores" (com chave, documentação própria tipo Swagger, e limites por cliente) é viável tecnicamente, mas é um escopo novo — não foi implementada aqui, e não deve ser assumida como existente até que seja.

## 11. Incidente registrado: build de produção sem CSS/hidratação

Em 20/08/2026, uma deployment em produção (commit `55480ef`) ficou no ar sem nenhum estilo (HTML puro, sem CSS) e sem hidratação de JavaScript (componentes client, como os contadores animados da home, travavam no estado inicial). Investigação:

- O domínio custom também esteve fora do ar por ~40 minutos com `404 NOT_FOUND` no edge da Vercel, **sem nenhuma linha de log de runtime e sem erro registrado** — evidência de que a requisição nunca chegava a invocar nenhuma função (problema de roteamento de domínio na borda da Vercel, não da aplicação). O painel mostrava "Valid Configuration" mesmo assim. **Resolvido removendo e re-adicionando o domínio** em Settings → Domains, forçando a Vercel a reprovisionar certificado e alias do zero.
- Separadamente, o **mesmo commit exato**, reconstruído localmente de forma isolada (`rm -rf .next && npm run build && npm run start`) mais de uma vez, produziu resultados diferentes entre tentativas: numa saiu sem CSS/hidratação (idêntico ao sintoma em produção), na seguinte saiu perfeito — com `next.config.ts` e as dependências de build idênticos entre as tentativas. Isso aponta para uma **instabilidade do build de produção em Turbopack** (`▲ Next.js 16.3.1 (Turbopack)`, bundler de build ainda recente), não uma causa determinística no código.

**Mitigação prática adotada:** antes de qualquer deploy, rodar `rm -rf .next && npm run build && npm run start` localmente e conferir visualmente (não só o código de status HTTP) que o CSS carregou e que componentes client hidrataram — um `curl` retornando `200` não é suficiente para confirmar que o build está íntegro. Se o problema se repetir, o próximo passo é testar sem Turbopack para isolar se é uma regressão específica dele.

## 12. Teste de carga e cache em memória de processo (26/08/2026)

Feito antes da divulgação pública do repositório, a pedido do mantenedor. Resultado: um bug crítico real encontrado e corrigido, mais uma auditoria de segurança sem achados críticos — ver `docs/SECURITY.md` para essa parte.

### Metodologia — por que não contra produção diretamente

A primeira tentativa foi rodar [`autocannon`](https://github.com/mcollina/autocannon) direto contra `https://eleicoes.metadax.org`. Resultado: **100% das requisições retornaram `403`**, mesmo em concorrência baixa (10 conexões) — confirmado não ser falha da aplicação (uma única requisição comum, ou 3 requisições `curl` genuinamente paralelas, sempre respondiam `200` normalmente). A proteção contra tráfego automatizado/rajada de uma única origem da própria Vercel (bot/attack protection) estava bloqueando o padrão de tráfego do autocannon — **comportamento correto de infraestrutura, não um defeito**. Tentar contornar essa proteção só para conseguir números de teste seria a escolha errada (o objetivo é testar a aplicação, não validar se dá pra evadir uma defesa real).

**Metodologia adotada:** build de produção rodado localmente (`npm run build && npm run start`), testado com autocannon nesse processo local. Isso exercita exatamente o mesmo código de aplicação (carregamento de dados, renderização, busca) sem passar pela proteção de borda da Vercel — e sem consumir cota real de APIs externas de terceiros, já que este ambiente de teste não tinha `PORTAL_TRANSPARENCIA_API_KEY`/`VERCEL_API_TOKEN` configuradas (as chamadas que dependem delas retornam `null` de forma gradual, sem tentar rede).

**Deliberadamente não testado sob carga alta:**
- `/api/transparencia/:tipo` — proxy público (CORS aberto) para o Portal da Transparência, sem chave por consumidor. Testar em volume gastaria cota real e compartilhada (algumas faixas de endpoint são de 180 requisições/minuto — ver `docs/DATA_SOURCES.md` §4) que usuários reais do site dependem. A ausência de rate limiting nessa rota está documentada como risco conhecido em `docs/SECURITY.md`.
- `/candidato/[id]` em produção com chaves reais — uma única visualização já dispara ~12 chamadas paralelas ao endpoint restrito de Bolsa Família (180/min). Testado localmente (sem chave configurada, chamadas retornam `null` sem rede) e com poucas requisições reais em produção, nunca em rajada.

### Achado crítico: `/buscar` travava o processo inteiro sob concorrência

Sem nenhum cache, `buscarCandidatos()` relia (via `fs.readFile`) os 28 arquivos de UF do zero **a cada requisição**, e `normalizar()` (NFD + regex + `toLowerCase`) rodava sobre os nomes de ~20 mil candidatos, também a cada requisição — sem nenhuma memoização. Confirmado com 80 conexões simultâneas: **0 das ~2.000 requisições completou** (`80 timeouts`), e o processo Node ficou preso a >90% de CPU, **sem responder a nenhuma requisição, incluindo `GET /` completamente não relacionada**, por mais de 2 minutos até ser encerrado manualmente. Confirmado via `ps aux` que o processo estava vivo (não travou nem foi morto pelo SO), só saturado.

Segundo achado, agravando o primeiro: **sem paginação**, um termo comum como "silva" bate em **3.284 candidatos** (confirmado contra os dados reais), todos renderizados de uma vez, em toda requisição — multiplicando o custo de I/O e CPU do primeiro problema.

**Correção** (`src/lib/data.ts`, `src/lib/stats.ts`, `app/buscar/page.tsx`):
- Cache em memória do processo para os arquivos de `data/` (a Promise em si, não só o resultado — para que requisições concorrentes durante um cold start aguardem a mesma leitura em vez de cada uma abrir o arquivo de novo). Dado é estático por deploy (só muda numa nova ingestão + novo deploy), então não há problema de invalidação.
- Nomes normalizados calculados uma vez por array de candidatos (`WeakMap`), não a cada busca.
- `calcularEstatisticas()` (agregados de `/api/estatisticas` e `/mapa`) também cacheado, mesmo racional.
- Paginação real em `/buscar` (24 por página, com "Mostrando X–Y de Z" e navegação Anterior/Próxima preservando os filtros).

**Antes/depois, mesmo teste (autocannon local, servidor de produção `next start`):**

| Rota | Antes | Depois |
|---|---|---|
| `/buscar?q=silva` (80 conexões, 15s) | Travamento total — 0/~2.000 completadas, 80 timeouts, processo preso >2 min | 1.000 requisições completadas, 0 erros, p50 ≈1,2s |
| `/candidato/[id]` (40 conexões, 12s) | 197 requisições, p50 ≈2,5s | 560 requisições, p50 ≈0,77s (≈3x throughput) |
| `/api/estatisticas` (60 conexões, 10s) | 908 requisições, p50 ≈0,7s | ~5.000 requisições, p50 ≈0,12s (≈5x throughput) |

Rotas confirmadas saudáveis sem mudança necessária: `/` (≈730 req/s, estático/pré-renderizado), `/mapa` (≈560 req/s), `/api/certidao/:uf/:candidato/:arquivo` (limitado por banda de rede real ao GitHub, não por CPU — comportamento esperado). `/status` é deliberadamente não cacheado — checagem ao vivo é o próprio propósito da página (ver §7).

## 13. Correções pós-divulgação (26/08/2026)

Dois achados adicionais, depois que o mantenedor testou a feature de visitantes ao vivo e revisou o custo de `normalizar()` na busca sob o §12 acima.

### Contagem de visitantes zerada — bug real de truncamento na API da Vercel

Mesmo depois da correção de janela/cache do §11 de `docs/DATA_SOURCES.md`, o site voltou a mostrar "0 visitantes" com tráfego real do dia registrado. Isolado consultando `GET /v1/query/web-analytics/visits/count` (modo `count`) diretamente, fora do cache da aplicação:

- `since=2026-07-26T00:00:00Z&until=2026-08-25T23:59:59Z` → API respondeu com `query.until` **truncado para `2026-08-25T00:00:00.000Z`** (início do dia, não o instante exato pedido) e devolveu `{"visitors":0,"pageviews":0}`.
- A mesma consulta com `until=2026-08-26T00:00:00Z` (o dia seguinte) devolveu `{"visitors":2,"pageviews":40}` — o tráfego real do dia 25.
- Confirmado que o dado existia: uma consulta em modo `aggregate` por dia (`by=["day"]`) mostrava `2026-08-25` com `visitors:2, pageviews:40` mesmo enquanto o modo `count` retornava zero para o mesmo intervalo.

Ou seja: o endpoint de contagem trunca `until` para baixo, para o início do dia — passar "agora" como `until` exclui **todo o tráfego do dia corrente** da contagem, sempre, independente da hora. Não é um problema de cache nem de janela de dias (§11 de `DATA_SOURCES.md`); é um comportamento do próprio endpoint que não estava documentado e só apareceu comparando a resposta bruta da API com o que a aplicação calculava.

**Correção** (`src/lib/site-analytics.ts`): `until` agora é sempre "agora + 1 dia" antes de truncar, garantindo que o dia corrente completo sempre entre na janela, não importa a hora em que a consulta rodar.

### Índice de busca movido de runtime para tempo de ingestão

O cache do §12 acima já tinha reduzido `normalizar()` (NFD + regex + `toLowerCase` sobre ~20 mil candidatos) de "toda requisição" para "uma vez por cold start de processo" — mas cada nova instância de função serverless que a Vercel cria sob um pico de tráfego ainda paga esse custo de CPU do zero. Correção: mover o cálculo para tempo de ingestão, uma única vez por dataset, em vez de uma vez por processo.

- Novo `scripts/build-search-index.ts` — lê `data/{ano}/candidatos/{UF}.json` já gravado e escreve `data/{ano}/indice-busca/{UF}.json` com os mesmos campos já normalizados, alinhados por posição com o array de candidatos. Não depende dos ZIPs do TSE nem de rede — só do snapshot de candidatos já ingerido, então roda tanto automaticamente no fim de `npm run ingest` (chamado de dentro de `ingestCandidatos`, em `scripts/ingest-tse.ts`) quanto isolado (`npm run build-search-index -- --ano=2026`) sempre que `candidatos/` mudar por outro caminho.
- `src/lib/data.ts` (`obterIndiceBusca`) agora tenta carregar o índice pré-computado primeiro (mesmo padrão `lerJsonCacheado` do resto do arquivo — sem custo de CPU, só leitura de arquivo cacheada); só recorre ao cálculo em memória (`calcularIndiceNormalizadoEmMemoria`, o `WeakMap` que já existia) como fallback, quando o índice não existe para aquele array — hoje isso só acontece com o fixture de amostra (poucas dezenas de linhas, custo desprezível).
- Rodado uma vez contra o snapshot `data/2026/` já commitado (28 arquivos, 3,2 MB) sem precisar dos ZIPs do TSE — o script só depende de `candidatos/` já existir em disco.
- Reteste local (autocannon, 80 conexões, 15s, `/buscar?q=silva`): 681 requisições completadas, **zero erros/timeouts**, mesma contagem de resultados de antes (3.284, página 1 de 137) — confirma que o índice pré-computado produz exatamente o mesmo resultado que o cálculo em runtime substituído.

## 14. Playbook para uma nova eleição (ex.: 2028)

Este produto assume, por design, **uma eleição corrente** por deploy — não é um arquivo histórico multi-ano navegável (isso seria um escopo bem maior: seletor de ano na UI, rotas versionadas, etc., não implementado). Trocar para os dados de uma eleição nova é hoje:

1. **Rodar a ingestão para o ano novo**, de uma rede que o TSE não bloqueie (§5 de `docs/DATA_SOURCES.md`):
   ```bash
   npm run ingest -- --ano=2028
   npm run build-asset-index -- --ano=2028 --fotos-dir=... --planos-dir=...
   npm run ingest-certidoes -- --ano=2028   # se o release de certidões existir para o ano
   ```
   `build-search-index` roda sozinho dentro de `npm run ingest` (§13 acima) — não é um passo manual à parte.
2. **Conferir `data/2028/meta.json`** — `ufs` deve listar as 27 UFs + `BR`, do mesmo jeito que hoje. Se faltar UF, algo na ingestão falhou silenciosamente para aquele estado — não assumir que "menos UFs" é normal.
3. **Apontar a aplicação para o ano novo**: variável de ambiente `ANO_ELEICAO=2028` no projeto na Vercel (Settings → Environment Variables) + redeploy. Não precisa editar `src/lib/data.ts` — ver o comentário ali e `.env.example`. `data/2026/**` continua no repositório (histórico), só não é mais o que a aplicação lê.
4. **Se o TSE mudar o layout do CSV** (nome de coluna, arquivo novo/removido) — já aconteceu de uma eleição para outra em outros datasets públicos brasileiros, não é hipotético. `scripts/ingest-tse.ts` já tem uma rede de segurança para isso: `validarColunaCritica()` derruba a ingestão com erro explícito se uma coluna crítica (`SQ_CANDIDATO`, `SG_UF` etc.) não existir no CSV, em vez de gerar um snapshot silenciosamente vazio ou errado. Se isso disparar: reabrir o `leiame.pdf` do dataset em questão (mesmo processo documentado em `docs/DATA_SOURCES.md` §1) e atualizar as constantes `*_COLUNAS` no topo do script — a lista de campos em si (`CAND_COLUNAS`, `BEM_COLUNAS` etc.) é o único lugar que precisa mudar; o resto do pipeline (agrupamento por UF, escrita em `data/`, índice de busca) não assume nenhum nome de coluna específico.
5. **Não presumir que todo dataset novo vai existir** — `npm run ingest` já trata cada dataset além de `consulta_cand` como opcional (`ingestarOpcional`, ver início deste arquivo). Um dataset que sumir ou mudar de nome de um ano para o outro não deve derrubar a ingestão inteira; deve aparecer como aviso e o campo correspondente fica ausente (com o motivo certo — "fonte não consultada" — nunca um dado inventado), seguindo a mesma regra de `docs/DATA_SOURCES.md` §10.

## 15. Ambientes (hmg/prod) e esteira de CI/CD (26/08/2026)

A pedido do mantenedor, antes de convidar outros desenvolvedores a contribuir: dois ambientes
nomeados e uma esteira que exige duas validações — uma automatizada (IA) e uma humana (o
mantenedor) — antes de qualquer código publicado, nos dois ambientes.

### Decisão de arquitetura: reaproveitar o deploy automático da Vercel, não substituí-lo

A Vercel já publica automaticamente a cada push: qualquer branch vira uma Preview Deployment com
URL estável e própria; só a branch `main` (Production Branch do projeto na Vercel) promove para o
domínio de produção (`fatoeleitoral.metadax.org` desde 26/08/2026 — ver §16). Havia duas formas de
montar os ambientes hmg/prod em cima disso:

1. **Desligar o deploy automático da Vercel e publicar via GitHub Actions** (`vercel deploy`),
   usando o recurso nativo "Environments" do GitHub (aprovador obrigatório antes do job de deploy
   rodar). Mais formalmente parecido com "ambiente" no sentido de infraestrutura, mas exige criar
   `VERCEL_TOKEN`/`VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` como segredos no GitHub e alterar a
   configuração de deploy que já está funcionando ao vivo em produção — risco desnecessário para
   o que o pedido original resolve de outra forma.
2. **Reaproveitar o deploy automático que já existe**, e mover o gate de "duas validações antes de
   publicar" para onde ele já é nativo e testado: branch protection do GitHub, no momento do
   *merge* (que é o evento que dispara o deploy automático da Vercel), não num job de deploy
   separado.

**Escolhida a opção 2** (decisão do mantenedor, 26/08/2026): zero mudança na configuração da
Vercel, zero segredo novo de deploy no GitHub, zero risco ao pipeline de produção já verificado
neste documento (§11, §12). Os dois ambientes viram:

| Ambiente | Branch | URL | Quando publica |
|---|---|---|---|
| **hmg** (homologação) | `hmg` | Preview Deployment automática da Vercel para a branch `hmg` (padrão `eleicoes-metadax-org-git-hmg-<time>.vercel.app`) — sem domínio próprio, sem mudança de DNS | A cada merge de PR em `hmg` |
| **prod** (produção) | `prod` (renomeada de `main` pelo mantenedor, 26/08/2026 — item 6 do checklist manual abaixo, concluído) | `fatoeleitoral.metadax.org` (novo, 26/08/2026) e `eleicoes.metadax.org` (antigo, redireciona para o novo — ver §17) — mesma Production Branch de sempre | A cada merge de PR na branch de produção (sempre vindo de `hmg`, nunca direto de uma branch de feature) |

### Fluxo de contribuição

```
branch de feature → PR → hmg (gate: IA + mantenedor) → merge → testa no preview de hmg
                                                                    ↓
                                    PR de hmg → prod (gate: IA + mantenedor) → merge → prod
```

Nenhuma branch de feature deve abrir PR direto contra a branch de produção — sempre contra `hmg`
primeiro. A promoção `hmg → prod` é o próprio ato de "homologar": só acontece depois que a mudança
já foi conferida rodando de verdade no preview de `hmg`. **Isso é regra, não ainda um bloqueio
técnico** — ver o achado real registrado abaixo ("PR direto contra a branch de produção, mesclado
com o check de segurança vermelho") sobre o que acontece hoje quando alguém (inclusive o próprio
mantenedor) não segue essa regra antes da branch protection estar configurada.

### As duas validações, em cada um dos dois branches protegidos (`hmg` e `prod`)

1. **`.github/workflows/ci.yml`** — `npx tsc --noEmit`, `npm run lint`, `npm run build`. Mesmos
   três comandos que `CONTRIBUTING.md` já pede para rodar localmente antes de abrir PR, agora
   obrigatórios via CI.
2. **`.github/workflows/ai-security-review.yml`** — roda `.github/scripts/ai-security-review.mjs`,
   um script próprio que chama um modelo gratuito do Gemini (Google AI Studio, ver §15.1 abaixo
   para o porquê de não ser mais a action da Anthropic, e §19 para o porquê de não ser mais a
   NVIDIA) contra
   o diff do PR, com instruções específicas deste projeto embutidas no prompt via
   `.github/ai-security-review-instructions.md`: vulnerabilidade de código clássica (injeção,
   XSS, auth), prompt injection/prompt poisoning direcionado a um agente de IA que venha a ler o
   repositório, segredos/credenciais, enfraquecimento silencioso de controle de segurança
   existente, e ameaça à integridade/disponibilidade/confidencialidade do dado exibido (ver o
   próprio arquivo de instruções para a lista completa e o porquê de cada item). Essa é a
   "primeira validação automatizada" pedida pelo mantenedor — falha fechada (qualquer erro —
   secret ausente, API fora do ar, resposta que não é JSON válido — bloqueia o merge, nunca deixa
   passar por omissão).
3. **Aprovação do mantenedor** — via `.github/CODEOWNERS` (`* @pedrorosemberg`) combinado com a
   regra de branch protection "Require review from Code Owners" (ver checklist abaixo). Essa é a
   "validação minha" — obrigatória nos dois branches, não só no de produção, exatamente como
   pedido ("todos deverão ter a minha validação").

### 15.1 Por que não é mais a action `anthropics/claude-code-security-review`

A primeira versão desta esteira (26/08/2026) usava a action oficial da Anthropic, com uma
`ANTHROPIC_API_KEY` paga. O mantenedor decidiu não usar uma chave paga e, em vez disso, usar a
camada gratuita de um provedor de IA (inicialmente NVIDIA, depois Gemini — ver §19 para o porquê
da troca). Essa action é hardcoded para a API/CLI da Anthropic — não existe um input de "endpoint
customizado" para apontar para outro provedor — então a única forma de usar um modelo diferente
foi substituir a action por um script próprio (`.github/scripts/ai-security-review.mjs`, Node
puro, sem dependência nova): calcula o diff do PR, monta um prompt com as instruções de
`.github/ai-security-review-instructions.md`, chama a API do provedor configurado (hoje Gemini,
modelo configurável via `GEMINI_MODEL` no workflow — o catálogo do Google AI Studio muda com o
tempo, verificar o nome atual em `https://aistudio.google.com/` se a API começar a retornar erro
de modelo inválido), e falha o job se a resposta não for JSON válido ou tiver achado de
severidade alta/crítica. Testado localmente antes de subir (três cenários: sem achados, com
achado grave, resposta não-JSON — os três se comportam como esperado, ver histórico de commits).

Consequência prática: o nome do secret mudou de `ANTHROPIC_API_KEY` para `NVIDIA_API_KEY` e,
depois (§19), para `GEMINI_API_KEY`; o workflow chama-se `ai-security-review.yml` desde a
primeira troca (não mais `claude-security-review.yml`).

### O que ainda precisa de uma configuração manual (nenhuma ferramenta disponível nesta sessão
### cria isso via API — precisa ser feito uma vez, pela conta do mantenedor, em Settings do repo)

Sem isso, os arquivos acima existem mas **não bloqueiam nada** — GitHub só impede merge quando uma
regra de branch protection referencia esses checks explicitamente.

1. **Criar a branch `hmg`** (feito nesta sessão, a partir do `main` atual).
2. **Settings → Branches → Add branch protection rule**, uma vez para a branch de produção e uma
   vez para `hmg`:
   - "Require a pull request before merging" — sem push direto. **É esta regra que faltou** no
     achado registrado abaixo (PR aberto direto contra `main`, mesclado com o check de segurança
     vermelho) — sem ela, nada do resto desta lista bloqueia merge de verdade.
   - "Require status checks to pass before merging" → marcar `build-and-test` (de `ci.yml`) e
     `security` (de `ai-security-review.yml`). Eles só aparecem na lista depois da primeira vez
     que rodarem em um PR real — abrir um PR de teste depois de configurar o resto serve para
     isso.
   - "Require review from Code Owners" — usa o `.github/CODEOWNERS` já commitado.
   - "Dismiss stale pull request approvals when new commits are pushed" — recomendado, para que
     uma aprovação não continue valendo depois que o PR mudou.
3. **Settings → Secrets and variables → Actions → New repository secret**: `GEMINI_API_KEY`, com
   uma chave gratuita gerada em `https://aistudio.google.com/apikey` (login com conta Google, sem
   cartão de crédito). Sem essa chave, o workflow `ai-security-review.yml` falha (e, com o status
   check marcado como obrigatório no passo 2, isso por si só já bloqueia o merge — falha fechada,
   não aberta). **Migrado de `NVIDIA_API_KEY`, 26/08/2026 — ver §19.** O secret antigo pode ser
   removido do repositório com segurança depois que este novo estiver configurado.
4. **Settings → Actions → General → "Fork pull request workflows from outside collaborators"** →
   escolher **"Require approval for all outside collaborators"** (a opção mais restritiva
   disponível). Este é o passo que mitiga o mesmo risco que a documentação da action que
   inspirou este script registrava para o caso equivalente: sem essa configuração, um PR
   malicioso de um fork poderia rodar workflows (incluindo os com acesso a `GEMINI_API_KEY`)
   automaticamente, antes de qualquer humano olhar o conteúdo. Com essa configuração, todo PR de
   fora do repositório fica parado até o mantenedor clicar em "Approve and run" — o primeiro
   humano-no-loop da esteira, antes mesmo da IA entrar.
5. **(Recomendado) Settings → General → Default branch** → trocar de `main` para `hmg`, para que
   `git clone` e novos PRs apontem para `hmg` por padrão, reforçando o fluxo acima sem depender de
   cada contribuidor lembrar de mudar a branch base manualmente. Não afeta a Production Branch da
   Vercel, que é configurada separadamente lá.
6. **Rename da branch de produção, `main` → `prod`** (decisão do mantenedor, 26/08/2026) —
   **concluído**: o mantenedor executou o rename pela UI do GitHub (branch `prod` existe, `main`
   não existe mais) e atualizou a Vercel → Project Settings → Git → Production Branch de `main`
   para `prod`.

   **Achado real (26/08/2026):** por um tempo depois do rename, os três workflows deste
   repositório (`ci.yml`, `ai-security-review.yml`, `codeql.yml`) continuaram com
   `on.pull_request.branches`/`on.push.branches` apontando para `[hmg, main]` — `main` não existia
   mais, então **nenhum dos três checks (CI, revisão de segurança, CodeQL) disparava em PRs contra
   `prod`**, incluindo os 8 PRs do Dependabot abertos automaticamente contra `prod` depois do
   rename. Passou despercebido porque o rename em si não quebra nada visivelmente — os PRs
   simplesmente apareciam como "mergeable" sem nenhum check pendente, o que parece "tudo certo" até
   alguém notar que os checks obrigatórios simplesmente não existem na lista. Corrigido nesta
   mesma sessão (mesmo PR que trocou NVIDIA por Gemini, ver §19): as três referências passaram para
   `[hmg, prod]`. Lição: um rename de branch de produção não é só um passo de UI — toda referência
   textual ao nome antigo em `.github/workflows/*.yml` precisa ser auditada explicitamente, porque
   nem GitHub nem a Vercel avisam sobre um workflow trigger que ficou órfão.
7. **(Sugestão do mantenedor, pendente) Settings → Features → Wikis** → habilitar. Wiki do GitHub
   é um repositório git próprio (`{repo}.wiki.git`), separado do código — nenhuma ferramenta desta
   sessão tem permissão de habilitar essa feature (é um toggle de configuração do repositório, não
   um recurso de conteúdo). Depois de habilitada, é só um `git clone`/`git push` normal nesse
   segundo repositório — nesse ponto dá para espelhar lá o conteúdo de `docs/` que fizer sentido
   como referência rápida (a versão em `docs/` continua sendo a fonte da verdade, versionada junto
   com o código que ela documenta; a Wiki seria um índice/resumo de navegação mais fácil, não uma
   cópia divergente).

### Limitação conhecida, registrada

`ai-security-review.yml` roda com `on: pull_request` (não `pull_request_target`) — deliberado:
`pull_request_target` executa com o token/contexto do repositório-base mesmo para PRs de fork, o
padrão clássico de "pwn request" se o job também faz checkout do código do fork (que é exatamente
o que este job precisa fazer para revisar o diff). `pull_request` evita esse risco específico à
custa de exigir o passo 4 do checklist acima como mitigação para o outro risco (segredo acessível
a um workflow disparado por PR externo) — mesmo trade-off que a action `claude-code-security-review`
da Anthropic documentava para o caso equivalente (§15.1), não uma decisão isolada deste projeto.

### Achado histórico (superado): "success" que não revisou nada (PR #1, 26/08/2026)

Enquanto a esteira ainda usava a action `anthropics/claude-code-security-review` (§15.1), o
primeiro teste ponta a ponta (antes do secret `ANTHROPIC_API_KEY` existir) expôs um comportamento
perigoso do padrão da própria action: ela cacheia "já rodou neste PR" por **número do PR**, não
por commit, num arquivo de marcador. A primeira tentativa (que falhou por falta do secret) ainda
grava esse marcador antes de falhar — então **todo commit seguinte no mesmo PR encontrava o
marcador, pulava a revisão inteira, e reportava `success`**, mesmo que o secret continuasse
ausente e nenhum diff novo tivesse sido de fato analisado. Confirmado lendo o log linha a linha:
`"ClaudeCode has already run on PR #1 (found marker file), forcing disable to avoid false
positives"` seguido de `claudecode-scan;outcome=skipped`. Para um gate obrigatório de segurança,
isso é inaceitável: um "check verde" que não significa "revisado" é pior do que não ter o check.

Esse tipo de bug **não existe** em `.github/scripts/ai-security-review.mjs` (§15.1) — o script não
tem nenhum mecanismo de "já rodei, pular" por construção: cada execução do workflow chama a API do
zero, sempre. Registrado aqui como histórico de por que essa classe de bug importa, não porque
ainda se aplique.

### Achado real: PR direto contra `main`, mesclado com o check de segurança vermelho (26/08/2026)

No mesmo dia em que a esteira foi criada, antes do checklist manual acima ter sido executado, um
PR (#2) foi aberto direto contra `main` (não contra `hmg`, pulando a promoção via homologação) a
partir da mesma branch de um PR já aberto contra `hmg` (#1), e mesclado com o check
`security` em vermelho (o secret ainda não existia). Isso só foi possível porque **nenhuma branch
protection ainda estava configurada** — os checks deste documento existem e rodam desde o primeiro
commit, mas continuam sendo só informativos até uma regra de branch protection os referenciar
explicitamente (passo 2 do checklist acima). Sem essa regra, "PR obrigatório" e "check obrigatório"
são convenções documentadas, não bloqueios reais — qualquer um com permissão de push (incluindo o
próprio mantenedor, sem intenção de contornar nada) pode mesclar direto.

Correção aplicada: `hmg` foi ressincronizada com `main` (fast-forward) para as duas branches
voltarem a apontar para o mesmo commit, e o PR #1 (agora redundante) foi fechado com um comentário
explicando o motivo. Nenhuma mudança de código foi necessária — o "bug" aqui é 100% a ausência do
passo 2 do checklist, não um defeito na esteira em si. Registrado como o exemplo mais concreto
possível de por que aquele passo não é opcional antes de abrir o repositório para colaboradores
externos: hoje quem contornou foi o próprio mantenedor, sem querer; amanhã pode ser alguém sem
esse cuidado.

## 16. Secure SDLC — o que foi adicionado e o modelo de fases adotado (26/08/2026)

A pedido do mantenedor: revisar a esteira contra práticas de Secure SDLC (Software Development
Life Cycle seguro — segurança integrada em cada fase do desenvolvimento, não só numa checagem
final antes do deploy). O que já existia (auditoria de segredos, revisão automatizada de PR,
ambientes separados, branch protection) já cobre boa parte disso; esta seção documenta o que foi
adicionado especificamente para fechar lacunas de SAST/SCA, e como as fases do SDLC deste projeto
mapeiam para controles concretos.

### O que foi adicionado nesta rodada

- **`.github/workflows/codeql.yml`** — SAST (Static Application Security Testing) via
  [CodeQL](https://codeql.github.com/), a ferramenta de análise estática nativa do GitHub,
  gratuita para repositórios públicos. Roda em todo PR (`hmg`/produção) e semanalmente
  (`schedule`, segunda-feira 06:00 UTC) contra o código já existente — pega vulnerabilidade
  estrutural conhecida (injeção, XSS, path traversal, uso inseguro de regex, etc.) com um
  mecanismo determinístico de dataflow, complementar (não substituto) à revisão via IA de
  `ai-security-review.yml`: CodeQL não depende de um modelo de linguagem "entender" o diff
  corretamente, e a revisão via IA cobre o que CodeQL não tem regra para (prompt
  injection/poisoning, decisões de arquitetura erradas, o que é específico deste projeto).
- **`.github/dependabot.yml`** — SCA (Software Composition Analysis). Alertas de vulnerabilidade
  em dependência (Dependabot alerts) já são automáticos e gratuitos para repositórios públicos
  independente deste arquivo; o que ele adiciona são PRs semanais de atualização de versão,
  agrupados por ecossistema (`npm` e `github-actions`), para não deixar dependência desatualizada
  acumular até virar um problema de segurança grande de uma vez.
- **Secret scanning + push protection** (GitHub nativo, gratuito para repositórios públicos) —
  **precisa ser habilitado manualmente** em Settings → Code security → "Secret scanning" e "Push
  protection" (ligar os dois). Bloqueia no próprio `git push` um commit que contenha um padrão de
  chave/token reconhecido, antes mesmo de chegar ao GitHub — camada a mais além da auditoria
  manual já feita (`SECURITY.md`) e da revisão automatizada de PR, que só rodam depois que o
  código já está no repositório.
- **`docs/ISO27001_27002.md`** (novo) — mapeamento explícito de qual controle desses (e dos já
  existentes) corresponde a qual cláusula/controle da ISO 27001/27002, com o porquê de ISO 27001
  em si não se aplicar a um repositório isolado (ver o documento para a explicação completa —
  resumida na seção seguinte).

### Modelo de fases do SDLC seguro deste projeto

| Fase | Prática de segurança já aplicada |
|---|---|
| **Requisitos** | `docs/DATA_SOURCES.md` §10 (nunca fabricar dado), `docs/DESIGN_SYSTEM.md` (neutralidade), `CONTRIBUTING.md` (convenções obrigatórias) — segurança e integridade de dado como requisito documentado antes do código, não depois. |
| **Design/arquitetura** | Decisões de arquitetura documentadas com o porquê (`docs/ARCHITECTURE.md` inteiro) — inclusive decisões de *não* fazer algo (ex.: não construir rate limiting agora, §10; não usar `pull_request_target`, §15). CORS aberto e ausência de autenticação em `/api/*` são decisões de design registradas, não omissões. |
| **Desenvolvimento** | `import "server-only"` em todo módulo com segredo; `lerJsonCacheado()` obrigatório para leitura de dado estático (§12); linguagem neutra obrigatória em categoria sensível (`CONTRIBUTING.md`). |
| **Build/CI** | `ci.yml` (typecheck/lint/build), `codeql.yml` (SAST), `dependabot.yml` (SCA) — todos obrigatórios ou automáticos antes de qualquer merge. |
| **Revisão** | `ai-security-review.yml` (revisão automatizada via IA) + aprovação humana obrigatória via CODEOWNERS (§15) — duas validações independentes, nenhuma dispensa a outra. |
| **Deploy** | Ambientes separados hmg/prod (§15), sem segredo de deploy novo, reaproveitando o pipeline da Vercel já testado sob carga (§12). |
| **Operação/monitoramento** | `/status` com checagem ao vivo de cada fonte externa; `/atualizacoes` espelhando issues/PRs/releases do GitHub; Vercel Analytics/Speed Insights sem coleta de identificador pessoal (`/privacidade`). |
| **Resposta a incidente** | `SECURITY.md` — canal de report privado (GitHub Security Advisories), riscos conhecidos com decisão registrada, e este próprio documento como histórico de achados reais e como foram corrigidos (§11, §12, §15). |

Nenhuma fase nova foi inventada para "parecer completo" — o que está na tabela já existia ou foi
adicionado nesta sessão; o valor de listar assim é tornar visível que segurança não é só o gate
de PR, é uma prática distribuída pelas fases, e facilitar auditoria (interna ou de quem for
contribuir) sobre onde cada controle mora.

## 17. Rebranding para Fato Eleitoral e migração de domínio (26/08/2026)

A pedido do mantenedor, o produto passou a se chamar **Fato Eleitoral**, com logo e favicon
próprios (`assets/fatoeleitoral.*`, `assets/favicon.*`) — decisão que inclui usar as cores da
bandeira do Brasil nesses dois arquivos especificamente, uma exceção documentada em
`docs/DESIGN_SYSTEM.md` §1.1 à regra de neutralidade cromática do restante do produto (que não
muda). O nome do repositório no GitHub (`eleicoes.metadax.org`) **não muda** — repositório público
já tem forks, estrelas e links externos; renomear quebraria isso sem necessidade, e o nome do
produto não depende do nome do repositório que o hospeda.

### Migração de domínio — plano de três passos

O mantenedor provisionou dois domínios novos: `fatoeleitoral.metadax.org` (subdomínio de
`metadax.org`, já anexado ao projeto na Vercel) e `fatoeleitoral.com.br` (domínio próprio,
provisionado, migração futura). O plano, registrado para não se perder entre os passos:

1. **Feito nesta seção:** `fatoeleitoral.metadax.org` vira o domínio canônico (`SITE_URL` em
   `app/layout.tsx`, `app/sitemap.ts`, `app/robots.ts`, `USER_AGENT` em `src/lib/http.ts`).
   `eleicoes.metadax.org` continua registrado e ativo na Vercel, mas passa a redirecionar
   (307, não-permanente — `next.config.ts`, condição `has: [{ type: "host", ... }]`) para o novo
   domínio, preservando caminho e querystring. Não-permanente de propósito: o passo 3 muda o
   destino de novo, e um 301/308 seria cacheado por navegador/buscador de um jeito mais custoso de
   reverter.
2. **Planejado:** conferir todo link/documentação que ainda referencia `eleicoes.metadax.org`
   como URL de produto (não como nome de repositório, que é uma coisa diferente — ver acima) e
   atualizar para `fatoeleitoral.metadax.org`.
3. **Planejado:** migração final para `fatoeleitoral.com.br` — nessa hora, o redirecionamento do
   passo 1 passa a apontar para lá, e o mesmo cuidado com redirect não-permanente se aplica
   até essa migração também estar validada em produção.

### O que não foi automatizado nesta sessão

Anexar `fatoeleitoral.metadax.org` ao projeto na Vercel e apontar o DNS do subdomínio já tinha
sido feito manualmente pelo mantenedor antes desta sessão (confirmado via `mcp__Vercel__get_project`
— o domínio já aparecia na lista de domínios do projeto). Nenhuma ferramenta desta sessão tem
acesso para comprar/anexar domínio ou alterar DNS — só o redirecionamento em nível de aplicação
(`next.config.ts`) e as referências de URL no código foram implementados aqui.

### Fontes oficiais com logo real (`SourceMarquee`)

O mantenedor enviou os logos oficiais das cinco fontes listadas em `SourceMarquee.tsx`, substituindo
o wordmark tipográfico que era um placeholder documentado (ver git history do componente): TSE,
Receita Federal e Portal da Transparência/CGU (`assets/fontes_images/`, enviados em 26/08/2026),
BrasilAPI (`assets/fontes_images/brasilapi-logo-medium.webp`, enviado depois) e METADAX (logo
remoto, `cdn.metadax.com.br/assets/metadax_branding_marks/...` — único logo servido de fora do
domínio do produto; `next.config.ts` precisou de `images.remotePatterns` para esse host
especificamente). Um arquivo recebido não foi usado: `gov-br_logo-svg.png` (a marca unificada
`gov.br`) não corresponde a nenhuma das cinco fontes listadas em `SourceMarquee` como órgão
específico — fica disponível em `public/assets/fontes_images/` para uso futuro (ver também a nova
seção "Catálogo de APIs governamentais" em `docs/DATA_SOURCES.md`, onde esse logo teria mais
sentido se uma seção de catálogo gov.br for exibida na UI algum dia).

## 18. Achado real: falso positivo de prompt injection na troca de modelo NVIDIA (26/08/2026)

Ao trocar o modelo padrão de `qwen/qwen2.5-coder-32b-instruct` para `meta/llama-3.3-70b-instruct`
(PR #9, primeira execução real do check `security` com `NVIDIA_API_KEY` configurada), o próprio
modelo sinalizou a mudança como achado de severidade alta: *"A mudança do modelo de IA de
'qwen/qwen2.5-coder-32b-instruct' para 'meta/llama-3.3-70b-instruct' pode ser uma tentativa de
manipular a próxima IA que ler este repositório, o que é um exemplo de prompt injection/prompt
poisoning."* — bloqueando o merge (falha fechada, como desenhado).

**Causa raiz:** a regra 1 de `.github/ai-security-review-instructions.md` pede para tratar
qualquer coisa "sobre IA" no repositório com suspeita elevada — redação correta para o problema
real que ela resolve (texto tentando instruir um agente de IA), mas ambígua o suficiente para o
modelo confundir uma mudança de *configuração* do próprio pipeline (qual modelo/parâmetro é
chamado) com uma tentativa de *injetar instrução* via texto. É um falso positivo, não um bug de
segurança real: trocar `NVIDIA_MODEL` é manutenção normal, feita abertamente pelo mantenedor, sem
nenhum texto direcionado a um agente de IA no diff.

**Corrigido** (PR seguinte) adicionando um parágrafo explícito de "o que isto NÃO é" na regra 1:
mudança de valor de configuração do próprio pipeline (`NVIDIA_MODEL`, `temperature`, `top_p`,
`max_tokens`) não é, por si só, prompt injection — o achado exige conteúdo textual com instrução
dirigida a um agente de IA, não uma troca de provedor/modelo. Registrado aqui como o primeiro
resultado real do gate desde que a chave foi configurada, e como lembrete de que instruções dadas
a um modelo de linguagem para "ser desconfiado de X" podem generalizar mais do que o pretendido —
vale reler a redação de `ai-security-review-instructions.md` sempre que um achado parecer
desproporcional ao diff real, em vez de assumir que o modelo está sempre certo.

## 19. Achado real: NVIDIA travando a partir do GitHub Actions — migração para Gemini (26/08/2026)

Depois de corrigir o falso positivo do §18, o check `security` voltou a falhar — desta vez com um
erro de rede genuíno, não um achado. PR #10 (a correção do §18) travou ~5 minutos e falhou com
`fetch failed`, sem timeout explícito no código. Corrigido com `AbortController` + retry (PR #11,
timeout de 60s, 2 tentativas) — mas a chamada real ainda travou o timeout inteiro **nas duas
tentativas**. Bumping para 120s (PR #12) não ajudou: as duas tentativas voltaram a travar pelo
tempo exato do novo timeout, só que demorando o dobro para falhar.

**Diagnóstico:** um padrão de 4 timeouts diferentes (~5min sem timeout, 60s, 120s, e um teste
dedicado de 20s) e 6 tentativas no total, **todas** travando pelo tempo exato do limite
configurado — nunca respondendo antes, nunca demorando menos. Isso não é compatível com "o modelo
está devagar" (aí pelo menos uma tentativa, em algum dos quatro limites, teria completado antes de
estourar). É compatível com a conexão sendo aceita e depois nunca respondida. Um teste de
diagnóstico com `curl` (adicionado temporariamente ao workflow, `max_tokens=5`, requisição
mínima) mediu exatamente onde a chamada travava: `DNS=0.038s CONNECT=0.039s TLS=0.113s
TTFB=0.000s TOTAL=20.003s` — DNS resolve, TCP conecta, TLS completa, tudo em ~150ms, e depois
**zero bytes voltam** pelos 20s inteiros do teste.

A confirmação definitiva veio de repetir a mesma chamada (mesmo endpoint
`integrate.api.nvidia.com`, mesmo corpo de requisição, sem a chave de API) a partir de uma origem
de rede diferente do GitHub Actions: resposta em **389ms**, com um 401 correto ("Header of type
`authorization` was missing") — comportamento normal de uma API saudável. A mesma API que nunca
respondia a partir de um runner do GitHub Actions respondeu quase instantaneamente de outro lugar,
com a mesma requisição. Isso isola o problema à origem de rede do GitHub Actions especificamente —
consistente com um bloqueio/limitação silenciosa da NVIDIA contra faixas de IP de datacenter/CI
(um padrão comum de proteção anti-abuso: descartar a conexão sem responder, em vez de devolver um
429/403 explícito, para não sinalizar ao cliente automatizado que ele foi identificado) — não um
bug neste script, e não algo que ajustar timeout/retry no nosso lado resolve.

**Decisão do mantenedor (26/08/2026):** substituir a NVIDIA pela API do Gemini (Google AI Studio,
também gratuita, chave via `https://aistudio.google.com/apikey`) neste mesmo pipeline. Mudanças:

- `.github/scripts/ai-security-review.mjs`: reescrito para o formato de request/response do
  Gemini (`systemInstruction` + `contents` em vez de `messages` no formato OpenAI; autenticação via
  header `x-goog-api-key` em vez de `Authorization: Bearer`; `generationConfig.responseMimeType:
  "application/json"` pedindo ao próprio Gemini para responder só JSON, mais confiável do que
  depender só da instrução em texto). Estrutura de retry/timeout mantida (2 tentativas, agora 60s
  cada — valor normal de higiene de rede para qualquer chamada de API em CI, não uma tentativa de
  compensar um provedor que trava: a infraestrutura do Gemini não tem o histórico de hang que a da
  NVIDIA tinha a partir de runners do GitHub Actions).
- `.github/workflows/ai-security-review.yml`: secret `NVIDIA_API_KEY` → `GEMINI_API_KEY`, env
  `NVIDIA_MODEL` → `GEMINI_MODEL` (padrão `gemini-2.5-flash`), passo de diagnóstico via `curl`
  removido (era temporário, específico para investigar o hang da NVIDIA — sem função depois da
  migração).
- `.github/ai-security-review-instructions.md`: parágrafo "o que isto NÃO é" da regra 1 (§18)
  atualizado para os nomes de env do Gemini (`GEMINI_MODEL`, `topP`, `maxOutputTokens`) e para
  explicitar que a própria migração de provedor não é, por si só, um achado de prompt injection.

**Achado relacionado, corrigido no mesmo PR:** ao investigar por que os 8 PRs do Dependabot
abertos contra `prod` não mostravam nenhum resultado do check `security`, ficou claro que
`ci.yml`, `ai-security-review.yml` e `codeql.yml` ainda tinham `branches: [hmg, main]` no
trigger — `main` não existe mais desde o rename para `prod` (§ acima). Sem isso corrigido, nenhum
dos três checks obrigatórios rodaria em PR nenhum contra `prod`, incluindo esta própria migração.
Corrigido para `[hmg, prod]` nos três arquivos.

**Ação manual pendente do mantenedor:** cadastrar o secret `GEMINI_API_KEY` no repositório
(Settings → Secrets and variables → Actions) com uma chave gerada em
`https://aistudio.google.com/apikey`, e remover o secret `NVIDIA_API_KEY` (não usado mais, chave
antiga sem uso é uma superfície desnecessária). Sem o novo secret, o gate continua falhando
fechado — não abre exceção enquanto a chave não existir, mesmo que a causa da falha tenha mudado.
