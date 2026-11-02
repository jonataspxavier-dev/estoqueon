import { api, estoqueDe, prepararBanco, prisma, type Contexto } from './helpers';

let ctx: Contexto;
beforeEach(async () => {
  ctx = await prepararBanco();
});
afterAll(() => prisma.$disconnect());

const vender = (token: string, itens: { produtoId: number; quantidade: number }[]) =>
  api().post('/vendas').set('Authorization', token).send({ itens });

describe('POST /vendas', () => {
  it('registra venda com vários itens, calcula total e baixa o estoque', async () => {
    const res = await vender(ctx.tokenVendedor, [
      { produtoId: ctx.refri.id, quantidade: 3 },
      { produtoId: ctx.agua.id, quantidade: 2 },
    ]);
    expect(res.status).toBe(201);
    expect(res.body.total).toBe(35); // 3 × 10 + 2 × 2,50
    expect(res.body.usuario).toEqual({ id: ctx.vendedor.id, nome: 'Vendedor Teste' });
    expect(res.body.itens).toHaveLength(2);

    expect(await estoqueDe(ctx.refri.id)).toBe(47);
    expect(await estoqueDe(ctx.agua.id)).toBe(3);

    const movs = await prisma.movimentacao.findMany({ where: { vendaId: res.body.id }, orderBy: { produtoId: 'asc' } });
    expect(movs).toHaveLength(2);
    expect(movs.every((m) => m.tipo === 'SAIDA' && m.motivo === `Venda #${res.body.id}`)).toBe(true);
  });

  it('guarda preço e custo do momento da venda', async () => {
    const res = await vender(ctx.tokenVendedor, [{ produtoId: ctx.refri.id, quantidade: 1 }]);
    await prisma.produto.update({ where: { id: ctx.refri.id }, data: { precoVenda: 99, precoCusto: 50 } });
    const item = await prisma.vendaItem.findFirstOrThrow({ where: { vendaId: res.body.id } });
    expect(Number(item.precoUnitario)).toBe(10);
    expect(Number(item.custoUnitario)).toBe(5);
  });

  it('agrupa itens repetidos do mesmo produto', async () => {
    const res = await vender(ctx.tokenVendedor, [
      { produtoId: ctx.refri.id, quantidade: 1 },
      { produtoId: ctx.refri.id, quantidade: 2 },
    ]);
    expect(res.status).toBe(201);
    expect(res.body.itens).toEqual([expect.objectContaining({ quantidade: 3, subtotal: 30 })]);
    expect(await estoqueDe(ctx.refri.id)).toBe(47);
  });

  it('venda com estoque insuficiente é recusada e NÃO altera nada', async () => {
    const res = await vender(ctx.tokenVendedor, [
      { produtoId: ctx.refri.id, quantidade: 5 }, // tem estoque
      { produtoId: ctx.agua.id, quantidade: 6 }, // só tem 5
    ]);
    expect(res.status).toBe(422);
    expect(res.body.detalhes.itens).toEqual([{ produtoId: ctx.agua.id, nome: 'Água 500ml', disponivel: 5, solicitado: 6 }]);

    expect(await estoqueDe(ctx.refri.id)).toBe(50);
    expect(await estoqueDe(ctx.agua.id)).toBe(5);
    expect(await prisma.venda.count()).toBe(0);
    expect(await prisma.vendaItem.count()).toBe(0);
    expect(await prisma.movimentacao.count()).toBe(0);
  });

  it('recusa produto inativo ou inexistente', async () => {
    await prisma.produto.update({ where: { id: ctx.agua.id }, data: { ativo: false } });
    const res = await vender(ctx.tokenVendedor, [
      { produtoId: ctx.agua.id, quantidade: 1 },
      { produtoId: 999999, quantidade: 1 },
    ]);
    expect(res.status).toBe(422);
    expect(res.body.detalhes.produtoIds.sort()).toEqual([ctx.agua.id, 999999].sort());
    expect(await prisma.venda.count()).toBe(0);
  });

  it('valida o corpo (sem itens, quantidade zero)', async () => {
    expect((await vender(ctx.tokenVendedor, [])).status).toBe(400);
    expect((await vender(ctx.tokenVendedor, [{ produtoId: ctx.refri.id, quantidade: 0 }])).status).toBe(400);
  });

  it('venda concorrente do último item: apenas uma é concluída', async () => {
    // Detergente tem exatamente 1 unidade; 10 vendas simultâneas disputam o mesmo item
    const respostas = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        vender(i % 2 ? ctx.tokenGerente : ctx.tokenVendedor, [{ produtoId: ctx.detergente.id, quantidade: 1 }]),
      ),
    );
    const status = respostas.map((r) => r.status);
    expect(status.filter((s) => s === 201)).toHaveLength(1);
    expect(status.filter((s) => s === 422)).toHaveLength(9);

    expect(await estoqueDe(ctx.detergente.id)).toBe(0);
    expect(await prisma.venda.count()).toBe(1);
    expect(await prisma.movimentacao.count({ where: { produtoId: ctx.detergente.id } })).toBe(1);
  });

  it('vendas concorrentes nunca deixam o estoque negativo', async () => {
    // Água tem 5 unidades; 12 vendas de 1 unidade cada, em paralelo
    const respostas = await Promise.all(
      Array.from({ length: 12 }, () =>
        vender(ctx.tokenVendedor, [
          { produtoId: ctx.agua.id, quantidade: 1 },
          { produtoId: ctx.refri.id, quantidade: 1 },
        ]),
      ),
    );
    expect(respostas.filter((r) => r.status === 201)).toHaveLength(5);
    expect(await estoqueDe(ctx.agua.id)).toBe(0);
    expect(await estoqueDe(ctx.refri.id)).toBe(45); // só as 5 vendas aceitas baixaram o refri
  });
});

