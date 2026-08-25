# Rastreabilidade dos dados — do site do TSE ao produto

Este documento existe para uma pergunta específica e recorrente: **de onde exatamente veio cada
dado exibido no site, e como ele chegou até aqui?** Cada linha das tabelas abaixo liga três
pontas: (1) o dataset oficial tal como publicado no site de dados abertos do TSE, (2) como ele
chegou a este repositório (o TSE bloqueia a rede usada para desenvolver este projeto — ver
`docs/DATA_SOURCES.md` §5 — então a coleta é manual, feita pelo mantenedor do projeto de uma rede
que o TSE não bloqueia, e entregue via GitHub Release ou commit direto), e (3) onde/como ele
aparece no produto. `docs/DATA_SOURCES.md` documenta cada fonte em profundidade (testes reais,
limites, formato); este arquivo é o índice que amarra as três pontas.

## 1. Datasets do TSE (coleta manual, dados abertos)

Todos publicados originalmente em `https://dadosabertos.tse.jus.br/dataset/candidatos-2026` —
mesmo domínio bloqueado para este agente (ver `docs/DATA_SOURCES.md` §5) — coletados pelo
mantenedor do projeto de uma rede residencial e entregues via GitHub Release. A maioria está na
release **`files`** (`https://github.com/pedrorosemberg/eleicoes.metadax.org/releases/tag/files`);
certidões criminais estão numa release própria por causa do tamanho (ver linha própria abaixo).

| Dataset TSE | Asset na release | Script de ingestão | Saída em `data/` | Aparece em | Status |
|---|---|---|---|---|---|
| `consulta_cand` | `consulta_cand_2026.zip` | `scripts/ingest-tse.ts` | `{ano}/candidatos/{UF}.json` | `/candidato/[id]`, `/buscar`, `/mapa` | Ingerido |
| `bem_candidato` | `bem_candidato_2026.zip` | `scripts/ingest-tse.ts` | `{ano}/bens/{UF}.json` | `/candidato/[id]` — seção "Bens declarados" | Ingerido |
| `rede_social_candidato` | `rede_social_candidato_2026.zip` | `scripts/ingest-tse.ts` | `{ano}/redes-sociais/{UF}.json` | `/candidato/[id]` — seção "Site oficial e redes sociais" | Ingerido |
| `motivo_cassacao` | `motivo_cassacao_2026.zip` | `scripts/ingest-tse.ts` | `{ano}/motivos-cassacao/{UF}.json` | `/candidato/[id]` — aviso de cassação (quando existir) | Ingerido (0 linhas na coleta atual — nenhuma cassação até a data) |
| `consulta_coligacao` | `consulta_coligacao_2026.zip` | `scripts/ingest-tse.ts` | `{ano}/coligacoes.json` | `/candidato/[id]` — composição/situação da coligação | Ingerido |
| `consulta_vagas` | `consulta_vagas_2026.zip` | `scripts/ingest-tse.ts` | `{ano}/vagas.json` | `/mapa`, `/api/estatisticas` | Ingerido |
| `consulta_cand_complementar` | `consulta_cand_complementar_2026.zip` | `scripts/ingest-tse.ts` | merge em `{ano}/candidatos/{UF}.json` (`tetoGastos`, `situacaoJulgamento`) | `/candidato/[id]` — teto de gastos, situação do registro | Ingerido |
| `prestacao_de_contas_eleitorais_candidatos` | `prestacao_de_contas_eleitorais_candidatos_2026.zip` | `scripts/ingest-tse.ts` | `{ano}/financas/{UF}.json` | `/candidato/[id]` — seção "Finanças de campanha" | Ingerido (só receitas + despesas contratadas; despesas pagas e doador originário ficam de fora — ver `/roteiro`) |
| `prestacao_de_contas_eleitorais_orgaos_partidarios` | `prestacao_de_contas_eleitorais_orgaos_partidarios_2026.zip` | — | — | — | **Pendente** — na release, ainda não ingerido (item planejado em `/roteiro`, junto de `/partido/[sigla]`) |
| `CNPJ_campanha` | `CNPJ_campanha_2026.zip` | `scripts/ingest-tse.ts` | `{ano}/cnpj-campanha.json` | Lista solta, sem seção própria ainda (ver sugestão em `/roteiro`) | Ingerido, não cruzado com candidato (sem `SQ_CANDIDATO` na origem) |
| `foto_cand2026_{UF}_div` (fotos) | `fotos_dos_candidatos.zip` (ZIP com 28 ZIPs internos, um por UF) | `scripts/build-asset-index.ts` | binários → branch `assets-tse-2026`; URL em `{ano}/candidatos/{UF}.json` (`fotoUrl`) | `/candidato/[id]` — foto oficial | Ingerido |
| `proposta_governo_2026_{UF}` (plano de governo) | `planos_de_governo.zip` (ZIP com 28 ZIPs internos, um por UF) | `scripts/build-asset-index.ts` | binários → branch `assets-tse-2026`; URL em `{ano}/candidatos/{UF}.json` (`planoGovernoUrls`) | `/candidato/[id]` — seção "Plano de governo" | Ingerido (208 candidatos com PDF) |
| `certidao_criminal` | Release própria: `arquivos_de_certidoes_criminais` — `certidao_criminal_2026_{UF}.zip` (28 arquivos, ~9,5 GB no total) | `scripts/ingest-certidoes.ts` | índice leve em `{ano}/certidoes/{UF}.json` (offset+tamanho); PDFs servidos sob demanda, sem duplicar hospedagem — ver `docs/DATA_SOURCES.md` §1 | `/candidato/[id]` — seção "Certidões criminais", via `/api/certidao/[uf]/[candidato]/[arquivo]` | Ingerido para as 28 UFs — 20.089 candidatos com pelo menos um documento. 6 UFs (`BA`, `MG`, `PR`, `RJ`, `SC`, `SP`) tiveram upload truncado no release (falta o central directory); recuperadas via varredura de local file headers — ver `docs/DATA_SOURCES.md` §1 |

