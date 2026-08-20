# Design System do projeto — adaptação do METADAX v2

> Fonte: Design System METADAX v2 (`https://cdn.metadax.com.br/design/v2/global-design-system.md`, consultado e validado nesta sessão em 20/08/2026) e Manual de Marca METADAX (`https://www.metadax.com.br/manual-de-marca`).
> Este documento registra **o que foi herdado sem alteração** e **o que foi deliberadamente restringido** para este projeto — e por quê.

## 1. Decisão de neutralidade — a regra que domina todas as outras

Requisito explícito do projeto: **tema claro, predominância de preto e branco, sem azul, verde, amarelo ou vermelho** — para não sugerir associação com qualquer partido político.

Isso entra em tensão direta com o próprio Design System v2 da METADAX, que define:
- `--metadax-blue` (`#0056B3`) como cor institucional primária e única cor de CTA/ação em todo o sistema;
- `--metadax-red` (`#FF4A3D`) como acento de "novidade";
- uma paleta semântica completa (`--color-success` verde, `--color-warning` amarelo, `--color-error` vermelho, `--color-info` azul) para estados do sistema.

**Resolução adotada — e é uma decisão deliberada, não um esquecimento:** este projeto usa **apenas a escala de neutros** do Design System (pretos, brancos, cinzas — Seção 2.6 e 2.5 do v2, variante *light*), e substitui toda comunicação que o v2 resolveria por cor por **hierarquia tipográfica, ícone, borda e texto explícito**. Onde o v2 diria "vermelho = erro", este projeto usa um ícone de alerta + texto + peso de fonte, nunca hue. É a mesma exigência de acessibilidade que o próprio v2 já impõe em outro contexto ("nenhuma informação comunicada apenas por cor", Seção 11.6) — aqui apenas se estende essa regra para cobrir também a cor de marca, e não somente estados de erro.

**O que continua igual ao v1/v2 institucional, sem alteração**, por não ter carga partidária:
- Tipografia (Audiowide no logotipo, Inter no restante — Seção 4)
- Grid, espaçamento, breakpoints institucionais (Seção 7, Seção 9 do v1: `419/640/735/833/1068/1440`)
- Regras de uso da marca/logotipo (Seção 10)
- Bloco de rodapé institucional obrigatório (Seção 15 — CNPJ, endereço, razão social)
- Header/footer/loader centralizados via CDN (Seção 6) — **não recriar localmente**
- Diretrizes de mobile-first, alvos de toque, safe-area (Seção 11)

## 2. Paleta — tokens usados neste projeto

Todos em tema **claro** apenas (o site institucional da METADAX também é light-only por padrão — Seção 3 do v2 — então isso está alinhado, não é uma divergência adicional).

```css
:root {
  color-scheme: light;

  /* Neutros — única fonte de cor do produto (Seção 2.6 do v2, "Neutros de Superfície — Light") */
  --surface-canvas: #FFFFFF;
  --surface-1: #FAFAFA;
  --surface-2: #F0F0F0;
  --surface-3: #E4E4E4;      /* adicionado — o v2 não precisa de um 3º nível em light, este produto sim (ver §3) */
  --hairline: rgba(0, 0, 0, 0.08);
  --hairline-strong: rgba(0, 0, 0, 0.16); /* adicionado — bordas que precisam de mais peso sem usar cor */

  --text-primary: #1E1E1E;   /* = Preto METADAX, Manual de Marca */
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

  /* Foco — obrigatório por acessibilidade (WCAG), não é "cor de marca" nem "cor de partido":
     mantido em tom neutro escuro de alto contraste em vez do --focus-ring azul do v2 */
  --focus-ring: #1E1E1E;

  --radius-button-sm: 8px;
  --radius-button-md: 10px;
  --radius-button-lg: 12px;
  --radius-card: 18px;        /* herdado do v1 institucional */

  --shadow-product: rgba(0, 0, 0, 0.16) 3px 5px 30px 0; /* herdado, sem alteração */
}
```

**Cores explicitamente banidas na camada de produto** (não usar em nenhum componente, mesmo que o Design System da METADAX as ofereça): `--metadax-blue`, `--metadax-blue-bright`, `--metadax-red`, `--metadax-red-soft`, `--metadax-red-strong`, `--metadax-gradient-nova`, `--color-success`, `--color-warning`, `--color-caution`, `--color-error`, `--color-info`, toda a paleta de transação (`--tx-*`) e de trading (`--price-up`/`--price-down`) — nenhuma tem papel neste produto, já que não há valores financeiros de "receita/despesa" no sentido do v2, e usar qualquer uma delas reintroduziria cor onde a regra de neutralidade exige texto/ícone.

**Exceção única e explícita:** o **logotipo** da METADAX no header/footer usa suas cores oficiais (`metadax_dark`/`metadax_light`.png conforme fundo, Seção 6.3 do v2) — a marca em si não é "cor de ação da interface", é identidade institucional obrigatória (Seção 15), e o Manual de Marca proíbe alterar as cores do logotipo.

