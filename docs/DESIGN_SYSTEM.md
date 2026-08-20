# Identidade visual do projeto

> Guia de identidade visual do **Eleições — METADAX**, um projeto do
> [Instituto METADAX de Inovação (IMI)](https://imi.metadax.org). Este documento descreve
> as decisões de design deste produto especificamente — não reproduz nem depende de nenhum
> manual de design interno da METADAX; é autocontido.

## 1. Decisão de neutralidade — a regra que domina todas as outras

Requisito explícito do projeto: **tema claro, predominância de preto e branco, sem azul, verde, amarelo ou vermelho** — para não sugerir associação com qualquer partido político. Isso é uma decisão deliberada de produto, não uma limitação técnica: uma ferramenta de transparência eleitoral não pode adotar a paleta de nenhum partido nem repetir o padrão visual (azul institucional, verde/vermelho de aprovação-reprovação) que os próprios partidos usam.

**Resolução adotada:** o produto usa **apenas uma escala de neutros** (pretos, brancos, cinzas) e substitui toda comunicação que normalmente seria resolvida por cor — status, alerta, sinal financeiro — por **hierarquia tipográfica, ícone, borda e texto explícito**. Onde um sistema convencional diria "vermelho = erro", este projeto usa um ícone de alerta + texto + peso de fonte, nunca hue. Isso também reforça acessibilidade: nenhuma informação é comunicada só por cor.

**O que segue o padrão institucional da METADAX, por não ter carga partidária:**
- Tipografia (Audiowide no logotipo — uso exclusivo —, Inter no restante do texto)
- Grid, espaçamento e breakpoints do site institucional
- Regras de uso da marca/logotipo (ver Manual de Marca, `metadax.com.br/manual-de-marca`)
- Bloco de rodapé institucional obrigatório (CNPJ, endereço, razão social)
- Header/footer/loader centralizados via CDN pública da METADAX — **não recriados localmente**
- Diretrizes de mobile-first, alvos de toque, safe-area

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
}
```

**Cores explicitamente banidas neste produto** (não usar em nenhum componente): qualquer azul, vermelho, verde ou amarelo — inclusive as variações institucionais/semânticas que a METADAX usa em outros produtos próprios. Nenhuma delas tem papel aqui; usar qualquer uma reintroduziria cor onde a regra de neutralidade exige texto/ícone.

**Exceção única e explícita:** o **logotipo** da METADAX no header/footer usa suas cores oficiais — a marca em si não é "cor de ação da interface", é identidade institucional obrigatória, e o Manual de Marca da METADAX proíbe alterar as cores do logotipo.

## 3. Como o produto resolve o que normalmente seria cor

| Necessidade | Solução neste projeto |
|---|---|
| Badge de status "Ativo"/"Indeferido"/"Cassado" do candidato | Texto explícito + ícone outline (check / x / alerta), fundo `--surface-2`, borda `--hairline-strong`, nunca fundo verde/vermelho |
| Sinalizar valor financeiro (bens, contratos públicos) | `font-variant-numeric: tabular-nums`, fonte monoespaçada (JetBrains Mono) para todo valor em R$, sem cor de sinal |
| Diferenciar cargo/UF/partido na lista de resultados | Tipografia (peso, tamanho) e ícones outline — nunca um sistema de cor por categoria, que é exatamente o padrão visual que os próprios partidos usam e que o requisito pede para evitar |
| Alertar dado desatualizado / fonte indisponível | Ícone de alerta neutro (`--text-secondary`) + texto explicativo, borda tracejada em vez de fundo colorido |
| Link para site oficial / plano de governo | Sublinhado + ícone de link externo, cor de texto igual ao restante do corpo (`--text-primary`) |
| Status de saúde das fontes (`/status`) | Ícone distinto por estado (check / cadeado / alerta / x) + texto — nunca semáforo verde/amarelo/vermelho |

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
| Logotipo | — | — | Audiowide, exclusivo, conforme Manual de Marca da METADAX |

## 5. Componentes

- Geometria de botão retangular com cantos arredondados (`--radius-button-*`), sempre preto/branco, nunca azul.
- Sistema de inputs/select/checkbox/radio com focus ring neutro escuro.
- Elevação por cor de superfície, nunca sombra decorativa.
- Header/Footer/Loader via CDN pública da METADAX — reaproveitados como componentes prontos, sem recriação local.

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

Complementado pelo rodapé próprio do produto (`SiteFooter`, ver `src/components/SiteFooter.tsx`), com os links legais específicos deste projeto (`/sobre`, `/privacidade`, `/termos`) e a atribuição ao Instituto METADAX de Inovação (IMI) como mantenedor do projeto.
