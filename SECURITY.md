# Segurança

Este documento registra a política de divulgação de vulnerabilidades e o resultado da
auditoria de segurança feita em 26/08/2026, antes da divulgação pública do repositório —
mantido atualizado conforme novas revisões acontecem.

## Reportar uma vulnerabilidade

Se você encontrar uma vulnerabilidade real (não um bug funcional comum — para esses, abra uma
[issue normal](https://github.com/pedrorosemberg/eleicoes.metadax.org/issues/new)):

1. **Não abra uma issue pública.** Use a aba
   [Security → Report a vulnerability](https://github.com/pedrorosemberg/eleicoes.metadax.org/security/advisories/new)
   do GitHub (advisory privado) — ou, se preferir, contate o mantenedor diretamente pelos
   canais listados em [/sobre](https://eleicoes.metadax.org/sobre).
2. Descreva o problema, os passos para reproduzir e o impacto esperado. Não é necessário (nem
   recomendado) incluir CPF, chave de API ou qualquer outro dado sensível real no relato — uma
   descrição do mecanismo já basta.
3. Como este é um projeto de código aberto mantido conforme o tempo disponível (ver
   [/participe](https://eleicoes.metadax.org/participe)), não há um SLA formal de resposta,
   mas relatos de segurança têm prioridade sobre outras issues.

## O que está fora de escopo

- **Dados públicos exibidos pelo produto não são uma vulnerabilidade.** Nome, partido, bens
  declarados, CPF (dado público por lei eleitoral — usado só server-side e nunca renderizado
  na UI por escolha de produto, não por exigência de sigilo, ver abaixo), certidões criminais
  anexadas pelo próprio candidato: tudo vem de fontes públicas por força de lei (LAI, dados
  abertos do TSE) e é o propósito declarado do projeto. Ver `docs/DATA_SOURCES.md` §9 para a
  revisão de compliance completa.
- **Rate limiting ausente em `/api/*` não é uma descoberta nova** — é um risco conhecido,
  documentado abaixo, com decisão explícita de não mitigar ainda (ver "Riscos conhecidos").

## Auditoria de 26/08/2026 — segredos e dados sensíveis

Varredura completa do repositório (não só arquivos alterados recentemente) antes da
divulgação pública. Resumo dos achados:

**Sem problemas encontrados:**
- Nenhum segredo hardcoded no código-fonte (varrido contra padrões de chave/token comuns:
  AWS, GitHub, Google, Slack, chaves privadas PEM) em todo o histórico de commits, não só no
  HEAD atual.
- `.env`/`.env.local`/`.env*.local` nunca foram commitados (confirmado no histórico completo
  do git, não só no estado atual) — só `.env.example`, sem valores reais.
- Os dois segredos reais do projeto (`PORTAL_TRANSPARENCIA_API_KEY`, `VERCEL_API_TOKEN`) são
  lidos exclusivamente via `process.env`, nunca hardcoded, e todo arquivo que os lê importa
  `"server-only"` no topo — o Next.js recusa a build se um desses módulos for importado por
  engano num Client Component, o que tornaria o segredo parte do bundle enviado ao navegador.
- Nenhum `console.log`/`console.error` imprime o valor de uma chave, token ou header
  `Authorization` em nenhum lugar do código.
- CPF nunca é renderizado como texto em nenhuma página — só usado como condição booleana
  (`candidato.cpf ? ... : ...`) e passado server-side para as funções de enriquecimento.
  Confirmado varrendo toda a árvore `app/`. **Isso não é uma medida de sigilo** — CPF de
  candidato já é dado público por força de lei eleitoral, exposto pelo próprio TSE nos seus
  datasets abertos (ver `docs/DATA_SOURCES.md` §7 para o embasamento legal completo); a
  omissão na UI é só uma escolha de produto (não é útil para quem lê o perfil de um
  candidato), não uma correção de vazamento.
- `package.json` tem só as dependências que o produto genuinamente usa (Next.js, React,
  Leaflet, parsing de CSV/ZIP) — sem pacotes suspeitos ou scripts de `postinstall`.
- Nenhum caminho de arquivo local do ambiente de desenvolvimento vazou para o código
  commitado.

**Corrigido durante a auditoria:**
- `.env.example` estava desatualizado — não listava `VERCEL_API_TOKEN` (introduzido depois de
  `.env.example` ter sido escrito). Corrigido, com a distinção entre os dois tipos de token da
  Vercel documentada ali mesmo (ver `docs/DATA_SOURCES.md` §11 para o porquê disso importar).

## Esteira de CI/CD e Secure SDLC (26/08/2026)

Desde que o repositório passou a aceitar contribuições externas, todo PR contra `hmg` ou a branch
de produção passa por dois gates obrigatórios antes de poder ser mesclado: um check automatizado
de revisão de segurança via IA (com atenção específica a prompt injection/prompt poisoning
direcionado a um agente de IA que venha a processar este repositório — não só vulnerabilidade de
código no sentido clássico) e a aprovação manual do mantenedor. PRs de fora do repositório (forks)
exigem aprovação explícita do mantenedor só para rodar qualquer workflow, antes de qualquer
segredo ser usado contra o conteúdo do PR. Além disso, CodeQL (SAST) roda em todo PR e
semanalmente, e Dependabot mantém dependências vulneráveis/desatualizadas sob monitoramento.
Arquitetura completa e o checklist de configuração em `docs/ARCHITECTURE.md` §15 e §16; mapeamento
de controles ISO 27002 aplicáveis em `docs/ISO27001_27002.md`.

## Riscos conhecidos (não críticos, decisão registrada)

**`/api/transparencia/:tipo` é um proxy público sem limite por consumidor.** Todas as rotas
`/api/*` respondem com CORS aberto por design (`docs/ARCHITECTURE.md` §10) — qualquer site pode
consumi-las. Isso inclui este proxy para o Portal da Transparência (CGU), autenticado com a
chave própria deste projeto (`PORTAL_TRANSPARENCIA_API_KEY`, nunca exposta ao cliente). Um
consumidor mal-intencionado poderia, em tese, esgotar a cota real e compartilhada dessa chave
(algumas faixas de endpoint são limitadas a 180 requisições/minuto pela própria CGU — ver
`docs/DATA_SOURCES.md` §4), degradando o cruzamento com o Portal da Transparência para os
usuários reais do site. Mitigação disponível hoje, se isso acontecer: bloquear por
origem/IP no painel da Vercel (não há sistema de quotas por consumidor implementado — construir
um seria escopo novo, não uma correção pontual). Decisão registrada em 26/08/2026: aceitar esse
risco por ora, dado que o produto inteiro já depende de CORS aberto como característica central
(ver `docs/ARCHITECTURE.md` §10), e revisitar se um padrão de abuso real for observado.

## O que este projeto explicitamente não coleta

Ver [/privacidade](https://eleicoes.metadax.org/privacidade) para a lista completa. Resumo: sem
analytics de marketing (Meta/Google/Clarity), sem cookies de rastreamento — só Vercel
Analytics/Speed Insights (contagem agregada de visitas, sem identificar indivíduos) e eventos de
busca anônimos (termo buscado, sem IP nem qualquer identificador).