## 3. Como o produto resolve o que o v2 resolveria com cor

| Necessidade (no v2, seria cor) | Solução neste projeto |
|---|---|
| Badge de status "Ativo"/"Indeferido"/"Cassado" do candidato | Texto explícito + ícone outline (check / x / alerta), fundo `--surface-2`, borda `--hairline-strong`, nunca fundo verde/vermelho |
| Sinalizar valor financeiro (bens, contratos públicos) | `font-variant-numeric: tabular-nums`, fonte monoespaçada (JetBrains Mono — herdado do v2, não tem carga política) para todo valor em R$, sem cor de sinal (não há "positivo/negativo" aqui, apenas magnitude) |
| Diferenciar cargo/UF/partido na lista de resultados | Tipografia (peso, tamanho) e ícones outline (ex.: prédio para prefeito, bandeira para governador) — nunca um sistema de cor por categoria, que é exatamente o padrão visual que os próprios partidos usam e que o requisito pede para evitar |
| Alertar dado desatualizado / fonte indisponível | Ícone de alerta neutro (`--text-secondary`) + texto explicativo, borda tracejada em vez de fundo colorido |
| Link para site oficial / plano de governo | Sublinhado + ícone de link externo, cor de texto igual ao restante do corpo (`--text-primary`), sem a cor azul de link do v2 |

## 4. Tipografia — sem alteração do institucional (Inter)

Mantido integralmente o v1/v2 institucional (Seção 4.2 do v2) porque tipografia não carrega associação partidária:

| Papel | Tamanho | Peso | Fonte |
|---|---|---|---|
| Hero / título de busca | 40px (mobile: `clamp(28px, 6vw, 40px)`) | 600 | Inter |
| H2 / seção | 32px | 600 | Inter |
| Lead / subtítulo | 24px | 400 | Inter |
| Body | 17px | 400 | Inter |
| Caption / fine print | 14px | 400 | Inter |
| Valor monetário (bens, contratos) | 14–24px conforme contexto | 600 | **JetBrains Mono**, `tabular-nums` — herdado da Seção 4.1b do v2, mantido porque é uma escolha de legibilidade numérica, não de cor |
| Tabelas de dados (lista de candidatos densa) | 12–14px | 400–600 | Geist Sans / Geist Mono — herdado da Seção 4.3 do v2 para densidade de dados |
| Logotipo | — | — | Audiowide, exclusivo, conforme Manual de Marca |

## 5. Componentes reaproveitados do v2 sem alteração de forma (só de cor)

- Geometria de botão retangular de produto (`--radius-button-*`, Seção 5.1) — mantida, só troca a cor de fundo azul por `--action-primary-bg` (preto).
- Sistema de inputs/select/checkbox/radio (Seção 5.7) — mantido, focus ring trocado para neutro escuro em vez de azul.
- Elevação por cor de superfície, nunca sombra decorativa (Seção 8) — mantido integralmente, já era neutro.
- Escala de border radius (Seção 9) — mantida integralmente.
- AI Timeline (Seção 5.5) — **não usado neste produto** (não há agente de IA narrando ações na interface pública).
- Header/Footer/Loader via CDN (Seção 6) — reaproveitados como componentes prontos, sem recriação local, conforme regra do próprio Design System.

## 6. Mobile-first — regras aplicadas (herdadas da Seção 11 do v2, sem alteração)

- Alvo de toque mínimo `44×44px`, padrão do produto `48×48px`.
- Ação primária de cada tela (ex.: "Buscar", "Ver perfil completo") vive no terço inferior em `≤640px`.
- `font-size` mínimo `16px` em todo campo de busca/filtro, para não disparar zoom automático no iOS.
- Tab bar inferior fixa não se aplica (este produto não é um dashboard de múltiplas seções recorrentes — é navegação exploratória de conteúdo) → usa o padrão de menu do site institucional (hambúrguer que colapsa em `833px`), não o padrão de produto do v2.
- Skeleton loaders (não spinners) para a lista de candidatos e para dados de enriquecimento (CNPJ, transparência) carregados sob demanda.
- Toda animação respeita `prefers-reduced-motion: reduce`.

## 7. Rodapé institucional obrigatório

Reproduzido sem alteração de conteúdo, conforme Seção 15 do Design System v2:

```
METADAX
METADAX CONSULTORIA LTDA
CNPJ 65.640.808/0001-89
Av. Getúlio Vargas, 671, Sala 500 — Savassi, Belo Horizonte, MG — CEP 30112-021
metadax.com.br
```

Complementado com o próprio bloco de transparência do produto (fontes de dados, data do snapshot, link para `/sobre`) — não substitui o bloco institucional, é adicional a ele.
