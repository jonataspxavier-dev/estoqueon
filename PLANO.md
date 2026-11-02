# Projeto 3 — API de Controle de Estoque e Vendas "EstoqueOn" (Node.js + MySQL + painel React)

> Plano para rodar no Claude Code. Cole este arquivo na raiz de uma pasta vazia como `PLANO.md` e siga as fases em ordem.

## Objetivo

Criar uma API REST de controle de estoque e vendas para pequenos comércios, com um painel React simples para consumir a API. Mostra domínio de Node.js, MySQL e boas práticas de API (validação, testes, documentação), complementando o projeto em Java.

**Tempo estimado:** 3 a 5 dias
**Stack:**
- Back-end: Node.js (versão LTS atual), Express, TypeScript, Prisma ORM, MySQL, Zod, JWT
- Testes: Jest + Supertest
- Docs: Swagger (swagger-ui-express)
- Front-end: React + Vite + TypeScript, Tailwind, Recharts (gráficos)
- Infra: Docker Compose (MySQL + API + front)

## Funcionalidades (MVP)

1. Login com JWT e perfis **GERENTE** e **VENDEDOR**
2. CRUD de **Categorias** e **Produtos** (SKU, nome, preço de custo, preço de venda, estoque atual, estoque mínimo)
3. **Movimentações de estoque**: entrada, saída e ajuste, com histórico e motivo
4. **Vendas** com vários itens, baixa automática do estoque em **transação** (sem estoque negativo)
5. **Alertas** de produtos abaixo do estoque mínimo
6. **Relatórios**: vendas por período, produtos mais vendidos, lucro bruto, valor total em estoque
7. **Exportar relatórios em CSV**
8. Busca, filtros e paginação
9. Rate limiting, Helmet, CORS e logs estruturados

## Modelo de dados

```
usuario(id, nome, email UNIQUE, senha_hash, perfil[GERENTE|VENDEDOR])
categoria(id, nome UNIQUE)
produto(id, sku UNIQUE, nome, categoria_id, preco_custo, preco_venda,
        estoque_atual, estoque_minimo, ativo)
movimentacao(id, produto_id, tipo[ENTRADA|SAIDA|AJUSTE], quantidade, motivo,
             usuario_id, criado_em)
venda(id, usuario_id, total, criado_em)
venda_item(id, venda_id, produto_id, quantidade, preco_unitario)
```

## Endpoints principais

```
POST   /auth/login
GET    /produtos?busca=&categoria=&abaixoMinimo=&page=
POST   /produtos              (GERENTE)  PUT/DELETE /produtos/:id
GET    /categorias            POST/PUT/DELETE (GERENTE)
POST   /movimentacoes         (GERENTE)
GET    /movimentacoes?produtoId=&de=&ate=
POST   /vendas
GET    /vendas?de=&ate=&page=
GET    /relatorios/resumo?de=&ate=
GET    /relatorios/mais-vendidos?de=&ate=
GET    /relatorios/exportar.csv?tipo=vendas&de=&ate=
GET    /alertas/estoque-baixo
```

## Estrutura de pastas

```
estoqueon/
├── api/
│   ├── prisma/ (schema.prisma, migrations, seed.ts)
│   └── src/ (routes, controllers, services, middlewares, schemas, utils)
│   └── tests/
├── web/            # painel React
├── docker-compose.yml
├── README.md
└── PLANO.md
```

## Fases — prompts para colar no Claude Code

**Fase 0 — Setup**
```
Leia o PLANO.md. Crie um CLAUDE.md com as convenções (TypeScript estrito, validação com Zod em toda entrada, regras de negócio só nos services, testes para cada rota). Monte o projeto /api com Express + TS + Prisma + MySQL via docker-compose, com ESLint e Prettier. Confirme que sobe e responde em /health.
```

**Fase 1 — Banco e autenticação**
```
Crie o schema Prisma do PLANO.md, as migrations e um seed com 2 usuários (gerente e vendedor), 5 categorias e 30 produtos. Implemente login JWT, middleware de autenticação e autorização por perfil, e o tratamento global de erros.
```

**Fase 2 — Produtos e estoque**
```
Implemente os CRUDs de categorias e produtos (busca, filtros, paginação) e as movimentações de estoque com histórico. Escreva testes com Jest + Supertest.
```

**Fase 3 — Vendas e relatórios**
```
Implemente vendas com vários itens usando transação do Prisma, impedindo estoque negativo e registrando a movimentação de saída. Depois implemente os relatórios, alertas de estoque baixo e exportação CSV. Teste especialmente a venda concorrente do último item.
```

**Fase 4 — Documentação e segurança**
```
Documente todas as rotas no Swagger em /docs. Adicione Helmet, rate limiting, CORS configurável e logs com pino. Revise validações e mensagens de erro.
```

**Fase 5 — Painel React**
```
Crie o /web com React + Vite + TS + Tailwind: login, dashboard (cards de resumo + gráfico de vendas com Recharts + alertas), lista de produtos com filtros, tela de nova venda (busca de produto, carrinho, finalizar) e relatórios com botão de exportar CSV.
```

**Fase 6 — Entrega**
```
Deixe o docker-compose subindo MySQL, API e painel com um comando. Rode todos os testes. Escreva o README com prints, link do Swagger, credenciais de demonstração e instruções. Sugira um deploy gratuito com o passo a passo.
```

## Critérios de pronto

- [ ] Venda com estoque insuficiente é recusada e não altera nada (testado)
- [ ] Swagger completo em `/docs`
- [ ] Testes passando para todas as rotas
- [ ] Painel funcionando no celular e no desktop
- [ ] Deploy online com usuário de demonstração

## Como cadastrar no Workana

- **Título:** API REST de Estoque e Vendas — Node.js + MySQL
- **Habilidades:** JavaScript, React.js, Java (ou troque por Node.js se adicionar depois)
- **Descrição:** API completa para controle de estoque e vendas de pequenos comércios, com alertas de estoque baixo, relatórios de lucro e exportação em CSV. Desenvolvida em Node.js + TypeScript com MySQL, autenticação JWT, testes automatizados e documentação Swagger, mais um painel administrativo em React.
- **Imagens:** dashboard, tela de venda, Swagger
- **Link:** deploy + repositório no GitHub
