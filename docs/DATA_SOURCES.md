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

> **Correção de precisão importante:** a chave (`chave-api-dados`) é **obrigatória para todos os endpoints** de `/api-de-dados/*` — confirmado pelo teste 403 acima em `/pessoa-fisica`, que **não** está na lista de "restritas". O termo "APIs restritas" no site da CGU não significa "as únicas que pedem chave" — significa especificamente **o subconjunto com teto de taxa mais baixo (180/min)**, por lidar com dados individuais de benefícios sociais mais sensíveis. Nenhum dos endpoints usados por este projeto (§4 acima: `peps`, `contratos/cpf-cnpj`, `ceis`, `cnep`, `cepim`, `emendas`, `servidores`, `pessoa-fisica`) está nessa lista restrita — ficam no teto geral de 400–700/min.

Lista completa das "APIs restritas" (180 req/min), nenhuma usada por este projeto:
`despesas/documentos-por-favorecido`, `bolsa-familia-disponivel-por-cpf-ou-nis`, `bolsa-familia-por-municipio`, `bolsa-familia-sacado-por-nis`, `auxilio-emergencial-beneficiario-por-municipio`, `auxilio-emergencial-por-cpf-ou-nis`, `auxilio-emergencial-por-municipio`, `seguro-defeso-codigo`.

Usos acima do limite suspendem o token (a página não especifica por quanto tempo além de "0 hora(s)" exibido no momento da consulta — validar empiricamente antes de definir a agressividade do cache).

### Endpoints relevantes para o cruzamento "bens declarados × dinheiro público recebido"

| Endpoint | Parâmetros principais | Uso |
|---|---|---|
| `GET /api-de-dados/pessoa-fisica` | `cpf` | Registro básico da pessoa física na base da CGU |
| `GET /api-de-dados/peps` | `cpf`, `nome` | **Pessoa Exposta Politicamente** — flag oficial, alto valor para o produto |
| `GET /api-de-dados/servidores` | `cpf`, `nome` | Se o candidato é/foi servidor público federal — remuneração, órgão, cargo |
| `GET /api-de-dados/contratos/cpf-cnpj` | `cpfCnpj`, `pagina` | Contratos federais recebidos pelo candidato ou por empresa dele (cruzar com CNPJ do BrasilAPI) |
| `GET /api-de-dados/emendas` | `nomeAutor`, `ano` | Emendas parlamentares de autoria do candidato, se ele for parlamentar em exercício/anterior — **atenção:** busca por nome textual, não por CPF; requer normalização e checagem manual de ambiguidade |
| `GET /api-de-dados/ceis` | `codigoSancionado` (CPF/CNPJ) | Empresas do candidato com sanções por irregularidade em contrato com a administração pública |
| `GET /api-de-dados/cnep` | `codigoSancionado` (CPF/CNPJ) | Sanções por atos de improbidade/corrupção (Lei Anticorrupção) |
| `GET /api-de-dados/cepim` | `codigoSancionado` | Entidades sem fins lucrativos impedidas de celebrar convênios |
| `GET /api-de-dados/viagens-por-cpf` | `cpf` | Viagens a serviço custeadas pela União, se servidor/agente público |

Todos paginados (`pagina`, padrão `1`), retorno JSON, limite de itens por página não documentado no swagger — a implementação deve tratar paginação até resposta vazia.

---

## 4b. Outras fontes mapeadas (avaliadas e descartadas ou pendentes)

A pedido do usuário, as fontes abaixo foram checadas nesta sessão. Nenhuma delas entra na arquitetura do MVP — os motivos estão registrados para não serem reavaliadas sem necessidade.

| Fonte | O que é | Status do teste | Decisão |
|---|---|---|---|
| **TRE-SP** — `tre-sp.jus.br/.../acesso-automatizado-por-sistemas-externos-webservices-ou-api` | Webservices do TRE de São Paulo | `403 Access Denied`, mesmo bloqueio de edge Akamai do TSE nacional | Mesma rede da Justiça Eleitoral — mesma limitação do §5. Não validado o conteúdo nesta sessão; **não inventar** o que a página descreve até conseguir acessá-la de uma rede não bloqueada. |
| **TRE-SE** — `tre-se.jus.br/.../dados-abertos-e-webservice-e-apis` | Dados abertos/webservices do TRE de Sergipe | `403 Access Denied`, mesmo bloqueio | Idem acima. |
| **Integrador SP.GOV.BR** — API `tse-eleitores` | Canal de integração B2G do governo de SP: "consulta de local de votação, situação eleitoral, quitação eleitoral e crimes eleitorais" | Acessível (200), conteúdo lido | **Fora de escopo por desenho, não por bloqueio técnico.** É um canal credenciado (login gov.br institucional, fluxo "Quero utilizar essa API" atrás de autenticação) para órgãos do governo de SP trocarem dados entre si — não é uma API pública aberta a qualquer aplicação. Usar exigiria convênio institucional que este projeto não tem. |
| **Infosimples** — `tribunal-tse-situacao` | Serviço comercial pago que automatiza consultas ao autoatendimento eleitoral do TSE (situação do título, biometria) | Acessível (200), conteúdo lido | **Fora de escopo por natureza do dado, não por licença.** Consulta **eleitor individual** (situação de título, biometria) para casos de uso de KYC/antifraude — não é dado de candidato, e o produto não coleta CPF de terceiros para esse fim. Serviço pago, sob contrato comercial (não é dado aberto) — não haveria conflito de licença por não ser usado, mas também não teria como ser redistribuído sob CC-BY mesmo que fosse. |
| **Netrin** — `api/tse-titulo-eleitoral` | Serviço comercial pago equivalente ao Infosimples, para compliance/KYC de terceiros | Acessível (200), conteúdo lido | Mesma conclusão do Infosimples: fora de escopo (consulta de eleitor individual para antifraude, não dado de candidato), pago, sem licença de dado aberto. |

