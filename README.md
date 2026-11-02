# EstoqueOn — API de Controle de Estoque e Vendas

API REST completa para controle de estoque e vendas de pequenos comércios, com painel administrativo em React.
Alertas de estoque baixo, relatórios de faturamento e lucro bruto, exportação em CSV, autenticação JWT com perfis,
testes automatizados e documentação Swagger.

![Dashboard](docs/screenshots/dashboard.jpg)

## Stack

| Camada    | Tecnologias                                                                    |
| --------- | ------------------------------------------------------------------------------ |
| Back-end  | Node.js 24, Express 5, TypeScript, Prisma ORM, MySQL 8, Zod, JWT, bcrypt       |
| Segurança | Helmet, CORS configurável, rate limiting, logs estruturados com pino           |
| Testes    | Jest + Supertest (77 testes, banco MySQL real)                                  |
| Docs      | OpenAPI 3 + Swagger UI em `/docs`                                              |
| Front-end | React 19, Vite, TypeScript, Tailwind CSS 4, Recharts, React Router              |
| Infra     | Docker Compose (MySQL + API + painel com Nginx)                                |

## Funcionalidades

- **Login com JWT** e perfis **GERENTE** (acesso total) e **VENDEDOR** (vende e consulta; vê só as próprias vendas)
- **CRUD de categorias e produtos** com SKU, preço de custo/venda, margem, estoque atual e mínimo
- **Movimentações de estoque** (entrada, saída e ajuste de inventário) com histórico, motivo, usuário e saldo antes/depois
- **Vendas com vários itens** e baixa automática do estoque em **transação** — nunca deixa o estoque negativo,
  mesmo com vendas simultâneas do último item
- **Alertas** de produtos no ou abaixo do estoque mínimo
- **Relatórios**: vendas por período e por dia, produtos mais vendidos, lucro bruto, margem, ticket médio e valor total em estoque
- **Exportação CSV** (vendas, mais vendidos, movimentações e posição de estoque) — pronta para abrir no Excel
- **Busca, filtros e paginação** em todas as listagens
- **Painel responsivo** (celular e desktop)

## Como rodar (um comando)

Pré-requisito: Docker.

```bash
docker compose up -d --build
```

| Serviço           | URL                          |
| ----------------- | ---------------------------- |
| Painel            | http://localhost:8080        |
| API               | http://localhost:3000        |
| Swagger (docs)    | http://localhost:3000/docs   |
| MySQL             | localhost:3307               |

Na primeira subida a API aplica as migrations e popula o banco com dados de demonstração
(2 usuários, 5 categorias, 30 produtos e ~60 dias de vendas).

### Credenciais de demonstração

| Perfil   | E-mail                   | Senha         |
| -------- | ------------------------ | ------------- |
| Gerente  | `gerente@estoqueon.com`  | `gerente123`  |
| Vendedor | `vendedor@estoqueon.com` | `vendedor123` |

## Desenvolvimento local

```bash
docker compose up -d mysql      # sobe só o banco

cd api
cp .env.example .env
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev                     # http://localhost:3000

cd ../web
npm install
npm run dev                     # http://localhost:5173 (proxy /api → :3000)
```

### Testes

Os testes rodam contra um banco MySQL real e separado (`estoqueon_test`, criado automaticamente pelo container):

```bash
docker compose up -d mysql
cd api
npm test        # usa o api/.env.test, que já aponta para estoqueon_test
```

Destaques da suíte:

- venda com estoque insuficiente é **recusada e não altera nada** (venda, itens, estoque e histórico)
- **10 vendas simultâneas do último item** → exatamente 1 é concluída e o estoque termina em 0
- 12 vendas simultâneas disputando 5 unidades → 5 concluídas, estoque nunca negativo
- autorização por perfil, validações, paginação, filtros, relatórios e CSV

```
Test Suites: 6 passed, 6 total
Tests:       77 passed, 77 total
```

## Endpoints

| Método | Rota                               | Perfil   | Descrição                                        |
| ------ | ---------------------------------- | -------- | ------------------------------------------------ |
| POST   | `/auth/login`                      | público  | Login, retorna JWT                               |
| GET    | `/auth/me`                         | todos    | Usuário do token                                 |
| GET    | `/categorias`                      | todos    | Lista categorias                                 |
| POST/PUT/DELETE | `/categorias[/:id]`       | GERENTE  | Gerencia categorias                              |
| GET    | `/produtos?busca=&categoria=&abaixoMinimo=&page=` | todos | Lista com filtros e paginação     |
| GET    | `/produtos/:id`                    | todos    | Detalhe                                          |
| POST/PUT/DELETE | `/produtos[/:id]`         | GERENTE  | Cria, edita, desativa                            |
| POST   | `/movimentacoes`                   | GERENTE  | Entrada, saída ou ajuste                         |
| GET    | `/movimentacoes?produtoId=&tipo=&de=&ate=` | todos | Histórico                               |
| POST   | `/vendas`                          | todos    | Registra venda com vários itens                  |
| GET    | `/vendas?de=&ate=&page=`           | todos    | Lista (vendedor vê só as próprias)               |
| GET    | `/vendas/:id`                      | todos    | Detalhe                                          |
| GET    | `/relatorios/resumo?de=&ate=`      | todos    | Faturamento, lucro, ticket, estoque, vendas/dia  |
| GET    | `/relatorios/mais-vendidos?de=&ate=&limite=` | todos | Ranking                               |
| GET    | `/relatorios/exportar.csv?tipo=&de=&ate=` | todos | CSV (`vendas`, `mais-vendidos`, `estoque`, `movimentacoes`) |
| GET    | `/alertas/estoque-baixo`           | todos    | Produtos no/abaixo do mínimo                     |
| GET    | `/health`                          | público  | Status da API e do banco                         |

