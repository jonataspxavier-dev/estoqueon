# EstoqueOn — convenções do projeto

API REST de estoque e vendas (`api/`) + painel React (`web/`). Plano original em `PLANO.md`.

## Regras

- **TypeScript estrito** nos dois projetos (`strict`, `noUncheckedIndexedAccess` na API). Nada de `any` sem motivo.
- **Validação com Zod em toda entrada** (body, params e query). Os schemas ficam em `api/src/schemas/index.ts`;
  o controller chama `schema.parse(...)` e o `ZodError` vira 400 no handler global.
- **Regras de negócio só nos services** (`api/src/services`). Controllers apenas validam, chamam o service e respondem.
- **Erros de negócio** usam `AppError` (`api/src/utils/AppError.ts`) — nunca `res.status(...)` dentro de service.
- **Estoque nunca é alterado direto**: toda mudança passa por movimentação (`movimentacao.service`) ou venda
  (`venda.service`), dentro de transação com `SELECT ... FOR UPDATE` nas linhas dos produtos (ordenadas por id).
- Produtos são **desativados**, não excluídos (preserva histórico).
- **Testes para cada rota** em `api/tests` (Jest + Supertest, banco MySQL real `estoqueon_test`).
- Toda rota nova precisa entrar no Swagger (`api/src/docs/openapi.ts`).
- Mensagens de erro e textos de interface em **português**.

## Comandos

```bash
docker compose up -d mysql          # só o banco (porta 3307)
cd api && npm run dev               # API em :3000 (docs em /docs)
cd api && npm test                  # testes (usa .env.test)
cd api && npm run lint && npm run typecheck
cd web && npm run dev               # painel em :5173 (proxy /api → :3000)
docker compose up -d --build        # tudo: MySQL + API + painel (:8080)
```
