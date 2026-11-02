import { diaLocal } from '../src/utils/http';
import { api, estoqueDe, prepararBanco, prisma, type Contexto } from './helpers';

let ctx: Contexto;
beforeEach(async () => {
  ctx = await prepararBanco();
});
afterAll(() => prisma.$disconnect());

const mov = (body: object) => api().post('/movimentacoes').set('Authorization', ctx.tokenGerente).send(body);

describe('POST /movimentacoes', () => {
  it('ENTRADA soma ao estoque e grava o histórico', async () => {
    const res = await mov({ produtoId: ctx.agua.id, tipo: 'ENTRADA', quantidade: 20, motivo: 'Compra NF 123' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      tipo: 'ENTRADA',
      quantidade: 20,
      estoqueAnterior: 5,
      estoquePosterior: 25,
      motivo: 'Compra NF 123',
      usuario: { id: ctx.gerente.id },
      produto: { sku: 'AGU-1' },
    });
    expect(await estoqueDe(ctx.agua.id)).toBe(25);
  });

  it('SAIDA subtrai do estoque', async () => {
    const res = await mov({ produtoId: ctx.refri.id, tipo: 'SAIDA', quantidade: 8, motivo: 'Avaria' });
    expect(res.status).toBe(201);
    expect(await estoqueDe(ctx.refri.id)).toBe(42);
  });

  it('SAIDA maior que o estoque é recusada e nada muda', async () => {
    const res = await mov({ produtoId: ctx.agua.id, tipo: 'SAIDA', quantidade: 6, motivo: 'Avaria' });
    expect(res.status).toBe(422);
    expect(res.body.detalhes).toMatchObject({ disponivel: 5, solicitado: 6 });
    expect(await estoqueDe(ctx.agua.id)).toBe(5);
    expect(await prisma.movimentacao.count()).toBe(0);
  });

  it('AJUSTE define o estoque contado e registra a diferença', async () => {
    const res = await mov({ produtoId: ctx.refri.id, tipo: 'AJUSTE', quantidade: 47, motivo: 'Inventário mensal' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ quantidade: -3, estoqueAnterior: 50, estoquePosterior: 47 });
    expect(await estoqueDe(ctx.refri.id)).toBe(47);
  });

  it('valida tipo, quantidade e motivo', async () => {
    const res = await mov({ produtoId: ctx.refri.id, tipo: 'ROUBO', quantidade: 0, motivo: '' });
    expect(res.status).toBe(400);
    const zero = await mov({ produtoId: ctx.refri.id, tipo: 'ENTRADA', quantidade: 0, motivo: 'Teste' });
    expect(zero.status).toBe(400);
    const ajusteNeg = await mov({ produtoId: ctx.refri.id, tipo: 'AJUSTE', quantidade: -1, motivo: 'Teste' });
    expect(ajusteNeg.status).toBe(400);
  });

  it('retorna 404 para produto inexistente', async () => {
    const res = await mov({ produtoId: 999999, tipo: 'ENTRADA', quantidade: 1, motivo: 'Teste' });
    expect(res.status).toBe(404);
  });

  it('é proibido para VENDEDOR', async () => {
    const res = await api()
      .post('/movimentacoes')
      .set('Authorization', ctx.tokenVendedor)
      .send({ produtoId: ctx.refri.id, tipo: 'ENTRADA', quantidade: 1, motivo: 'Teste' });
    expect(res.status).toBe(403);
  });
});

describe('GET /movimentacoes', () => {
  beforeEach(async () => {
    await mov({ produtoId: ctx.refri.id, tipo: 'ENTRADA', quantidade: 10, motivo: 'Compra' });
    await mov({ produtoId: ctx.agua.id, tipo: 'ENTRADA', quantidade: 10, motivo: 'Compra' });
    await mov({ produtoId: ctx.refri.id, tipo: 'SAIDA', quantidade: 2, motivo: 'Avaria' });
  });

  it('lista o histórico mais recente primeiro', async () => {
    const res = await api().get('/movimentacoes').set('Authorization', ctx.tokenVendedor);
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(3);
    expect(res.body.data[0]).toMatchObject({ tipo: 'SAIDA', produto: { sku: 'REF-1' } });
  });

  it('filtra por produto e tipo', async () => {
    const res = await api().get(`/movimentacoes?produtoId=${ctx.refri.id}&tipo=ENTRADA`).set('Authorization', ctx.tokenVendedor);
    expect(res.body.meta.total).toBe(1);
  });

  it('filtra por período', async () => {
    const hoje = diaLocal();
    const res = await api().get(`/movimentacoes?de=${hoje}&ate=${hoje}`).set('Authorization', ctx.tokenVendedor);
    expect(res.body.meta.total).toBe(3);
    const passado = await api().get('/movimentacoes?de=2020-01-01&ate=2020-01-31').set('Authorization', ctx.tokenVendedor);
    expect(passado.body.meta.total).toBe(0);
  });

  it('recusa data em formato inválido', async () => {
    const res = await api().get('/movimentacoes?de=01/01/2026').set('Authorization', ctx.tokenVendedor);
    expect(res.status).toBe(400);
  });
});