## 5. Nota sobre a rede de execução — bloqueio do TSE

Ambos os domínios do TSE (`dadosabertos.tse.jus.br`, `cdn.tse.jus.br`, `divulgacandcontas.tse.jus.br`) retornaram **`403 Access Denied` no edge Akamai** (página de erro do próprio Akamai, referência `errors.edgesuite.net`) a partir do ambiente de execução usado nesta sessão — **não é um erro de aplicação, é bloqueio de WAF antes de chegar ao servidor de origem**, provavelmente por IP de datacenter/nuvem ou geolocalização.

- **BrasilAPI e Portal da Transparência (CGU) não sofreram esse bloqueio** — chegaram normalmente aos respectivos servidores.
- Isso **não invalida a arquitetura documentada aqui** — apenas significa que a **ingestão de dados do TSE precisa rodar de uma rede diferente** da usada por este agente: máquina local do usuário, runner de CI com IP residencial/brasileiro, ou uma função serverless cuja região de saída não esteja na lista de bloqueio do Akamai do TSE (testar Vercel/Cloudflare a partir da região `gru1`/São Paulo antes de assumir que funciona — pode variar).
- **Ação recomendada:** antes do primeiro deploy, rodar manualmente (fora deste ambiente) o teste `curl -I https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2026.zip` a partir do ambiente de produção real (ex.: a função serverless de ingestão) e confirmar `200`. Caso o bloqueio persista, será necessário um proxy/VPN com saída brasileira dedicada à ingestão — não ao tráfego de usuários do site.
- **Confirmado também em produção (20/08/2026, via `GET /api/health` em `eleicoes.metadax.org`, rodando na rede da própria Vercel):** os três domínios do TSE retornam `403` a partir da região de produção também — não é uma limitação exclusiva do ambiente de desenvolvimento desta sessão. BrasilAPI respondeu `200` normalmente na mesma checagem. Isso reforça que a ingestão real precisa rodar de uma rede à parte (máquina local, CI com saída residencial/brasileira), nunca dentro do runtime do site em produção.

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
| Sanções/impedimentos (o candidato ou empresa dele) | Portal da Transparência (`ceis`, `cnep`, `cepim`) | — |
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
| TSE — Dados Abertos (CSV/CDN) | Dado público por força da legislação eleitoral e da Lei de Acesso à Informação (12.527/2011); não foi possível abrir a página de termos específica do TSE nesta sessão (bloqueio de rede, §5) para confirmar um texto de licença explícito | **Sim, com atribuição** — creditar "Fonte: TSE" em toda exibição é a prática segura adotada, independentemente de exigência estrita |
| TSE — DivulgaCandContas (API não oficial) | Mesma origem/natureza de dado do item acima, mas via API não documentada oficialmente pelo TSE (engenharia reversa da comunidade) | **Sim para o dado em si**, com a ressalva de que o *acesso* via API não oficial carrega risco operacional (bloqueio de IP, mudança sem aviso) documentado em `ARCHITECTURE.md` — não é um risco de licença, é um risco de estabilidade |
| BrasilAPI | Código MIT (`github.com/BrasilAPI/BrasilAPI`, confirmado nesta sessão via `LICENSE` do repositório); dado subjacente é registro público da Receita Federal | **Sim, sem restrição** |
| Portal da Transparência (CGU) | Dado governamental aberto, publicado sob a política de dados abertos do Poder Executivo Federal; a chave de API controla *taxa de acesso*, não *direito de uso* do dado retornado | **Sim, com atribuição** — creditar "Fonte: Portal da Transparência/CGU" |
| Design System / Manual de Marca METADAX | Propriedade da METADAX, marca em processo de registro no INPI | **Não coberto pela CC BY do projeto** — logotipo e identidade visual seguem as regras próprias do Manual de Marca (uso autorizado, não licenciamento aberto); o `LICENSE` do repositório deixa essa exceção explícita |

**Conclusão:** nenhuma das fontes efetivamente usadas na arquitetura (TSE, DivulgaCandContas, BrasilAPI, Portal da Transparência) impõe termo incompatível com CC BY 4.0 — não foi necessário trocar de licença. As fontes descartadas em §4b (SP.GOV.BR credenciado, Infosimples, Netrin) não entram na arquitetura, então seus termos comerciais/restritos não se aplicam ao repositório.
