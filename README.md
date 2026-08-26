<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/fatoeleitoral_branco.svg">
  <img src="assets/fatoeleitoral.svg" alt="Fato Eleitoral" width="360">
</picture>

Repositório: `eleicoes.metadax.org` (nome mantido por estabilidade de URLs/links
já publicados — ver "Domínio" abaixo para o histórico e o plano de migração).

[![Estrelas no GitHub](https://fatoeleitoral.metadax.org/api/badge/estrelas)](https://github.com/pedrorosemberg/eleicoes.metadax.org/stargazers)
[![Forks](https://fatoeleitoral.metadax.org/api/badge/forks)](https://github.com/pedrorosemberg/eleicoes.metadax.org/network/members)
[![Issues e PRs abertos](https://fatoeleitoral.metadax.org/api/badge/issues)](https://github.com/pedrorosemberg/eleicoes.metadax.org/issues)
[![Último commit](https://fatoeleitoral.metadax.org/api/badge/ultimo-commit)](https://github.com/pedrorosemberg/eleicoes.metadax.org/commits/main)
[![Licença CC BY 4.0](https://fatoeleitoral.metadax.org/api/badge/licenca)](LICENSE)

Os badges acima são gerados por este próprio projeto (`GET /api/badge/[metrica]`,
`src/lib/badge-svg.ts`), não pelo shields.io — trocado depois de o badge de
estrelas ficar visivelmente desatualizado (mostrando "0" bem depois do
repositório já ter sua primeira estrela real) por causa do cache do
shields.io, que este projeto não controla. Os quatro primeiros puxam o
número direto da API do GitHub a cada 5–10 min (mesma janela usada no
resto do projeto); o de licença é fixo, pelo mesmo motivo de sempre: o
detector automático do GitHub não reconhece CC BY 4.0 como licença de
código. Uma ressalva que nenhuma implementação própria resolve: o GitHub
embute imagens de README pelo seu próprio proxy (`camo.githubusercontent.com`),
que tem seu cache por cima do nosso — o número aqui é sempre, na pior das
hipóteses, tão atual quanto esse segundo cache permitir. Os mesmos números
do repositório, junto com visitantes e páginas vistas do site (visitantes
únicos e pageviews, sem esse segundo cache no meio), aparecem atualizados
ao vivo em
[fatoeleitoral.metadax.org/sobre](https://fatoeleitoral.metadax.org/sobre#estatisticas-do-projeto)
(também disponível como JSON em `GET /api/estatisticas-projeto`).

Consulta pública de candidatos às eleições brasileiras, cruzando dados coletados
do site de dados abertos do Tribunal Superior Eleitoral (TSE) com o Portal da
Transparência (CGU) e dados de CNPJ da Receita Federal (via
[BrasilAPI](https://brasilapi.com.br)).

Tema claro, preto e branco, sem cor de partido, mobile-first — neutralidade
político-partidária como requisito central de design, ver `docs/DESIGN_SYSTEM.md`
(a logo e o favicon são a única exceção documentada, ver a seção "Identidade
visual e domínio" abaixo). Sem nenhuma dependência de rede externa da METADAX
(CDN, loader, header/footer) — tudo autocontido neste projeto. Idealizado e
mantido por Pedro Rosemberg, com o
[Instituto METADAX de Inovação (IMI)](https://imi.metadax.org) como parceiro
de apoio institucional — ver `/sobre` para o detalhe completo.

Licenciado sob [CC BY 4.0](LICENSE).

## Identidade visual e domínio

Em 26/08/2026 o projeto passou a se chamar **Fato Eleitoral**, com uma logo e
favicon próprios (`assets/fatoeleitoral.svg`/`.png`, `assets/favicon.ico`/`.svg`).
Esses arquivos são a única exceção à regra de neutralidade cromática do projeto:
usam as cores da bandeira do Brasil (azul, verde, amarelo) *só* na logo e no
favicon, por serem símbolos nacionais — o restante do site (UI, gráficos,
estados de feedback) continua estritamente preto e branco, sem nenhuma cor de
marca. Ver `docs/DESIGN_SYSTEM.md` para o detalhe completo dessa exceção.

O domínio de produção também está em migração, em três passos:

1. **Feito (26/08/2026):** `fatoeleitoral.metadax.org` é o novo domínio
   canônico. `eleicoes.metadax.org` continua no ar, mas redireciona
   (307, temporário) para `fatoeleitoral.metadax.org`, preservando caminho e
   querystring — ver `next.config.ts`.
2. **Planejado:** revisão de todo link externo/interno que ainda aponte para
   `eleicoes.metadax.org`.
3. **Planejado:** migração final para `fatoeleitoral.com.br` (já provisionado),
   quando o redirecionamento do passo 1 for atualizado para apontar para lá.

O nome do **repositório no GitHub** (`eleicoes.metadax.org`) não muda nesta
migração — trocar o nome de um repositório já público quebraria todo link,
fork e citação existentes para ele; o nome do produto e o domínio são
independentes do nome do repositório.

## Páginas

- `/` — apresentação do projeto
- `/buscar` — busca **direta** (nome, número ou ID do candidato) ou **indireta**
  (filtros combináveis por UF, cidade, cargo e partido)
- `/candidato/[id]` — perfil de um candidato: foto, dados básicos, bens
  declarados, finanças de campanha (receitas/despesas), redes sociais,
  plano de governo (PDF), certidões criminais e coligação (coletados do
  site de dados abertos do TSE), e cruzamento ao vivo com o Portal da
  Transparência (PEP, contratos, sanções, servidor público federal e
  benefícios sociais)
- `/mapa` — mapa coroplético real (Leaflet + fronteiras oficiais do IBGE) e
  estatísticas por UF/cargo (consumível também via `GET /api/estatisticas`, JSON, CORS aberto)
- `/status` — saúde em tempo real de cada fonte de dado externa (TSE, BrasilAPI,
  Portal da Transparência), com checagem ao vivo a cada 30s
- `/sobre` — metodologia, fontes, licença, responsável pelo projeto e estatísticas
  reais do repositório/site (consumível também via `GET /api/estatisticas-projeto`, JSON)
- `/participe` — dicas de voto consciente, grupo do WhatsApp do projeto e como contribuir com código/dado
- `/roteiro` — o que está planejado, bloqueado ou só sugerido, cada item com a fonte de dado
  correspondente, e como propor algo novo
- `/atualizacoes` — issues, patches e releases espelhados ao vivo do repositório no GitHub
  (sincronizado a cada 10 min)
- `/privacidade` — o que é coletado (Vercel Analytics/Speed Insights, eventos de busca) e por quê
- `/termos` — usos autorizados do site e dos dados

Todo horário exibido no site segue o padrão brasileiro (`America/Sao_Paulo`,
GMT-3), independentemente do fuso do servidor.

## API pública

Todas as rotas em `/api/*` respondem com CORS aberto (`Access-Control-Allow-Origin: *`)
— qualquer site, incluindo qualquer subdomínio de `metadax.org`/`metadax.com.br`, pode
consumi-las livremente. Ver `docs/ARCHITECTURE.md` §10 para o que isso cobre (e o que não
cobre — não há chave de API nem gestão de cota por consumidor).

## Documentação

Leia antes de mexer no código — cada decisão de arquitetura, fonte de dado e
design está documentada e foi validada com testes reais, não apenas descrita:

- **[docs/DATA_SOURCES.md](docs/DATA_SOURCES.md)** — todas as fontes de dados
  mapeadas (TSE, DivulgaCandContas, BrasilAPI, Portal da Transparência e mais),
  com endpoints, limites de uso, autenticação e os testes reais feitos contra
  cada uma. Inclui a limitação de rede descoberta (o TSE bloqueia o ambiente de
  desenvolvimento usado nesta sessão) e como contorná-la.
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — pipeline de ingestão,
  camada de proxy de API, modelo de dados, estrutura de páginas e a estratégia
  de SEO/AEO/GEO (visibilidade para buscadores e para IAs/crawlers).
- **[docs/DATA_LINEAGE.md](docs/DATA_LINEAGE.md)** — rastreabilidade completa:
  cada dado exibido, do dataset oficial no site do TSE até a página do produto.
- **[docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)** — identidade visual neutra
  (preto/branco) do projeto, por que cada cor "de marca" foi deliberadamente
  excluída, e a única exceção documentada (logo/favicon, ver "Identidade visual
  e domínio" acima).
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — setup local, checklist antes de um PR
  e as convenções específicas deste projeto (nunca fabricar dado, linguagem
  neutra em categorias sensíveis, cache obrigatório para leitura de `data/`).
- **[SECURITY.md](SECURITY.md)** — como reportar uma vulnerabilidade e os
  riscos conhecidos já avaliados (resultado da auditoria de 26/08/2026).
- **[docs/ISO27001_27002.md](docs/ISO27001_27002.md)** — mapeamento dos controles técnicos da
  ISO 27002 aplicáveis a este projeto, e por que a certificação ISO 27001 em si não se aplica a
  um repositório isolado (é um sistema de gestão organizacional, não algo que um software tenha).

## Ambientes e CI/CD

Dois ambientes: **hmg** (homologação — preview automático da Vercel para a branch `hmg`) e
**prod** (`fatoeleitoral.metadax.org` — branch `prod`, ver "Identidade visual e domínio" acima).
Todo PR passa por dois checks obrigatórios antes de poder ser mesclado em qualquer um dos dois —
CI (typecheck/lint/build) e uma revisão de segurança automatizada via IA (Gemini, gratuita), com
foco extra em prompt injection/prompt poisoning — mais a aprovação manual do mantenedor. Ver
`docs/ARCHITECTURE.md` §15/§16/§19 para a arquitetura completa e o checklist de configuração, e
`CONTRIBUTING.md` para o fluxo de contribuição.

## Stack

Next.js 16 (App Router) + TypeScript + Tailwind CSS v4, deploy na Vercel.

## Rodando localmente

```bash
npm install
npm run dev
```

Abre em `http://localhost:3000`. O repositório já vem com um snapshot real,
coletado do site de dados abertos do TSE (20 e 24/08/2026) e commitado em
`data/2026/`: 20.638 candidatos (28 unidades eleitorais — as 27 UFs + `BR`,
usada pelo TSE para presidente/vice), bens declarados, redes sociais,
coligações, vagas em disputa, finanças de campanha, teto de gastos e
situação de julgamento. Fotos (20.638) e PDFs de plano de governo (208
candidatos) ficam numa branch separada do repositório (`assets-tse-2026`,
binários demais para `data/`) e são referenciados por URL nos candidatos.
Motivo de cassação está vazio porque nenhuma candidatura foi cassada até a
data da coleta — não é ausência de dado, é o resultado real (o dataset do
TSE trazia zero linhas).

### Coletando dados atualizados do TSE

O TSE disponibiliza esses dados como arquivos para download no seu site de
dados abertos — não como uma API pública para consumo em tempo real
(requisições automatizadas de fora de uma rede residencial/brasileira são
bloqueadas no edge, ver `docs/DATA_SOURCES.md` §5). Por isso a atualização é
sempre em duas etapas manuais:

```bash
# 1. baixar os ZIPs mais recentes de uma rede que o TSE não bloqueie
npm run ingest -- --ano=2026
# ou, se você já baixou os ZIPs manualmente (navegador, outra máquina):
npm run ingest -- --ano=2026 --from-dir=./caminho/com/zips-baixados
```

`--from-dir` lê `{dataset}_{ano}.zip` de uma pasta local em vez de baixar —
nomes esperados: `consulta_cand_{ano}.zip`, `bem_candidato_{ano}.zip`,
`rede_social_candidato_{ano}.zip`, `motivo_cassacao_{ano}.zip`,
`consulta_coligacao_{ano}.zip`, `consulta_vagas_{ano}.zip`,
`consulta_cand_complementar_{ano}.zip`,
`prestacao_de_contas_eleitorais_candidatos_{ano}.zip`,
`CNPJ_campanha_{ano}.zip`. Só `consulta_cand` é obrigatório — os demais são
independentes entre si, então rodar com qualquer subconjunto deles funciona
normalmente (o que faltar fica de fora do snapshot, sem quebrar o resto).

Fotos e PDFs de plano de governo (`foto_cand2026_{UF}_div.zip`,
`proposta_governo_2026_{UF}.zip`) não passam por `npm run ingest` — são
binários demais para `data/`. Extraia-os localmente e rode:

```bash
npm run build-asset-index -- --ano=2026 --fotos-dir=./fotos --planos-dir=./planos-de-governo
```

Isso grava as URLs (`fotoUrl`, `planoGovernoUrls`) direto nos candidatos —
os arquivos em si precisam estar publicados em algum lugar acessível por URL
(este projeto usa uma branch própria do repositório, `assets-tse-2026`,
servida via `raw.githubusercontent.com` — ver `docs/DATA_SOURCES.md` §1).

### Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha `PORTAL_TRANSPARENCIA_API_KEY`
(cadastro gratuito — passo a passo em `docs/DATA_SOURCES.md` §4). Sem essa
variável, os endpoints de cruzamento com o Portal da Transparência retornam
"indisponível" em vez de quebrar. `ANO_ELEICAO` é opcional (padrão `2026`) —
troca qual eleição a aplicação lê de `data/{ano}/**`, ver `docs/ARCHITECTURE.md`
§14 para o passo a passo completo de virar para uma eleição nova.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Serve o build de produção |
| `npm run lint` | ESLint |
| `npm run ingest -- --ano=2026` | Roda a ingestão de dados do TSE (ver acima) — já inclui a geração do índice de busca (ver linha abaixo) |
| `npm run build-search-index -- --ano=2026` | Regera `data/{ano}/indice-busca/` a partir de `data/{ano}/candidatos/` já gravado, sem rede — roda sozinho dentro de `npm run ingest`, só precisa ser chamado à parte se `candidatos/` mudar por outro caminho (ver `docs/ARCHITECTURE.md` §13) |
| `npm run build-asset-index -- --ano=2026 --fotos-dir=... --planos-dir=...` | Indexa fotos e planos de governo já extraídos, gravando as URLs nos candidatos (ver acima) |
| `npm run ingest-certidoes -- --ano=2026` | Indexa as certidões criminais direto do release do GitHub (sem baixar os ZIPs inteiros — ver `docs/DATA_SOURCES.md` §1) |
