# Branch de assets binários — eleicoes.metadax.org

Fotos de candidatos e PDFs de plano de governo, coletados do site de dados abertos do TSE em
24/08/2026 (datasets `foto_cand2026_{UF}_div.zip` e `proposta_governo_2026_{UF}.zip`).

Fica numa branch separada de `main` (não código, dado binário) e é servida via
`raw.githubusercontent.com/pedrorosemberg/eleicoes.metadax.org/assets-tse-2026/{caminho}` —
consumida pela aplicação em `src/lib/assets-tse.ts`. Ver `docs/DATA_SOURCES.md` §1 na branch
`main` para a origem completa dos dados e a licença (CC BY 4.0).

## Estrutura

- `fotos/{UF}/F{UF}{sqCandidato}_div.jpg` — foto oficial do candidato, nome de arquivo original do TSE
- `planos-de-governo/{UF}/2026{UF}{sqCandidato}_{NN}.pdf` — plano de governo (pode ter mais de um arquivo por candidato)

`{sqCandidato}` corresponde exatamente ao campo `sqCandidato` usado em `data/{ano}/candidatos/{UF}.json` na branch `main`.
