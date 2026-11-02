import { api, prepararBanco, prisma, type Contexto } from './helpers';

let ctx: Contexto;
beforeEach(async () => {
  ctx = await prepararBanco();
});
afterAll(() => prisma.$disconnect());

describe('Categorias', () => {
  it('GET lista categorias com total de produtos (qualquer perfil)', async () => {
    const res = await api().get('/categorias').set('Authorization', ctx.tokenVendedor);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: ctx.bebidas.id, nome: 'Bebidas', totalProdutos: 2 },
      { id: ctx.limpeza.id, nome: 'Limpeza', totalProdutos: 1 },
    ]);
  });

  it('POST cria categoria (GERENTE)', async () => {
    const res = await api().post('/categorias').set('Authorization', ctx.tokenGerente).send({ nome: '  Padaria ' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ nome: 'Padaria' });
  });

  it('POST é proibido para VENDEDOR', async () => {
    const res = await api().post('/categorias').set('Authorization', ctx.tokenVendedor).send({ nome: 'Padaria' });
    expect(res.status).toBe(403);
  });

  it('POST recusa nome duplicado com 409', async () => {
    const res = await api().post('/categorias').set('Authorization', ctx.tokenGerente).send({ nome: 'Bebidas' });
    expect(res.status).toBe(409);
  });

  it('POST valida o nome', async () => {
    const res = await api().post('/categorias').set('Authorization', ctx.tokenGerente).send({ nome: 'x' });
    expect(res.status).toBe(400);
  });

  it('PUT renomeia categoria', async () => {
    const res = await api()
      .put(`/categorias/${ctx.limpeza.id}`)
      .set('Authorization', ctx.tokenGerente)
      .send({ nome: 'Limpeza e Casa' });
    expect(res.status).toBe(200);
    expect(res.body.nome).toBe('Limpeza e Casa');
  });

  it('PUT retorna 404 para categoria inexistente', async () => {
    const res = await api().put('/categorias/999999').set('Authorization', ctx.tokenGerente).send({ nome: 'Outra' });
    expect(res.status).toBe(404);
  });

  it('DELETE recusa categoria com produtos (409)', async () => {
    const res = await api().delete(`/categorias/${ctx.bebidas.id}`).set('Authorization', ctx.tokenGerente);
    expect(res.status).toBe(409);
  });

  it('DELETE remove categoria vazia', async () => {
    const nova = await prisma.categoria.create({ data: { nome: 'Vazia' } });
    const res = await api().delete(`/categorias/${nova.id}`).set('Authorization', ctx.tokenGerente);
    expect(res.status).toBe(204);
    expect(await prisma.categoria.findUnique({ where: { id: nova.id } })).toBeNull();
  });

  it('DELETE com id inválido retorna 400', async () => {
    const res = await api().delete('/categorias/abc').set('Authorization', ctx.tokenGerente);
    expect(res.status).toBe(400);
  });
});