**Nota sobre duplicidade de origem:** em 24/08/2026, além da release `files`, os mesmos ZIPs (e
mais alguns) também foram commitados diretamente no repositório, na pasta
`dados_oficiais_do_tse_24-08-2026/` — redundante com a release, mantido como está (não removido
por precaução, já que representa trabalho do mantenedor), mas **não é a fonte usada pelos
scripts de ingestão**, que sempre apontam para a release `files` ou para um `--from-dir` local.

## 2. Fontes externas ao TSE (não passam por release do GitHub)

| Fonte | Como é consultada | Aparece em | Ver também |
|---|---|---|---|
| BrasilAPI (Receita Federal/CNPJ, IBGE) | Chamada ao vivo, sem chave, por CNPJ do partido | `/candidato/[id]` — seção "Dados do partido (CNPJ)" | `docs/DATA_SOURCES.md` §3 |
| Portal da Transparência (CGU) — PEP/contratos/sanções | Chamada ao vivo, com chave de API, por CPF do candidato | `/candidato/[id]` — seção "Portal da Transparência" | `docs/DATA_SOURCES.md` §4 |
| Portal da Transparência (CGU) — servidor público federal | Chamada ao vivo, com chave de API, por CPF do candidato | `/candidato/[id]` — seção "Servidor público federal e remuneração" | `docs/DATA_SOURCES.md` §4 |
| Portal da Transparência (CGU) — Bolsa Família | Chamada ao vivo, com chave de API, por CPF do candidato | `/candidato/[id]` — seção "Benefícios sociais" | `docs/DATA_SOURCES.md` §4 |
| IBGE — Malhas Territoriais | Baixado uma vez, salvo em `public/geo/brasil-uf.json` | `/mapa` | `docs/DATA_SOURCES.md` §4c |
| GitHub (issues/PRs/releases do próprio repositório) | Chamada ao vivo, API pública sem autenticação | `/atualizacoes` | `src/lib/github.ts` |

## Como usar este arquivo

Ao adicionar um dataset novo: (1) confirmar o nome e a origem exata no site de dados abertos do
TSE (nunca assumir formato/nome de coluna sem checar o `leiame` real do dataset — ver o método
já seguido em `docs/DATA_SOURCES.md`), (2) adicionar uma linha aqui assim que o asset existir
numa release ou for commitado, e (3) atualizar a linha para "Ingerido" só depois que o script
correspondente rodar de verdade contra o arquivo real e o resultado for verificado (não marcar
como concluído por suposição).
