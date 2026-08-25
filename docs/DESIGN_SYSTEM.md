# Identidade visual do projeto

> Guia de identidade visual do **Fato Eleitoral** (nome adotado em 26/08/2026 —
> ver `README.md`, seção "Identidade visual e domínio"), idealizado e mantido
> por Pedro Rosemberg, com o
> [Instituto METADAX de Inovação (IMI)](https://imi.metadax.org) como parceiro
> de apoio institucional. Este documento descreve as decisões de design deste
> produto especificamente — não reproduz nem depende de nenhum manual de
> design interno da METADAX; é autocontido.

## 1. Decisão de neutralidade — a regra que domina todas as outras

Requisito explícito do projeto: **tema claro, predominância de preto e branco, sem cor de identidade partidária** — para não sugerir associação com qualquer partido político. Isso é uma decisão deliberada de produto, não uma limitação técnica: uma ferramenta de transparência eleitoral não pode adotar a paleta de nenhum partido nem repetir o padrão visual (azul institucional, verde/vermelho de aprovação-reprovação) que os próprios partidos usam para se identificar.

**Resolução adotada:** cor nunca é usada para decoração, marca, navegação ou identificação de categoria (cargo/UF/partido) — isso permanece só em preto, branco e cinza, com hierarquia tipográfica, ícone e texto explícito. Há duas exceções deliberadas, e só duas:
1. Um conjunto pequeno e fixo de **quatro cores semânticas de estado** (erro, informativo, sucesso, em progresso — Seção 2), usadas exclusivamente como *feedback funcional* (uma checagem deu certo, algo falhou, uma ação está em andamento) — nunca para diferenciar candidato, partido ou cargo. Mesmo nesses casos, cor nunca aparece sozinha: sempre com ícone de forma distinta + texto.
2. A **logo e o favicon do próprio produto** (`assets/fatoeleitoral.*`, `assets/favicon.*`, ver Seção 1.1) — únicos lugares do site onde cor de marca aparece. Nenhum outro elemento (botão, ícone, gráfico, estado, UI em geral) usa essas cores.

### 1.1. Logo e favicon — cores da bandeira do Brasil (26/08/2026)

A logo e o favicon do Fato Eleitoral (`assets/fatoeleitoral.png`/`.svg`, `assets/favicon.ico`/`.svg`) usam azul, verde e amarelo — as cores da bandeira nacional. Isso é uma decisão consciente do mantenedor, confirmada explicitamente antes de aplicar (ver histórico do PR que introduziu esses arquivos), e uma mudança de postura em relação à marca anterior: o favicon anterior (um ícone de checagem neutro, preto/branco) foi desenhado de propósito para *evitar* qualquer cor institucional/governamental, justamente para não sugerir vínculo com um site oficial do governo. A logo atual assume essa referência deliberadamente — são símbolos nacionais, não a cor de um partido específico, e o uso está **restrito exclusivamente à logo e ao favicon**. Em nenhum outro lugar do produto — botões, gráficos, badges de status, cabeçalhos de seção — essas cores aparecem; a regra de neutralidade cromática do restante do site (Seção 2, Seção 3) continua em vigor sem alteração.

A `SourceMarquee` (`src/components/SourceMarquee.tsx`) usa os logos oficiais de TSE, RFB e CGU como fontes de dado, cada um com suas próprias cores originais — isso não é uma terceira exceção à regra do produto: é atribuição de uma fonte externa (equivalente a citar a imagem oficial de um órgão num artigo), não a identidade visual deste site.

**O que segue o padrão institucional da METADAX, por não ter carga partidária:**
- Tipografia de corpo (Inter)
- Grid, espaçamento e breakpoints do site institucional
- Regras de uso da marca/logotipo (ver Manual de Marca, `metadax.com.br/manual-de-marca`)
- Bloco de rodapé institucional obrigatório (CNPJ, endereço, razão social) — reproduzido como texto estático em `SiteFooter.tsx` (ver nota abaixo sobre por que não vem do CDN)
- Diretrizes de mobile-first, alvos de toque, safe-area

**Decisão registrada:** este projeto tem **zero dependência** do CDN público da METADAX (`cdn.metadax.com.br`) — nem CSS, nem loader, nem header/footer, nem botão de WhatsApp. Não é uma divergência de marca, é confiabilidade: são scripts/CSS de terceiro carregados em tempo de execução, e uma rede lenta ou um bloqueio de `cdn.metadax.com.br` do lado do visitante travava a primeira renderização da página (o `<link rel="stylesheet">` daquele CDN era render-blocking) ou deixava um loader em tela cheia sem nunca resolver. Este produto tem seu próprio Header, SiteFooter e ProjectLoader (splash de entrada curto, não-bloqueante), completos e autocontidos — o bloco legal obrigatório da METADAX está reproduzido como texto estático em `SiteFooter.tsx`, sem nenhuma dependência de rede externa.

## 2. Paleta — tokens usados neste projeto

Tema **claro** apenas.

```css
:root {
  color-scheme: light;

  /* Neutros — única fonte de cor do produto */
  --surface-canvas: #FFFFFF;
  --surface-1: #FAFAFA;
  --surface-2: #F0F0F0;
  --surface-3: #E4E4E4;
  --hairline: rgba(0, 0, 0, 0.08);
  --hairline-strong: rgba(0, 0, 0, 0.16);

  --text-primary: #1E1E1E;
  --text-secondary: rgba(0, 0, 0, 0.80);
  --text-tertiary: rgba(0, 0, 0, 0.48);

  /* Marca — usada SOMENTE no logotipo e no rodapé institucional obrigatório, nunca como cor de ação */
  --metadax-black: #1E1E1E;
  --metadax-white: #FFFFFF;

  /* Ação/interação — preto sobre branco (ou o inverso), nunca azul */
  --action-primary-bg: #1E1E1E;
  --action-primary-fg: #FFFFFF;
  --action-primary-hover: #333333;
  --action-ghost-border: var(--hairline-strong);

  /* Foco — obrigatório por acessibilidade (WCAG), não é cor de marca nem de partido */
  --focus-ring: #1E1E1E;

  --radius-button-sm: 8px;
  --radius-button-md: 10px;
  --radius-button-lg: 12px;
  --radius-card: 18px;

  --shadow-product: rgba(0, 0, 0, 0.16) 3px 5px 30px 0;

  /* Semântica de estado — só feedback funcional, nunca decoração/marca/categoria */
  --color-error: #C4281F;
  --color-error-bg: rgba(196, 40, 31, 0.10);
  --color-info: #0056B3;      /* reaproveita o azul institucional da METADAX — única aparição dele aqui */
  --color-info-bg: rgba(0, 86, 179, 0.08);
  --color-success: #16A34A;
  --color-success-bg: rgba(22, 163, 74, 0.10);
  --color-warning: #B45309;
  --color-warning-bg: rgba(180, 83, 9, 0.10);
}
```

**Regra de uso das quatro cores semânticas — a única exceção à neutralidade:**
- `--color-error` (vermelho): algo falhou — boundary de erro, fonte de dado bloqueada/indisponível, candidatura indeferida/cassada, funcionalidade indisponível.
- `--color-info` (azul): informativo — aviso de dados de exemplo, fonte que precisa de configuração (chave de API), status "sub judice"/pendente.
- `--color-success` (verde): confirmação positiva — fonte operacional, candidatura deferida, funcionalidade disponível.
- `--color-warning` (âmbar/laranja): em progresso — usado especificamente no badge de status de funcionalidade da home (`/`), para "em progresso" (código pronto, aguardando dado real ou configuração externa) — distinto de `--color-info` para não confundir "isto é só um aviso" com "isto está sendo construído".
- **Nunca** para: identificar partido, cargo, UF, navegação, branding, ou qualquer elemento decorativo. Sempre acompanhadas de um ícone com forma distinta (não só a cor muda) e texto explícito — nunca cor sozinha carregando o significado.

**Nota:** a METADAX não tem logotipo exibido no header/footer deste produto — o header mostra a logo do próprio Fato Eleitoral (Seção 1.1), e o footer traz a identificação institucional da METADAX (CNPJ, endereço, razão social) só como texto, sem marca gráfica (ver Seção 7).

## 3. Como o produto usa (ou não) cor por tipo de informação

| Necessidade | Solução neste projeto |
|---|---|
| Situação da candidatura (Deferido/Indeferido/Cassado/etc.) | Badge com ícone (check-circle / x-circle) + texto, na cor semântica correspondente (verde/vermelho/azul) quando o texto do TSE é reconhecido com confiança; texto neutro sem cor quando não é |
| Sinalizar valor financeiro (bens, contratos públicos) | `font-variant-numeric: tabular-nums`, fonte monoespaçada (JetBrains Mono) para todo valor em R$ — sem cor de sinal (não há "positivo/negativo" aqui, só magnitude) |
| Diferenciar cargo/UF/partido na lista de resultados | Tipografia (peso, tamanho) e ícones outline — nunca cor, mesmo semântica; isso não é um "estado", é uma categoria, e categoria não usa cor neste produto |
| Aviso de dados de exemplo / fonte ainda sem configuração | Ícone de informação + texto, fundo `--color-info-bg` |
| Boundary de erro (`error.tsx`) | Ícone de x-circle + texto, na cor `--color-error` |
| Link para site oficial / plano de governo | Sublinhado + ícone de link externo, cor de texto igual ao restante do corpo (`--text-primary`) — não é um estado, não leva cor semântica |
| Status de saúde das fontes (`/status`) | Ícone distinto por estado (check-circle / cadeado / alerta / x-circle) + texto, na cor semântica correspondente |
| Status de funcionalidade na home (`/`) | Badge com ícone + texto: `--color-success` (verde) = disponível, `--color-warning` (âmbar/laranja) = em progresso, `--color-error` (vermelho) = indisponível — mesma regra: nunca cor sozinha |

## 4. Tipografia

| Papel | Tamanho | Peso | Fonte |
|---|---|---|---|
| Hero / título de busca | 40px (mobile: `clamp(28px, 6vw, 40px)`) | 600 | Inter |
| H2 / seção | 32px | 600 | Inter |
| Lead / subtítulo | 24px | 400 | Inter |
| Body | 17px | 400 | Inter |
| Caption / fine print | 14px | 400 | Inter |
| Valor monetário (bens, contratos) | 14–24px conforme contexto | 600 | **JetBrains Mono**, `tabular-nums` — legibilidade numérica, não é decisão de cor |
| Tabelas de dados (lista de candidatos densa) | 12–14px | 400–600 | Geist Sans / Geist Mono, para densidade de dados |
| Logotipo | — | — | Imagem própria (`assets/fatoeleitoral.svg`), não é texto tipografado — ver Seção 1.1 |

## 5. Componentes

- Geometria de botão retangular com cantos arredondados (`--radius-button-*`), sempre preto/branco, nunca azul.
- Sistema de inputs/select/checkbox/radio com focus ring neutro escuro.
- Elevação por cor de superfície, nunca sombra decorativa.
- Header (`Header.tsx`) e footer (`SiteFooter.tsx`) próprios, autocontidos — ver Seção 1 sobre por que não vêm mais do CDN institucional.
- Barra de progresso animada no topo (`TopProgressBar.tsx`) durante navegação entre rotas — feedback de carregamento visível em toda troca de página.

## 6. Mobile-first

- Alvo de toque mínimo `44×44px`, padrão do produto `48×48px`.
- Ação primária de cada tela (ex.: "Buscar", "Ver perfil completo") vive no terço inferior em `≤640px`.
- `font-size` mínimo `16px` em todo campo de busca/filtro, para não disparar zoom automático no iOS.
- Navegação exploratória de conteúdo (não um dashboard de múltiplas seções recorrentes) → menu horizontal simples, colapsável em telas estreitas.
- Skeleton loaders (não spinners) para a lista de candidatos e para dados de enriquecimento (CNPJ, transparência) carregados sob demanda.
- Toda animação respeita `prefers-reduced-motion: reduce` (ver `src/styles/animations.css`).

## 7. Rodapé institucional obrigatório

Bloco institucional da METADAX, reproduzido sem alteração de conteúdo (identidade legal obrigatória da mantenedora):

```
METADAX
METADAX CONSULTORIA LTDA
CNPJ 65.640.808/0001-89
Av. Getúlio Vargas, 671, Sala 500 — Savassi, Belo Horizonte, MG — CEP 30112-021
metadax.com.br
```

Complementado pelo rodapé próprio do produto (`SiteFooter`, ver `src/components/SiteFooter.tsx`), com o mapa do site, os links legais específicos deste projeto (`/privacidade`, `/termos`) e a atribuição ao Instituto METADAX de Inovação (IMI) como parceiro de apoio institucional — não como dono/mantenedor do projeto (ver `/sobre`).