describe('GET /vendas', () => {
  beforeEach(async () => {
    await vender(ctx.tokenVendedor, [{ produtoId: ctx.refri.id, quantidade: 1 }]);
    await vender(ctx.tokenGerente, [{ produtoId: ctx.refri.id, quantidade: 2 }]);
  });

  it('GERENTE vê todas as vendas', async () => {
    const res = await api().get('/vendas').set('Authorization', ctx.tokenGerente);
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(2);
    expect(res.body.data[0].total).toBe(20); // mais recente primeiro
  });

  it('GERENTE pode filtrar por vendedor', async () => {
    const res = await api().get(`/vendas?usuarioId=${ctx.vendedor.id}`).set('Authorization', ctx.tokenGerente);
    expect(res.body.meta.total).toBe(1);
  });

  it('VENDEDOR vê apenas as próprias vendas', async () => {
    const res = await api().get('/vendas').set('Authorization', ctx.tokenVendedor);
    expect(res.body.meta.total).toBe(1);
    expect(res.body.data[0].usuario.id).toBe(ctx.vendedor.id);
  });

  it('filtra por período', async () => {
    const res = await api().get('/vendas?de=2020-01-01&ate=2020-12-31').set('Authorization', ctx.tokenGerente);
    expect(res.body.meta.total).toBe(0);
  });

  it('GET /vendas/:id respeita o dono da venda', async () => {
    const lista = await api().get('/vendas').set('Authorization', ctx.tokenGerente);
    const doGerente = lista.body.data.find((v: { usuario: { id: number } }) => v.usuario.id === ctx.gerente.id);

    const ok = await api().get(`/vendas/${doGerente.id}`).set('Authorization', ctx.tokenGerente);
    expect(ok.status).toBe(200);
    expect(ok.body.itens[0]).toMatchObject({ quantidade: 2, precoUnitario: 10, subtotal: 20 });

    const bloqueado = await api().get(`/vendas/${doGerente.id}`).set('Authorization', ctx.tokenVendedor);
    expect(bloqueado.status).toBe(404);
  });
});