Documentação interativa completa em **`/docs`** (JSON em `/docs.json`).

### Padrão de erros

```json
{ "erro": "REGRA_DE_NEGOCIO", "mensagem": "Estoque insuficiente para concluir a venda",
  "detalhes": { "itens": [{ "produtoId": 25, "nome": "Saco de Lixo 50L", "disponivel": 0, "solicitado": 1 }] } }
```

`400` validação · `401` não autenticado · `403` perfil sem permissão · `404` não encontrado · `409` conflito
(SKU/nome duplicado) · `422` regra de negócio (estoque insuficiente, preço de venda < custo) · `429` limite de requisições

## Decisões técnicas

- **Concorrência**: a venda trava as linhas dos produtos com `SELECT ... FOR UPDATE` (em ordem de id, evitando deadlock),
  confere o estoque de todos os itens e só então grava venda, itens, baixa e movimentações — tudo na mesma transação.
- **Lucro preciso**: cada item de venda guarda o **preço e o custo do momento da venda**, então alterar preços depois não
  distorce relatórios antigos.
- **Histórico auditável**: o estoque só muda por movimentações (com saldo anterior/posterior) ou vendas; o cadastro de
  produto não altera quantidade. Produtos são desativados, nunca apagados.
- **Arquitetura em camadas**: rotas → controllers (validação Zod) → services (regras de negócio) → Prisma.

## Estrutura

```
estoqueon/
├── api/
│   ├── prisma/          schema.prisma, migrations, seed.ts
│   ├── src/
│   │   ├── config/      variáveis de ambiente validadas com Zod
│   │   ├── controllers/ entrada/saída HTTP
│   │   ├── services/    regras de negócio
│   │   ├── schemas/     validação Zod
│   │   ├── middlewares/ autenticação, autorização, erros
│   │   ├── docs/        especificação OpenAPI
│   │   └── utils/
│   └── tests/           Jest + Supertest
├── web/                 painel React (Vite + Tailwind + Recharts)
├── docker/              script de inicialização do MySQL
└── docker-compose.yml
```

## Telas

| Login | Nova venda |
| ----- | ---------- |
| ![Login](docs/screenshots/login.jpg) | ![Nova venda](docs/screenshots/nova-venda.jpg) |

| Produtos | Relatórios |
| -------- | ---------- |
| ![Produtos](docs/screenshots/produtos.jpg) | ![Relatórios](docs/screenshots/relatorios.jpg) |

| Swagger | Celular |
| ------- | ------- |
| ![Swagger](docs/screenshots/swagger.jpg) | ![Celular](docs/screenshots/mobile-produtos.jpg) |

## Deploy gratuito (sugestão)

Combinação sem custo: **Aiven** (MySQL) + **Render** (API em Docker) + **Vercel** (painel).

1. **Banco — Aiven for MySQL (plano Free)**
   - Crie um serviço MySQL em [aiven.io](https://aiven.io) e copie a *Service URI*.
   - Monte o `DATABASE_URL`: `mysql://USUARIO:SENHA@HOST:PORTA/defaultdb?sslaccept=accept_invalid_certs` (a Aiven usa um certificado próprio).
2. **API — Render (Web Service gratuito)** — o `render.yaml` na raiz já descreve o serviço (*New → Blueprint*)
   - Suba o projeto para o GitHub. Em [render.com](https://render.com): *New → Web Service* → selecione o repositório.
   - *Root Directory*: `api` · *Runtime*: Docker · *Health Check Path*: `/health`.
   - Variáveis: `DATABASE_URL`, `JWT_SECRET` (texto longo aleatório), `NODE_ENV=production`, `SEED_ON_START=true`,
     `CORS_ORIGIN=https://SEU-PAINEL.vercel.app`.
   - O container aplica as migrations e o seed sozinho. Swagger em `https://SUA-API.onrender.com/docs`.
   - Obs.: no plano gratuito o serviço "dorme" após inatividade; a primeira requisição pode levar ~50 s.
3. **Painel — Vercel**
   - Em [vercel.com](https://vercel.com): *Add New → Project* → repositório, *Root Directory* `web`, framework Vite.
   - Variável `VITE_API_URL=https://SUA-API.onrender.com`. O `vercel.json` já trata as rotas do React.
4. Atualize o `CORS_ORIGIN` no Render com a URL final da Vercel e pronto: use as credenciais de demonstração acima.

## Licença

MIT
