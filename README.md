# eleicoes.metadax.org

Consulta pública de candidatos às eleições brasileiras, cruzando dados oficiais do
Tribunal Superior Eleitoral (TSE) com o Portal da Transparência (CGU) e dados de
CNPJ da Receita Federal (via [BrasilAPI](https://brasilapi.com.br)).

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
- `/candidato/[id]` — perfil de um candidato: dados básicos, bens declarados, e —
  ao vivo, via API — site oficial, plano de governo, histórico de candidaturas
  anteriores (DivulgaCandContas) e cruzamento com o Portal da Transparência
  (PEP, contratos, sanções)
- `/mapa` — estatísticas públicas: candidatos por UF e por cargo (consumível também
  via `GET /api/estatisticas`, JSON, CORS aberto)
- `/status` — saúde em tempo real de cada fonte de dado externa (TSE, BrasilAPI,
  Portal da Transparência), com checagem ao vivo a cada 30s
- `/sobre` — metodologia, fontes e licença
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

Abre em `http://localhost:3000`. Sem nenhum dado real do TSE ingerido, as
páginas caem para um fixture de exemplo, claramente identificado como tal na UI.

### Ingerindo dados reais do TSE

```bash
npm run ingest -- --ano=2026
```

Precisa rodar de uma rede que o TSE não bloqueie — ver
`docs/DATA_SOURCES.md` §5 antes de assumir que vai funcionar do seu ambiente.

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
