<!--
Todo PR passa por duas validações obrigatórias antes de ser mesclado (ver
docs/ARCHITECTURE.md §15): o check automatizado "AI Security Review" e
a aprovação manual do mantenedor. Preencher isto ajuda os dois.
-->

## O que muda e por quê

<!-- Não só "o quê" — a motivação. Se for uma decisão de arquitetura ou
     fonte de dado nova, ela também precisa estar em docs/ (ver
     CONTRIBUTING.md, convenção 8). -->

## Checklist antes de pedir revisão

- [ ] `npx tsc --noEmit`, `npm run lint` e `npm run build` passam localmente
- [ ] Nenhum dado foi fabricado/inferido — toda informação exibida vem de uma fonte real e rastreável (ver `docs/DATA_SOURCES.md` §10)
- [ ] Linguagem neutra em categorias sensíveis (bens, finanças, certidões, remuneração, benefícios sociais — ver `CONTRIBUTING.md`)
- [ ] Nenhuma chave/token/segredo novo commitado — variáveis de ambiente só, nunca hardcoded
- [ ] Loader novo em `src/lib/data.ts` (se houver) passa por `lerJsonCacheado()` — ver `docs/ARCHITECTURE.md` §12
- [ ] Testado em `hmg` antes de pedir a promoção para `main`, se a mudança afeta uma página existente

## Como testar

<!-- Passos para reproduzir/conferir a mudança manualmente. -->
