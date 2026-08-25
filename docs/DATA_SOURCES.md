# Fontes de Dados — eleicoes.metadax.org

> Documento de referência única. Toda integração de dados do projeto deve apontar para aqui.
> Última validação: **20/08/2026**, testada ao vivo a partir do ambiente de execução desta sessão (ver "Nota sobre a rede de execução" abaixo antes de assumir que qualquer chamada funcionará em produção sem ajuste).

## Sumário

1. [TSE — Dados Abertos (CKAN + CDN de CSV)](#1-tse--dados-abertos-ckan--cdn-de-csv)
2. [TSE — DivulgaCandContas (API REST não oficial)](#2-tse--divulgacandcontas-api-rest-não-oficial)
3. [BrasilAPI (Receita Federal / CNPJ / IBGE)](#3-brasilapi-receita-federal--cnpj--ibge)
4. [Portal da Transparência (CGU)](#4-portal-da-transparência-cgu)
4b. [Outras fontes mapeadas (avaliadas e descartadas ou pendentes)](#4b-outras-fontes-mapeadas-avaliadas-e-descartadas-ou-pendentes)
5. [Nota sobre a rede de execução — bloqueio do TSE](#5-nota-sobre-a-rede-de-execução--bloqueio-do-tse)
6. [Matriz de decisão — qual fonte usar para quê](#6-matriz-de-decisão--qual-fonte-usar-para-quê)
7. [Aspectos legais e de LGPD](#7-aspectos-legais-e-de-lgpd)
8. [Licenciamento do repositório — CC BY 4.0](#8-licenciamento-do-repositório--creative-commons-attribution-40)
9. [Revisão de compliance — termos de uso e legislação eleitoral](#9-revisão-de-compliance--termos-de-uso-das-fontesinfraestrutura-e-legislação-eleitoral)

---

## 1. TSE — Dados Abertos (CKAN + CDN de CSV)

**O que é:** portal oficial (`dadosabertos.tse.jus.br`) que substituiu o antigo "Repositório de Dados Eleitorais". É uma instância de CKAN — tem API de catálogo, mas os dados em si são arquivos ZIP/CSV, não JSON paginado.

**Por que usar:** é a fonte primária e correta para "todos os candidatos" — uma única request, base completa, sem risco de rate limit ou bloqueio de IP.

### Catálogo (CKAN Action API)

```
GET https://dadosabertos.tse.jus.br/api/3/action/package_search?q=candidatos+2026
GET https://dadosabertos.tse.jus.br/api/3/action/package_show?id=candidatos-2026
```

Resposta no padrão CKAN: `result.resources[]` com `url`, `format`, `last_modified` de cada arquivo.

### Download direto (CDN — caminho recomendado, mais estável que o CKAN)

```
https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2026.zip
```

Padrão geral: `https://cdn.tse.jus.br/estatistica/sead/odsele/{dataset}/{dataset}_{ano}.zip`

Datasets relevantes para este projeto (mesmo padrão de nome, trocar o dataset):

| Dataset | Conteúdo |
|---|---|
| `consulta_cand` | Candidatos: nome, UF, município, cargo, partido, situação, coligação, redes sociais, e-mail |
| `bem_candidato` | Bens declarados por candidato (descrição genérica + valor, ver §7) |
| `consulta_coligacao` | Composição de coligações/federações |
| `consulta_vagas` | Vagas em disputa por cargo/UF/município |
| `motivo_cassacao` | Motivos de cassação/indeferimento, quando houver |
| `detalhe_votacao_muni_zona` | Resultado por município/zona (pós-eleição, não se aplica antes do pleito) |

### Estrutura do ZIP

Um ZIP por dataset/ano, contendo:
- `consulta_cand_2026_BRASIL.csv` — consolidado nacional (o mais útil para "todos os candidatos")
- `consulta_cand_2026_{UF}.csv` — um arquivo por UF (27 arquivos)
- `leiame.pdf` — dicionário de dados oficial (nomes de coluna, domínios de valor)

**Encoding:** Latin-1 (`ISO-8859-1`), separador `;`. Necessário converter para UTF-8 no pipeline de ingestão.

### Colunas relevantes de `consulta_cand` (conforme leiame.pdf)

`SG_UF`, `NM_UE` (unidade eleitoral/município), `DS_CARGO`, `NM_CANDIDATO`, `NM_URNA_CANDIDATO`, `NR_CANDIDATO`, `SG_PARTIDO`, `NM_PARTIDO`, `NM_COLIGACAO`, `DS_SIT_TOT_TURNO` (situação de totalização), `DS_GENERO`, `DS_GRAU_INSTRUCAO`, `DS_OCUPACAO`, `NR_CPF_CANDIDATO`, `SQ_CANDIDATO` (chave para cruzar com `bem_candidato`).

### Teste realizado nesta sessão

```
$ curl -sSI https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2026.zip
HTTP/2 403 — Access Denied (bloqueio no edge Akamai, não é 404: o recurso existe)
```

Bloqueado a partir do ambiente de execução — ver [§5](#5-nota-sobre-a-rede-de-execução--bloqueio-do-tse). URL e estrutura confirmadas via documentação oficial do TSE e padrão histórico de nomenclatura do CDN (usado desde 2020).

### Datasets adicionais ingeridos em 24/08/2026

Coletados manualmente do site de dados abertos do TSE (mesmo método do §5) e processados por
`scripts/ingest-tse.ts` / `scripts/build-asset-index.ts`:

| Dataset | Formato real | O que vira no produto |
|---|---|---|
| `consulta_cand_complementar` | CSV (`_BRASIL.csv`, mesmo padrão de `consulta_cand`) | Merge direto em `candidatos/{UF}.json`: `tetoGastos` (VR_DESPESA_MAX_CAMPANHA) e `situacaoJulgamento` (DS_SITUACAO_JULGAMENTO — o campo que de fato tem valor antes da eleição; `DS_SIT_TOT_TURNO` só é preenchido depois da apuração, vindo `"#NULO"` até lá) |
| `prestacao_de_contas_eleitorais_candidatos` | ZIP com **4 CSVs empacotados juntos** (receitas, despesas_contratadas, despesas_pagas, receitas_doador_originario) — só os dois primeiros têm `SQ_CANDIDATO` direto | `data/{ano}/financas/{UF}.json` — receitas e despesas contratadas por candidato. despesas_pagas e receitas_doador_originario ficam de fora (exigem join via SQ_DESPESA/SQ_RECEITA, não implementado — ver `/roteiro`) |
| `CNPJ_campanha` | **Arquivo posicional de largura fixa, não CSV** — layout confirmado contra `leiame_cnpj_campanha.pdf` real (SECON/CSELE/STI/TSE, Julho/2016, v1.0.0): registro de 200 colunas, campo 2 (pos. 4-17) = CNPJ, campo 4 (pos. 18-167) = nome fiscal | `data/{ano}/cnpj-campanha.json` — lista solta, **não** cruzada com um candidato específico (o dataset não traz `SQ_CANDIDATO`, só CNPJ + nome fiscal no formato "ELEIÇÃO {ano} {nome} {cargo}"; inferir o candidato por esse nome seria uma correspondência não confiável, então fica de fora do perfil do candidato — ver `CnpjCampanha` em `src/types/candidato.ts`) |
| `foto_cand2026_{UF}_div.zip` (28 arquivos, 1 por UF) | ZIPs de JPEGs, nome `F{UF}{sqCandidato}_div.jpg` | `fotoUrl` em cada candidato — 20.638 fotos, uma para cada candidato do snapshot |
| `proposta_governo_2026_{UF}.zip` (28 arquivos, 1 por UF) | ZIPs de PDFs, nome `{ano}{UF}{sqCandidato}_{NN}.pdf` | `planoGovernoUrls` — 208 candidatos com pelo menos um PDF (a maioria dos candidatos, principalmente os de cargos proporcionais, não é obrigada a enviar um) |

**Hospedagem dos binários (fotos, PDFs):** ~440MB, grande demais para `data/` (que é JSON,
commitado normalmente em `main`) e sem necessidade de um serviço de armazenamento de objetos à
parte — ficam commitados numa branch órfã separada, `assets-tse-2026`, e servidos via
`raw.githubusercontent.com` (testado e funcional). Nenhum arquivo individual passa de ~14MB
(fotos) ou ~10MB (PDFs), bem abaixo do limite de 100MB por arquivo do GitHub. Ver o README da
própria branch `assets-tse-2026` para a estrutura completa.

### Dataset adicional ingerido em 25/08/2026 — `certidao_criminal`

Publicado pelo TSE como release do GitHub (28 ZIPs, um por UF + `BR`) em
`https://github.com/pedrorosemberg/eleicoes.metadax.org/releases/tag/arquivos_de_certidoes_criminais`
— documentos de certidão criminal enviados pelo próprio candidato no registro de candidatura.
Nome de arquivo dentro do ZIP (confirmado contra o `leiame.pdf` real, incluído em cada ZIP):
`{ano}{UF}{sqCandidato}_{sqArquivoDocumento}.pdf.pdf` — `SQ_CANDIDATO` embutido no nome, join
confiável (diferente de `CNPJ_campanha`, que não tem essa chave).

**Tamanho real, confirmado nesta sessão (25/08/2026): ~9,5 GB no total** — muito maior que
fotos+planos de governo (~440MB) juntos, e grande demais para duplicar em qualquer hospedagem
sem custo real de infraestrutura (o padrão usado para fotos/planos, uma branch órfã do
repositório, não é viável nessa escala).

**Decisão de arquitetura: servir sob demanda via HTTP Range, sem duplicar hospedagem.** Os ZIPs
usam o método de compressão **STORE (sem compactação)** — confirmado via `file` nos arquivos
reais ("compression method=store") e via `compMethod=0` em todo entry do central directory.
Isso significa que os bytes de um arquivo dentro do ZIP são idênticos aos do arquivo original —
extrair um entry é só um recorte de bytes, sem descompactar nada. Também confirmado contra os
arquivos reais: o campo de "extra field" do header local de cada entry tem tamanho zero, então o
offset exato de início dos dados é calculável só com o que já vem no central directory (sem
precisar buscar o header local separadamente).

Isso permite: `scripts/ingest-certidoes.ts` lê só o final do ZIP remoto (End Of Central
Directory + central directory completo — algumas dezenas/centenas de KB via HTTP Range, mesmo
num ZIP de mais de 1GB) e grava um índice leve (`data/{ano}/certidoes/{UF}.json`) com o offset e
tamanho exatos de cada documento. `app/api/certidao/[uf]/[candidato]/[arquivo]/route.ts` serve
cada PDF sob demanda com um único Range GET direto no release do GitHub. **Nenhum PDF é baixado
ou duplicado em nenhum outro lugar** — verificado de ponta a ponta nesta sessão (download de um
byte-range específico, servido por uma instância real do Next.js rodando localmente, produzindo
um PDF válido de 1 página, `file` confirmando `PDF document, version 1.4`). Ver
`src/lib/zip-range.ts` para a implementação.

**Falha real encontrada: 6 dos 28 ZIPs estão corrompidos no release** — `BA`, `MG`, `PR`, `RJ`,
`SC` e `SP` não têm um End Of Central Directory válido (confirmado de forma independente com
`unzip -t certidao_criminal_2026_SC.zip`: `"End-of-central-directory signature not found"`). O
header local do início do arquivo é válido (`PK\x03\x04` presente), então é consistente com um
upload incompleto/truncado dessas 6 UFs especificamente — não é um limite de tamanho (`RS`, com
533MB, indexou normalmente; `MG`, com 473MB, falhou). `scripts/ingest-certidoes.ts` detecta e
pula essas UFs sem quebrar a ingestão das demais; a UI (`/candidato/[id]`) informa explicitamente
que a certidão está indisponível **pela UF, não pelo candidato**, até o arquivo ser reenviado.

---

## 2. TSE — DivulgaCandContas (API REST não oficial)

**O que é:** API REST que alimenta o site `divulgacandcontas.tse.jus.br` (consulta individual de candidatos e prestação de contas). **Não é documentada oficialmente pelo TSE** — a documentação usada aqui é a [`augusto-herrmann/divulgacandcontas-doc`](https://github.com/augusto-herrmann/divulgacandcontas-doc), engenharia reversa da comunidade em OpenAPI 3.0.1, validada nesta sessão.

**Quando usar (e quando não usar):** o próprio mantenedor da documentação recomenda — e este projeto adota a mesma regra — **usar o CSV (§1) sempre que possível**. A API é para os dados que o CSV *não* tem: **plano de governo** (arquivo PDF anexado), **redes sociais/sites oficiais**, **fotos** e **histórico de candidaturas anteriores** (`eleicoesAnteriores`) de um candidato específico — exatamente os itens 1 e 5 do escopo deste projeto.

**Restrições importantes:**
- **Sem CORS.** Chamada direto do browser é bloqueada — precisa passar por proxy no backend (ver `ARCHITECTURE.md`).
- **Sem paginação em massa por UF/Brasil.** A API é organizada por **município** — não existe endpoint "listar candidatos do Brasil" ou "listar candidatos da UF X". Confirma por que ela serve para enriquecimento pontual, não para a carga inicial.
- **Sem autenticação, mas sem SLA.** Aplicar intervalo entre requisições (recomendação da doc da comunidade: nunca em loop apertado) para não ter o IP bloqueado.

### Base URL

```
https://divulgacandcontas.tse.jus.br/divulga/rest/v1
```

### Endpoints usados neste projeto

| Endpoint | Uso |
|---|---|
| `GET /eleicao/ordinarias` | Lista eleições disponíveis (para obter o `id` da eleição de 2026) |
| `GET /eleicao/anos-eleitorais` | Lista anos com dados disponíveis |
| `GET /eleicao/listar/municipios/{eleicao}/{municipio}/cargos` | Cargos em disputa num município — necessário para descobrir o código de `cargo` |
| `GET /candidatura/listar/{ano}/{municipio}/{eleicao}/{cargo}/candidatos` | Lista de candidatos de um cargo, num município, numa eleição |
| `GET /candidatura/buscar/{ano}/{municipio}/{eleicao}/candidato/{candidato}` | **Detalhe completo de um candidato** — este é o endpoint-chave do projeto |

O `{municipio}` é o código IBGE/TSE do município (ex.: `35157` = Cananéia/SP); `{eleicao}` é o id retornado por `/eleicao/ordinarias` (não é o ano — ex.: `2030402020` nas eleições municipais de 2020); `{cargo}` é o código retornado por `/eleicao/listar/municipios/.../cargos`.

### Payload do endpoint de detalhe (`candidatura/buscar/.../candidato/{id}`)

Campos confirmados no schema OpenAPI e relevantes para o produto:

```jsonc
{
  "id": 123456,
  "nomeUrna": "...", "nomeCompleto": "...", "numero": 12345,
  "cpf": "...", "dataDeNascimento": 0, "descricaoSexo": "...",
  "descricaoCorRaca": "...", "grauInstrucao": "...", "ocupacao": "...",
  "descricaoEstadoCivil": "...", "nacionalidade": "...",
  "localCandidatura": "...", "ufCandidatura": "...",
  "descricaoSituacao": "...", "fotoUrl": "...",
  "nomeColigacao": "...", "composicaoColigacao": "...",
  "partido": { "numero": 12, "sigla": "...", "nome": "..." },
  "eleicao": { "ano": 2026, "siglaUF": "...", "nomeEleicao": "...", "turno": "..." },
  "emails": ["..."],
  "sites": ["..."],                     // <- link direto ao site oficial (item 1 do escopo)
  "arquivos": [                         // <- plano de governo vive aqui (item 1 do escopo)
    { "idArquivo": 1, "nome": "Plano de Governo", "url": "...", "tipo": "...", "codTipo": "..." }
  ],
  "eleicoesAnteriores": [               // <- histórico de candidaturas (item 5 do escopo)
    { "nrAno": 2022, "cargo": "...", "partido": "...", "situacaoTotalizacao": "...", "local": "...", "txLink": "..." }
  ],
  "gastoCampanha1T": 0, "gastoCampanha2T": 0,
  "dadosConsolidados": { "totalRecebido": 0, "totalFinanceiro": 0 /* prestação de contas */ }
}
```

O campo `arquivos[].codTipo` precisa de mapeamento empírico (não documentado) para identificar qual entrada é especificamente o "Plano de Governo" vs. outros anexos — o pipeline deve inspecionar `nome`/`tipo` como fallback textual.

### Teste realizado nesta sessão

```
$ curl -sSI https://divulgacandcontas.tse.jus.br/divulga/rest/v1/eleicao/ordinarias
HTTP/2 403 — Access Denied (mesmo bloqueio de edge do item 1)
```

Estrutura confirmada via engenharia reversa publicada pela comunidade (repositório citado acima, MIT-compatível, consultado e validado nesta sessão via GitHub raw content — esse acesso funcionou normalmente).

---

## 3. BrasilAPI (Receita Federal / CNPJ / IBGE)

**O que é:** agregador open source e gratuito de várias fontes públicas brasileiras, incluindo dados de CNPJ da Receita Federal. **Único provedor externo dos 4 testado com sucesso total nesta sessão**, sem chave de API.

**Uso no projeto:** enriquecer sigla partidária → dados cadastrais completos do partido (o TSE trata partidos como CNPJ), e permitir consulta de qualquer empresa citada na declaração de bens de um candidato ou em contratos públicos vinculados a ele.

### Endpoint principal

```
GET https://brasilapi.com.br/api/cnpj/v1/{cnpj}
```

### Teste real executado nesta sessão (CNPJ da própria METADAX, usado como caso de validação)

```
$ curl -sS https://brasilapi.com.br/api/cnpj/v1/65640808000189
```

Resposta real obtida (200 OK), campos confirmados em produção:

```json
{
  "cnpj": "65640808000189",
  "razao_social": "METADAX CONSULTORIA LTDA",
  "nome_fantasia": "METADAX CONSULTORIA E SERVICOS",
  "descricao_situacao_cadastral": "ATIVA",
  "data_inicio_atividade": "2026-03-11",
  "cnae_fiscal_descricao": "Comércio varejista de outros produtos não especificados anteriormente",
  "cnaes_secundarios": [ /* 18 CNAEs secundários retornados */ ],
  "logradouro": "GETULIO VARGAS", "numero": "671", "bairro": "SAVASSI",
  "municipio": "BELO HORIZONTE", "uf": "MG", "cep": "30112021",
  "porte": "MICRO EMPRESA", "capital_social": 1000,
  "qsa": [ { "nome_socio": "...", "qualificacao_socio": "Sócio-Administrador", "faixa_etaria": "..." } ]
}
```

**Confirmado:** o payload traz quadro societário (`qsa`) — permite, a partir do CNPJ de uma empresa citada na declaração de bens de um candidato, identificar sócios (potencial conflito de interesse) sem nenhuma chave de API.

### Limite observado

Um segundo teste imediato retornou `429 Too Many Requests` (rate limit não documentado publicamente — provavelmente por IP/janela curta). **Implicação de arquitetura:** cache agressivo é obrigatório (CNPJ muda raramente) — nunca consultar a mesma empresa/partido em cada carregamento de página; usar cache de borda com TTL longo (dias) e revalidação em background.

### Pegadinha confirmada: BrasilAPI bloqueia o User-Agent padrão do Node

Testado e confirmado nesta sessão: uma chamada `fetch()` feita pelo runtime Node/undici (como as Route Handlers do Next.js fazem por padrão) envia `User-Agent: node` — e a BrasilAPI retorna **403** especificamente para esse valor. `curl` (UA `curl/8.x`) e um User-Agent customizado (`eleicoes.metadax.org/1.0 (+https://eleicoes.metadax.org)`) funcionam normalmente (`200`); um UA vazio retorna `429`. **Correção aplicada no código:** todo `fetch` para a BrasilAPI (e, por padronização, para as demais fontes) envia um `User-Agent` explícito — ver `src/lib/http.ts`. Sem esse cabeçalho, o endpoint pareceria "fora do ar" quando na verdade está apenas bloqueando o identificador do cliente.

### Outros endpoints úteis da mesma API (não testados individualmente, mesma base confiável)

| Endpoint | Uso no projeto |
|---|---|
| `GET /api/ibge/municipios/v1/{uf}` | Mapear/validar nomes de município ↔ código TSE/IBGE |
| `GET /api/cep/v2/{cep}` | Geocodificação leve de endereços de comitês/sedes partidárias |
| `GET /api/registrobr/v1/{dominio}` | Validar domínio do site oficial informado pelo candidato (opcional, anti-phishing) |

---

## 4. Portal da Transparência (CGU)

**O que é:** API oficial da Controladoria-Geral da União (`api.portaldatransparencia.gov.br`) — gastos, contratos, sanções e beneficiários de programas sociais do **Poder Executivo Federal**.

**Limitação estrutural a documentar com destaque:** cobre apenas a esfera **federal**. Não tem gastos estaduais/municipais — isso limita o cruzamento para candidatos a cargos estaduais/municipais que nunca tiveram vínculo com a União. Onde aplicável, o produto deve indicar claramente "sem dados federais encontrados" em vez de sugerir ausência de recebimento de dinheiro público de outras esferas.

**Autenticação:** obrigatória, via header `chave-api-dados`. Chave gratuita, cadastro em `https://api.portaldatransparencia.gov.br/swagger-ui.html` → "Solicitar Token de API". **Ação necessária do usuário do projeto:** cadastrar uma chave própria antes do deploy — não incluir a chave no repositório, apenas em variável de ambiente (`PORTAL_TRANSPARENCIA_API_KEY`).

### Teste realizado nesta sessão

```
$ curl -sSI https://api.portaldatransparencia.gov.br/api-de-dados/pessoa-fisica
HTTP/2 403 (CloudFront) — sem corpo, sem chave enviada
```

**Diferente do bloqueio do TSE:** aqui a conexão chegou ao CloudFront da CGU normalmente — é um 403 de autenticação ausente, não um bloqueio de rede. Confirma que, com uma chave válida, este provedor funciona a partir do mesmo ambiente. O `swagger.json` completo (106 endpoints) foi baixado com sucesso de `https://api.portaldatransparencia.gov.br/v3/api-docs`.

### Passo a passo para obter a chave (`chave-api-dados`)

Confirmado em `https://portaldatransparencia.gov.br/api-de-dados/cadastrar-email` (consultado nesta sessão):

1. Acessar a página de cadastro acima e se autenticar via **gov.br**.
2. A autenticação precisa ser de **Nível Verificado (Prata) ou Comprovado (Ouro)** — via banco credenciado, certificado digital ou certificado digital em nuvem — **ou**, na ausência de conta nesse nível, entrar com **CPF/senha com verificação em duas etapas habilitada**.
3. Após autenticar, a CGU **envia a chave por e-mail**, no endereço cadastrado na conta gov.br. Não há geração instantânea na tela — depende do e-mail chegar.
4. Guardar a chave apenas em variável de ambiente do projeto (`PORTAL_TRANSPARENCIA_API_KEY`) — **nunca commitar no repositório**, que é público.

**Limites de taxa confirmados na mesma página** (importante para o cache documentado em `ARCHITECTURE.md` §5):

| Janela | Limite |
|---|---|
| 00:00–06:00 | até 700 requisições/minuto |
| Demais horários | 400 requisições/minuto |
| **"APIs restritas"** (lista abaixo) | 180 requisições/minuto |

> **Correção de precisão importante:** a chave (`chave-api-dados`) é **obrigatória para todos os endpoints** de `/api-de-dados/*` — confirmado pelo teste 403 acima em `/pessoa-fisica`, que **não** está na lista de "restritas". O termo "APIs restritas" no site da CGU não significa "as únicas que pedem chave" — significa especificamente **o subconjunto com teto de taxa mais baixo (180/min)**, por lidar com dados individuais de benefícios sociais mais sensíveis. Nenhum dos endpoints usados por este projeto (§4 acima: `peps`, `contratos/cpf-cnpj`, `ceis`, `cnep`, `emendas`, `servidores`, `pessoa-fisica`) está nessa lista restrita — ficam no teto geral de 400–700/min. (`cepim` não é mais usado — ver nota na linha da tabela abaixo. `bolsa-familia-disponivel-por-cpf-ou-nis`, usado desde 25/08/2026, está sim na lista restrita — ver a linha própria dele.)

Lista completa das "APIs restritas" (180 req/min), nenhuma usada por este projeto:
`despesas/documentos-por-favorecido`, `bolsa-familia-disponivel-por-cpf-ou-nis`, `bolsa-familia-por-municipio`, `bolsa-familia-sacado-por-nis`, `auxilio-emergencial-beneficiario-por-municipio`, `auxilio-emergencial-por-cpf-ou-nis`, `auxilio-emergencial-por-municipio`, `seguro-defeso-codigo`.

Usos acima do limite suspendem o token (a página não especifica por quanto tempo além de "0 hora(s)" exibido no momento da consulta — validar empiricamente antes de definir a agressividade do cache).

### Endpoints relevantes para o cruzamento "bens declarados × dinheiro público recebido"

| Endpoint | Parâmetros principais | Uso |
|---|---|---|
| `GET /api-de-dados/pessoa-fisica` | `cpf` | Registro básico da pessoa física na base da CGU |
| `GET /api-de-dados/peps` | `cpf`, `nome` | **Pessoa Exposta Politicamente** — flag oficial, alto valor para o produto |
| `GET /api-de-dados/servidores` | `cpf`, `nome` | Se o candidato é/foi servidor público federal — situação, órgão, cargo |
| `GET /api-de-dados/servidores/remuneracao` | `cpf`, `mesAno` (obrigatório, um mês por chamada) | Remuneração de um servidor federal num mês específico — usado para tentar os 6 meses mais recentes e mostrar o mais recente com o detalhe (`remuneracoesDTO`) de fato preenchido, não um histórico completo |
| `GET /api-de-dados/bolsa-familia-disponivel-por-cpf-ou-nis` | `codigo` (aceita CPF **ou** NIS, não é `cpf`), `anoMesReferencia` **ou** `anoMesCompetencia` (na prática, um dos dois é obrigatório — testado contra a API real: omitir os dois retorna `400 "Informe ano e mês de competência ou de referência"`, mesmo o swagger marcando ambos como individualmente opcionais), `pagina` | Parcelas do Bolsa Família disponibilizadas ao titular, por CPF — está na faixa de limite mais restrita (180 req/min, ver tabela acima). Sem uma chamada de "histórico completo", o produto consulta os últimos 12 meses em paralelo (mesma janela para todo candidato) |
| `GET /api-de-dados/contratos/cpf-cnpj` | `cpfCnpj`, `pagina` | Contratos federais recebidos pelo candidato ou por empresa dele (cruzar com CNPJ do BrasilAPI) |
| `GET /api-de-dados/emendas` | `nomeAutor`, `ano` | Emendas parlamentares de autoria do candidato, se ele for parlamentar em exercício/anterior — **atenção:** busca por nome textual, não por CPF; requer normalização e checagem manual de ambiguidade |
| `GET /api-de-dados/ceis` | `codigoSancionado` (CPF/CNPJ) | Empresas do candidato com sanções por irregularidade em contrato com a administração pública |
| `GET /api-de-dados/cnep` | `codigoSancionado` (CPF/CNPJ) | Sanções por atos de improbidade/corrupção (Lei Anticorrupção) |
| `GET /api-de-dados/cepim` | `cnpjSancionado` (só CNPJ — confirmado no OpenAPI oficial; **não** aceita `codigoSancionado`, diferente de CEIS/CNEP) | Entidades sem fins lucrativos impedidas de celebrar convênios. **Não usado neste projeto**: candidato pessoa física não tem CNPJ próprio para consultar aqui — ver nota em `buscarResumoTransparencia` (src/lib/enrichment.ts) sobre o bug real que isso causava antes de ser removido (25/08/2026) |
| `GET /api-de-dados/viagens-por-cpf` | `cpf` | Viagens a serviço custeadas pela União, se servidor/agente público |

Todos paginados (`pagina`, padrão `1`), retorno JSON, limite de itens por página não documentado no swagger — a implementação deve tratar paginação até resposta vazia.

**Nomes de campo confirmados em duas etapas (25/08/2026):** primeiro contra o OpenAPI oficial real
(`curl` direto em `https://api.portaldatransparencia.gov.br/v3/api-docs`, schemas
`BeneficiarioDTO`, `MunicipioDTO`, `ServidorAposentadoPensionistaDTO`, `RemuneracaoDTO` etc.) —
sem chave disponível nesta sessão de desenvolvimento para testar, mas o contrato publicado
oficialmente pela CGU, não uma suposição. Depois, **com uma chamada autenticada real em
produção** (a chave configurada na Vercel, via um deploy de diagnóstico temporário que logou o
corpo bruto da resposta), dois problemas reais foram encontrados e corrigidos:

1. `bolsa-familia-disponivel-por-cpf-ou-nis` retornou `400 {"Erro na API":"Informe ano e mês de
   competência ou de referência."}` quando chamado só com `codigo` — o swagger marca
   `anoMesReferencia`/`anoMesCompetencia` como individualmente opcionais, mas na prática pelo
   menos um é obrigatório. Corrigido consultando os últimos 12 meses em paralelo (ver função
   abaixo).
2. `servidores/remuneracao` retornou um item com `remuneracoesDTO: []` (detalhe do mês vazio —
   folha ainda não publicada) para o mês mais recente tentado; o código checava só o tamanho do
   array externo (sempre 1 quando o CPF é encontrado), então "achava" um resultado vazio e parava
   de procurar em meses anteriores, gravando `R$ 0,00`. Corrigido para checar o array de detalhe
   e continuar tentando meses anteriores até achar um com dado real.
3. Num mês com dado real, `valorTotalRemuneracaoAposDeducoes` veio como **string em formato
   brasileiro** (`"18.290,81"` — ponto de milhar, vírgula decimal), não como número JSON — um
   segundo teste real (após corrigir o item 2) mostrou o valor virando `R$ NaN` na UI.
   `Number("18.290,81")` não funciona; corrigido com `parseValorMonetarioBR()` (remove pontos,
   troca vírgula por ponto). Vale como alerta geral: campos monetários desta API específica
   (`servidores/remuneracao`) não seguem o mesmo padrão que os outros endpoints usados neste
   projeto (que devolvem número nativo) — não assumir sem checar contra uma resposta real.

`src/lib/enrichment.ts#buscarBeneficiosSociais`/`buscarServidorPublico` refletem a versão
corrigida.

**Decisão deliberada: `bolsa-familia-disponivel-por-cpf-ou-nis` e `servidores` NÃO entram no
proxy público `/api/transparencia/[tipo]`** (o que aceita um `cpf` arbitrário de qualquer
consumidor externo, CORS aberto). Diferente de PEP/contratos/sanções — que dizem respeito a
pessoas com dever de prestar contas públicas —, benefício social e remuneração de servidor são
dados de CPF de pessoas comuns; abrir isso como proxy genérico tornaria o site uma ferramenta de
consulta em massa por CPF, muito além do propósito do produto (perfil de um candidato específico,
cujo CPF já vem do próprio TSE). Essas duas funções ficam só server-side, chamadas com o CPF já
conhecido de um candidato específico — mesmo tratamento já dado a `contratos/cpf-cnpj`.

---

## 4b. Outras fontes mapeadas (avaliadas e descartadas ou pendentes)

A pedido do usuário, as fontes abaixo foram checadas nesta sessão. Nenhuma delas entra na arquitetura do produto — os motivos estão registrados para não serem reavaliadas sem necessidade.

| Fonte | O que é | Status do teste | Decisão |
|---|---|---|---|
| **TRE-SP** — `tre-sp.jus.br/.../acesso-automatizado-por-sistemas-externos-webservices-ou-api` | Webservices do TRE de São Paulo | `403 Access Denied`, mesmo bloqueio de edge Akamai do TSE nacional | Mesma rede da Justiça Eleitoral — mesma limitação do §5. Não validado o conteúdo nesta sessão; **não inventar** o que a página descreve até conseguir acessá-la de uma rede não bloqueada. |
| **TRE-SE** — `tre-se.jus.br/.../dados-abertos-e-webservice-e-apis` | Dados abertos/webservices do TRE de Sergipe | `403 Access Denied`, mesmo bloqueio | Idem acima. |
| **Integrador SP.GOV.BR** — API `tse-eleitores` | Canal de integração B2G do governo de SP: "consulta de local de votação, situação eleitoral, quitação eleitoral e crimes eleitorais" | Acessível (200), conteúdo lido | **Fora de escopo por desenho, não por bloqueio técnico.** É um canal credenciado (login gov.br institucional, fluxo "Quero utilizar essa API" atrás de autenticação) para órgãos do governo de SP trocarem dados entre si — não é uma API pública aberta a qualquer aplicação. Usar exigiria convênio institucional que este projeto não tem. |
| **Infosimples** — `tribunal-tse-situacao` | Serviço comercial pago que automatiza consultas ao autoatendimento eleitoral do TSE (situação do título, biometria) | Acessível (200), conteúdo lido | **Fora de escopo por natureza do dado, não por licença.** Consulta **eleitor individual** (situação de título, biometria) para casos de uso de KYC/antifraude — não é dado de candidato, e o produto não coleta CPF de terceiros para esse fim. Serviço pago, sob contrato comercial (não é dado aberto) — não haveria conflito de licença por não ser usado, mas também não teria como ser redistribuído sob CC-BY mesmo que fosse. |
| **Netrin** — `api/tse-titulo-eleitoral` | Serviço comercial pago equivalente ao Infosimples, para compliance/KYC de terceiros | Acessível (200), conteúdo lido | Mesma conclusão do Infosimples: fora de escopo (consulta de eleitor individual para antifraude, não dado de candidato), pago, sem licença de dado aberto. |

## 4c. IBGE — Malhas Territoriais (fronteiras dos estados, para o mapa)

`GET https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/vnd.geo+json&intrarregiao=UF` — API pública de dados abertos do IBGE, **sem chave**, sem bloqueio de rede (testado e confirmado nesta sessão — diferente do TSE, este domínio não sofre o bloqueio Akamai). Retorna um `FeatureCollection` GeoJSON com as 27 unidades federativas; cada `feature.properties` só tem `codarea` (código de área do IBGE, ex. `"35"` = SP) — o mapeamento `codarea → sigla de UF` está hardcoded em `src/lib/geo.ts` (códigos oficiais do IBGE, estáveis, não mudam entre execuções).

- **Uso no projeto:** baixado uma vez nesta sessão e salvo em `public/geo/brasil-uf.json` (~1MB, servido como asset estático — Vercel/browsers comprimem isso para bem menos na rede). Consumido por `src/components/BrazilHeatmap.tsx` (Leaflet) para o mapa coroplético de `/mapa`.
- **Licença:** dado aberto de órgão público federal (IBGE) — mesmo regime de dados governamentais do TSE/CGU, compatível com a CC BY 4.0 do repositório (§8).
- **Atualização:** fronteiras estaduais do Brasil não mudam com frequência; não há necessidade de reingestão periódica como no caso dos candidatos. Se precisar atualizar, repetir o `curl` acima e sobrescrever `public/geo/brasil-uf.json`.

## 5. Nota sobre a rede de execução — bloqueio do TSE

Ambos os domínios do TSE (`dadosabertos.tse.jus.br`, `cdn.tse.jus.br`, `divulgacandcontas.tse.jus.br`) retornaram **`403 Access Denied` no edge Akamai** (página de erro do próprio Akamai, referência `errors.edgesuite.net`) a partir do ambiente de execução usado nesta sessão — **não é um erro de aplicação, é bloqueio de WAF antes de chegar ao servidor de origem**, provavelmente por IP de datacenter/nuvem ou geolocalização.

- **BrasilAPI e Portal da Transparência (CGU) não sofreram esse bloqueio** — chegaram normalmente aos respectivos servidores.
- Isso **não invalida a arquitetura documentada aqui** — apenas significa que a **ingestão de dados do TSE precisa rodar de uma rede diferente** da usada por este agente: máquina local do usuário, runner de CI com IP residencial/brasileiro, ou uma função serverless cuja região de saída não esteja na lista de bloqueio do Akamai do TSE (testar Vercel/Cloudflare a partir da região `gru1`/São Paulo antes de assumir que funciona — pode variar).
- **Ação recomendada:** antes do primeiro deploy, rodar manualmente (fora deste ambiente) o teste `curl -I https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2026.zip` a partir do ambiente de produção real (ex.: a função serverless de ingestão) e confirmar `200`. Caso o bloqueio persista, será necessário um proxy/VPN com saída brasileira dedicada à ingestão — não ao tráfego de usuários do site.
- **Confirmado também em produção (20/08/2026, via `GET /api/health` em `eleicoes.metadax.org`, rodando na rede da própria Vercel):** os três domínios do TSE retornam `403` a partir da região de produção também — não é uma limitação exclusiva do ambiente de desenvolvimento desta sessão. BrasilAPI respondeu `200` normalmente na mesma checagem. Isso reforça que a ingestão real precisa rodar de uma rede à parte (máquina local, CI com saída residencial/brasileira), nunca dentro do runtime do site em produção.
- **Tentativas de contornar o bloqueio (20/08/2026), todas sem sucesso:** trocar o `User-Agent` padrão por uma string de navegador real (Chrome/Windows) + `Accept`/`Accept-Language` de navegador — mesmo resultado, `403 Access Denied` do Akamai, inclusive em `cdn.tse.jus.br` (não só nos endpoints de API). Isso descarta a hipótese de estar faltando uma chave de API ou um header específico — diferente da BrasilAPI (que exigia só um `User-Agent` não-genérico, ver nota abaixo) e do Portal da Transparência (que exige `chave-api-dados`), o bloqueio do TSE é por IP/rede na borda, antes de qualquer lógica de autenticação da aplicação. Não há "configuração adicional" do lado do cliente que resolva isso — só rodar de uma rede diferente (ver ação recomendada acima).
- **Confirmado que uma rede comum funciona (20/08/2026):** de uma rede residencial/comum (não datacenter), tanto `GET https://dadosabertos.tse.jus.br/api/3/action/package_search?...` quanto o download de `consulta_cand_2026.zip` retornaram `200` normalmente — o bloqueio é específico de certas redes de datacenter/nuvem (onde este agente roda), não do TSE em geral nem do usuário. O ZIP baixado dessa forma foi usado para rodar a ingestão real (`npm run ingest -- --from-dir=...`) e o resultado (`data/2026/candidatos/*.json`, 20.638 candidatos reais em 28 unidades eleitorais — as 27 UFs + `BR`, usada pelo TSE para presidente/vice) está commitado no repositório. `bem_candidato_2026.zip` ainda não foi obtido — `data/2026/bens/` continua ausente, e o site cai para a amostra apenas nessa seção (rotulada como tal), nunca nos dados de candidato em si.
- **Hipótese de token CSRF testada e descartada (20/08/2026):** o HTML de `dadosabertos.tse.jus.br/dataset/candidatos-2026` (CKAN) traz um `<meta name="_csrf_token">` — testamos explicitamente se enviá-lo (como cookie `_csrf_token=...` e como header `X-CSRF-Token`) mudaria o resultado do bloqueio, a partir do mesmo ambiente que recebe 403. Resultado: **nenhuma diferença** — os três testes (sem token, com token via cookie, com token via header) retornaram exatamente o mesmo `403`, mesmo `content-length: 464`, mesmo corpo (`errors.edgesuite.net`, referência do próprio Akamai). Isso é esperado tecnicamente: um token CSRF protege formulários/ações autenticadas de uma aplicação (aqui, o CKAN) contra requisições forjadas — ele é validado *dentro* da aplicação, depois que a requisição já passou pela borda. O bloqueio observado acontece *antes* disso, no WAF/edge da Akamai, que nunca chega a repassar a requisição para o CKAN nem para o servidor estático que serve os ZIPs (`cdn.tse.jus.br` nem tem CKAN — é um file server simples atrás do mesmo edge). Conclusão: **não há token, chave ou header que resolva isso a partir de uma rede já bloqueada** — a única forma que funcionou (ver item acima) foi trocar de rede.
- **Achado ao validar o ZIP real:** a coluna `CD_MUNICIPIO` (usada por `scripts/ingest-tse.ts` para montar a URL do DivulgaCandContas) **não existe** em `consulta_cand` para eleições de abrangência estadual/federal (governador, senador, deputados, presidente) — só `SG_UE`/`NM_UE`, que aqui equivalem à UF, não a um município. O script foi corrigido para não inventar esse campo; o parâmetro `{municipio}` correto para candidaturas desse tipo no DivulgaCandContas ainda não foi determinado (provavelmente existe de verdade só para eleições municipais — vereador/prefeito). Até isso ser confirmado, o enriquecimento ao vivo via DivulgaCandContas (site oficial, plano de governo, histórico) fica desativado para os candidatos deste snapshot — degrada graciosamente, não quebra a página.

---

## 6. Matriz de decisão — qual fonte usar para quê

| Necessidade do produto | Fonte primária | Fonte de enriquecimento |
|---|---|---|
| Lista completa de candidatos (nome, UF, cidade, partido, cargo) | TSE CSV (`consulta_cand`) | — |
| Link para site oficial / redes sociais do candidato | DivulgaCandContas (`sites`, campo não presente no CSV) | — |
| Plano de governo (PDF) | DivulgaCandContas (`arquivos[]`) | — |
| Dados cadastrais do partido (CNPJ, endereço, dirigentes) | BrasilAPI CNPJ | TSE (nome/sigla como chave de busca) |
| Bens declarados pelo candidato | TSE CSV (`bem_candidato`) | — |
| Empresas citadas nos bens → sócios/situação cadastral | BrasilAPI CNPJ | — |
| Dinheiro público federal recebido pelo candidato/empresa dele | Portal da Transparência (`contratos/cpf-cnpj`, `emendas`) | BrasilAPI (para obter CNPJ de empresas ligadas) |
| Status de Pessoa Exposta Politicamente | Portal da Transparência (`peps`) | — |
| Sanções/impedimentos (o candidato) | Portal da Transparência (`ceis`, `cnep`) | — (`cepim` não se aplica a pessoa física, ver §4) |
| Histórico de candidaturas/mandatos anteriores | DivulgaCandContas (`eleicoesAnteriores`) | TSE CSV de anos anteriores (mesmo padrão de URL, trocar o ano) |

---

## 7. Aspectos legais e de LGPD

- **Bens declarados:** desde 2022, por interpretação da LGPD pelo próprio TSE, os candidatos declaram apenas **descrição genérica** do bem ("veículo", "imóvel", "aplicação financeira") — não endereço, placa ou identificação específica. Os **valores em R$ continuam completos e públicos**. O produto não deve prometer detalhamento que o dado de origem não tem.
- **CPF:** o TSE expõe CPF do candidato nos seus próprios dados (é informação pública por força de lei eleitoral, já que o candidato é agente público em potencial). O produto pode exibi-lo ou usá-lo internamente para cruzamento, mas deve evitar expor CPF de terceiros (ex.: sócios de empresas via BrasilAPI) além do estritamente necessário para o cruzamento de transparência — mascarar quando exibido em UI, seguindo o próprio padrão que a BrasilAPI já usa (`***325196**`).
- **Finalidade:** toda a base legal de uso aqui é transparência de agentes públicos/candidatos, dado de interesse público nos termos da Lei de Acesso à Informação (Lei 12.527/2011) e da legislação eleitoral — não se aplica a dados de eleitores ou de terceiros não-candidatos além do necessário para o cruzamento (sócios de empresas, autores de emendas).
- **Atualização:** os dados do TSE mudam a cada hora durante o período de julgamento de registros (o registro de candidaturas de 2026 encerrou em 15/08/2026, e recursos/impugnações continuam sendo julgados). Um snapshot de CSV baixado hoje envelhece — o pipeline de ingestão deve rodar em cadência definida (ver `ARCHITECTURE.md`), e a UI deve exibir a data/hora do último snapshot com destaque.

## 8. Licenciamento do repositório — Creative Commons Attribution 4.0

Decisão do projeto: o conteúdo original deste repositório (documentação, textos de UI, e os JSON derivados gerados pelo pipeline de ingestão) é licenciado sob **[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)** — [definição aberta em opendefinition.org/licenses/cc-by](https://opendefinition.org/licenses/cc-by/). Ver `LICENSE` na raiz do repositório.

**Nota técnica sobre o alcance dessa escolha:** CC BY 4.0 é uma licença de *conteúdo/dados*, não uma licença de software (o padrão para código costuma ser MIT/Apache-2.0, que tratam de patentes e distribuição de binários de um jeito que licenças Creative Commons explicitamente não cobrem — a própria Creative Commons recomenda não usar CC para software). Este projeto aplica CC BY 4.0 porque seu produto principal é dado público tratado e documentação, não uma biblioteca de software para reuso por terceiros — mas o código-fonte em si (os arquivos `.ts`/`.tsx`) fica coberto pela mesma licença por decisão explícita do mantenedor, com a ressalva acima registrada para quem for reutilizar especificamente o código.

### Compatibilidade verificada com cada fonte usada

| Fonte | Natureza da licença/termo | Compatível com CC BY 4.0? |
|---|---|---|
| TSE — Dados Abertos (CSV/CDN) | **Confirmado diretamente no metadado CKAN do próprio TSE** (`package_search`, 20/08/2026): `"isopen": true, "license_id": "cc-by", "license_title": "Creative Commons Atribuição", "license_url": "http://www.opendefinition.org/licenses/cc-by"` — presente nos dois datasets usados (`candidatos-2026` e `prestacao-de-contas-eleitorais-2026`). Também amparado pela legislação eleitoral e pela Lei de Acesso à Informação (12.527/2011) | **Sim, com atribuição** — creditar "Fonte: TSE" em toda exibição, exigência explícita da própria licença CC BY do dataset |
| TSE — DivulgaCandContas (API não oficial) | Mesma origem/natureza de dado do item acima, mas via API não documentada oficialmente pelo TSE (engenharia reversa da comunidade) | **Sim para o dado em si**, com a ressalva de que o *acesso* via API não oficial carrega risco operacional (bloqueio de IP, mudança sem aviso) documentado em `ARCHITECTURE.md` — não é um risco de licença, é um risco de estabilidade |
| BrasilAPI | Código MIT (`github.com/BrasilAPI/BrasilAPI`, confirmado nesta sessão via `LICENSE` do repositório); dado subjacente é registro público da Receita Federal | **Sim, sem restrição** |
| Portal da Transparência (CGU) | Dado governamental aberto, publicado sob a política de dados abertos do Poder Executivo Federal; a chave de API controla *taxa de acesso*, não *direito de uso* do dado retornado | **Sim, com atribuição** — creditar "Fonte: Portal da Transparência/CGU" |
| Design System / Manual de Marca METADAX | Propriedade da METADAX, marca em processo de registro no INPI | **Não coberto pela CC BY do projeto** — logotipo e identidade visual seguem as regras próprias do Manual de Marca (uso autorizado, não licenciamento aberto); o `LICENSE` do repositório deixa essa exceção explícita |

**Conclusão:** nenhuma das fontes efetivamente usadas na arquitetura (TSE, DivulgaCandContas, BrasilAPI, Portal da Transparência) impõe termo incompatível com CC BY 4.0 — não foi necessário trocar de licença. As fontes descartadas em §4b (SP.GOV.BR credenciado, Infosimples, Netrin) não entram na arquitetura, então seus termos comerciais/restritos não se aplicam ao repositório.

---

## 9. Revisão de compliance — termos de uso das fontes/infraestrutura e legislação eleitoral

Revisão feita a pedido do usuário em 20/08/2026, às vésperas do período eleitoral de 2026 —
objetivo: confirmar que nada no projeto infringe termo de uso de fonte/infraestrutura, nem
legislação eleitoral. Pesquisa real feita nesta sessão (busca + leitura direta das páginas
oficiais, quando acessíveis); onde uma página estava bloqueada pela mesma rede que bloqueia o
TSE (ver §5), a informação foi cruzada com fonte primária alternativa (ex.: metadado CKAN do
próprio TSE, já citado na tabela acima).

### 9.1 Fontes de dados

- **TSE:** CC BY, confirmado no metadado do próprio dataset (ver tabela §8) — permite uso livre
  com atribuição, inclusive redistribuição num site de terceiro. Nenhuma cláusula encontrada
  proibindo cruzamento com outras bases públicas.
- **Portal da Transparência (CGU):** o [Termo de Uso oficial](https://portaldatransparencia.gov.br/termos-de-uso)
  (lido nesta sessão) declara explicitamente: *"O acesso ao Portal não requer usuário nem senhas,
  sendo permitido a qualquer cidadão navegar pelas páginas de forma livre, bem como visualizar e
  utilizar os dados disponíveis da forma que melhor lhe convier."* Rege-se pela Lei de Acesso à
  Informação (12.527/2011). A chave de API (`chave-api-dados`) controla taxa de acesso, não
  direito de uso do dado — mesma leitura já registrada em §8.
- **Receita Federal (via BrasilAPI):** BrasilAPI é MIT, dado subjacente é registro público —
  já confirmado em §8, sem achado novo.

### 9.2 Legislação eleitoral (Lei nº 9.504/1997 — Lei das Eleições)

Pesquisa feita sobre propaganda eleitoral na internet e divulgação de dados de candidatos por
terceiros. Achados relevantes:

- **Não é propaganda eleitoral.** Os arts. 57-A a 57-D da Lei 9.504/1997 regulam propaganda
  eleitoral na internet — conteúdo que promove ou ataca uma candidatura, ou impulsionamento pago.
  Este projeto não promove, não ataca, não ranqueia e não recomenda nenhum candidato: apenas
  exibe dado público já divulgado oficialmente pelo TSE, sem juízo de valor (regra de design já
  documentada em `DESIGN_SYSTEM.md` §1 — neutralidade político-partidária). Não veicula anúncio
  pago, não aceita patrocínio de campanha, não faz impulsionamento de conteúdo. Por essas
  características, não se enquadra na definição de propaganda eleitoral da lei.
- **Dados públicos por decisão do próprio TSE.** Decisão do TSE de 18/08/2022 (localizada nesta
  pesquisa) afirma que informações como gênero, raça/cor, estado civil, nacionalidade,
  escolaridade, ocupação e partido/coligação/federação devem permanecer públicas, por afetarem a
  decisão do eleitor — o núcleo exato do que este projeto exibe. Em contrapartida, dados de
  contato pessoal (endereço residencial completo, telefone e e-mail pessoal) devem ser ocultados
  por segurança do candidato — este projeto nunca exibiu esses campos (não fazem parte do modelo
  de dados em `src/types/candidato.ts`).
- **Bens declarados.** A Resolução TSE nº 23.609/2019 já estabelece que a declaração de bens é
  simplificada (sem endereço de imóvel, placa de veículo etc.) — o próprio dado de origem já
  vem nesse formato reduzido; o projeto não promete nem tenta reconstruir detalhamento que a
  fonte não tem (documentado em §7 acima).
- **Vedação de desinformação (art. 57-D, estendido por jurisprudência a usuários identificados).**
  Reforça a regra já adotada de nunca alterar, reinterpretar ou complementar com texto gerado o
  dado oficial — cada informação exibida é a mesma do TSE/CGU, com a fonte sempre citada (ver
  `/termos`).

**Conclusão 9.2:** não foi encontrado risco de enquadramento como propaganda eleitoral irregular
ou desinformação, dado o desenho não-partisan, não-comercial e estritamente informativo do
projeto — mantendo essas características (nunca aceitar patrocínio político, nunca ranquear
candidatos, sempre citar a fonte) como requisito permanente, não só de lançamento.

### 9.3 Infraestrutura e ferramentas (Vercel, GitHub)

- **Vercel — [Acceptable Use Policy](https://vercel.com/legal/acceptable-use-policy)** (lida
  nesta sessão): a única cláusula que menciona eleições está na seção 3 ("Artificial Intelligence
  Services") e proíbe usar os **produtos de IA da própria Vercel** (AI Gateway, v0 etc.) para
  criar/transmitir conteúdo destinado a campanhas eleitorais. **Não se aplica a este projeto** —
  a Vercel aqui hospeda uma aplicação Next.js padrão (funções serverless, CDN, Analytics), sem
  usar nenhum produto de IA da Vercel; o Claude (ver 9.4) é uma ferramenta de desenvolvimento
  externa, não um "AI Service" da Vercel. A cláusula geral contra scraping/automação
  (`"Scrape, proxy, act as a VPN..."`, seção 2) refere-se a não abusar da infraestrutura/site da
  própria Vercel — não restringe o que a aplicação hospedada faz com fontes de terceiros; mesmo
  assim, o projeto já roda a ingestão do TSE **fora** do runtime de produção por design (ver
  `ARCHITECTURE.md` §4), o que evita qualquer leitura possível de "scraping em produção".
- **GitHub — [Termos de Serviço](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service)**,
  seção H ("API Terms") (lida nesta sessão): uso normal da API pública para desenvolvimento ou
  coleta de dados é explicitamente permitido; só proíbe abuso/volume excessivo, revenda dos dados
  de usuários do GitHub para fins de spam (recrutamento etc.) e compartilhamento de token para
  burlar limite de taxa. A página `/atualizacoes` (ver `src/lib/github.ts`) consulta a API pública
  do repositório sem autenticação, cacheada por 10 minutos — uso de leitura de baixo volume, bem
  dentro do permitido.

### 9.4 Uso de IA no desenvolvimento

Registrado por transparência (e agora também em `/termos`): partes do código, documentação e
scripts de ingestão deste projeto foram desenvolvidas com apoio do **Claude, da Anthropic**, como
ferramenta de programação assistida por um mantenedor humano que revisa e decide o que é
publicado. A IA não seleciona, edita ou interpreta o conteúdo dos dados de candidatos exibidos —
esses vêm sempre da fonte oficial, sem alteração. Esse uso está fora do escopo de qualquer
cláusula sobre "AI Services" das políticas revisadas acima (que tratam de produtos de IA
oferecidos *pelos próprios provedores de infraestrutura* — Vercel, TSE, CGU —, não de ferramentas
de desenvolvimento usadas pela equipe do projeto).

---

## 10. Neutralidade e linguagem — categorias sensíveis

Regra permanente para qualquer texto (rótulo, mensagem de "sem dado", nota de rodapé, texto de
ajuda) que apareça perto de bens, finanças de campanha, certidões criminais, remuneração/cargo de
servidor público ou benefícios sociais: **descrever o fato, nunca interpretá-lo.** Nenhuma frase
deste produto deve dar a entender que um dado é bom, ruim, suspeito ou meritório para o candidato
— nem por adjetivo explícito, nem por tom, nem por omissão seletiva (mostrar um dado "positivo"
com destaque e um "negativo" com hedge, por exemplo). Aplica-se com o mesmo rigor a todos os
partidos e todos os candidatos — nenhuma categoria de informação é exibida para uns e omitida
para outros por conveniência editorial.

Exemplos concretos já aplicados no código (ver `app/candidato/[id]/page.tsx`):

- **Certidões criminais:** o produto expõe a existência e o link do PDF oficial tal como
  publicado pelo TSE — nunca lê, resume, classifica ou comenta o conteúdo do documento. Um
  candidato sem certidão anexada não é descrito como "limpo"; um candidato com uma certidão
  anexada não é descrito como tendo algo a esconder. A frase usada é neutra por design: "Nenhuma
  certidão criminal consta anexada... até a data da coleta" (fato sobre o dado disponível, não
  sobre o candidato).
- **Benefícios sociais (Bolsa Família):** receber ou não receber é dado de política pública,
  público por força da Lei de Acesso à Informação (12.527/2011) exatamente pelo mesmo princípio
  que torna público um contrato ou uma remuneração de servidor — não é um indicador de mérito ou
  demérito. A seção do produto declara isso explicitamente no texto de fonte, para que o contexto
  não dependa da interpretação de quem lê.
- **Servidor público federal:** "é/foi servidor público" é descrito como um fato de cadastro
  (situação, cargo, órgão), sem qualificação de valor. O produto não infere nem insinua conflito
  de interesse — se um usuário quiser tirar essa conclusão, os fatos brutos estão lá para isso,
  mas o produto não a redige por ele.
- **Toda categoria vazia informa o motivo real, nunca um espaço em branco.** Um bem, uma
  despesa, um plano de governo ou uma certidão ausente é sempre um destes dois casos, e o texto
  precisa deixar claro qual: (a) **fato confirmado** — a fonte foi consultada e retornou "nada
  encontrado" (ex.: "Nenhum bem declarado encontrado para este candidato"); ou (b) **fonte
  indisponível** — a consulta não pôde ser feita (ex.: sem CPF no dado de origem, ZIP de origem
  corrompido, API fora do ar). Tratar (b) como se fosse (a) é o erro mais fácil de cometer aqui
  e o mais enganoso para quem lê — parece "não tem nada" quando na verdade é "não sabemos".
