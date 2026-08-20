# eleicoes.metadax.org

Consulta pública de candidatos às eleições brasileiras, cruzando dados oficiais do
Tribunal Superior Eleitoral (TSE) com o Portal da Transparência (CGU) e dados de
CNPJ da Receita Federal (via [BrasilAPI](https://brasilapi.com.br)).

Tema claro, preto e branco, sem cor de partido, mobile-first. Design derivado do
Design System da [METADAX](https://www.metadax.com.br), com neutralidade
político-partidária como requisito central — ver `docs/DESIGN_SYSTEM.md`.

Licenciado sob [CC BY 4.0](LICENSE).

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
- **[docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)** — adaptação neutra
  (preto/branco) do Design System v2 da METADAX, e por que cada cor de marca
  foi deliberadamente excluída.

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
