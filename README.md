# eleicoes.metadax.org

[![Estrelas no GitHub](https://img.shields.io/github/stars/pedrorosemberg/eleicoes.metadax.org?style=flat-square&label=estrelas)](https://github.com/pedrorosemberg/eleicoes.metadax.org/stargazers)
[![Forks](https://img.shields.io/github/forks/pedrorosemberg/eleicoes.metadax.org?style=flat-square&label=forks)](https://github.com/pedrorosemberg/eleicoes.metadax.org/network/members)
[![Issues e PRs abertos](https://img.shields.io/github/issues/pedrorosemberg/eleicoes.metadax.org?style=flat-square&label=issues%2FPRs%20abertos)](https://github.com/pedrorosemberg/eleicoes.metadax.org/issues)
[![Último commit](https://img.shields.io/github/last-commit/pedrorosemberg/eleicoes.metadax.org?style=flat-square&label=%C3%BAltimo%20commit)](https://github.com/pedrorosemberg/eleicoes.metadax.org/commits/main)
[![Licença CC BY 4.0](https://img.shields.io/badge/licen%C3%A7a-CC%20BY%204.0-000000?style=flat-square)](LICENSE)

Os quatro primeiros badges puxam o número direto da API do GitHub a cada
carregamento — não são estáticos (o de licença é fixo por escolha: o
detector automático do GitHub não reconhece CC BY 4.0 como licença de
código, então mostraria "not identifiable" em vez do que está de fato no
arquivo [`LICENSE`](LICENSE)). Os mesmos números do repositório, junto com
visitantes do site, aparecem atualizados ao vivo em
[eleicoes.metadax.org/sobre](https://eleicoes.metadax.org/sobre#estatisticas-do-projeto)
(também disponível como JSON em `GET /api/estatisticas-projeto`).

Consulta pública de candidatos às eleições brasileiras, cruzando dados coletados
do site de dados abertos do Tribunal Superior Eleitoral (TSE) com o Portal da
Transparência (CGU) e dados de CNPJ da Receita Federal (via
[BrasilAPI](https://brasilapi.com.br)).

Tema claro, preto e branco, sem cor de partido, mobile-first — neutralidade
político-partidária como requisito central de design, ver `docs/DESIGN_SYSTEM.md`.
Sem nenhuma dependência de rede externa da METADAX (CDN, loader, header/footer) —
tudo autocontido neste projeto. Um projeto do
[Instituto METADAX de Inovação (IMI)](https://imi.metadax.org).

Licenciado sob [CC BY 4.0](LICENSE).

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
- `/participe` — dicas de voto consciente e como contribuir com o projeto
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
  (preto/branco) do projeto, e por que cada cor "de marca" foi deliberadamente
  excluída.

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
"indisponível" em vez de quebrar.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Serve o build de produção |
| `npm run lint` | ESLint |
| `npm run ingest -- --ano=2026` | Roda a ingestão de dados do TSE (ver acima) |
| `npm run build-asset-index -- --ano=2026 --fotos-dir=... --planos-dir=...` | Indexa fotos e planos de governo já extraídos, gravando as URLs nos candidatos (ver acima) |
| `npm run ingest-certidoes -- --ano=2026` | Indexa as certidões criminais direto do release do GitHub (sem baixar os ZIPs inteiros — ver `docs/DATA_SOURCES.md` §1) |
