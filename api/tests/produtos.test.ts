import { api, prepararBanco, prisma, type Contexto } from './helpers';

let ctx: Contexto;
beforeEach(async () => {
  ctx = await prepararBanco();
});
afterAll(() => prisma.$disconnect());

const novoProduto = () => ({
  sku: 'cer-1',
  nome: 'Cerveja Lata',
  categoriaId: ctx.bebidas.id,
  precoCusto: 2.5,
  precoVenda: 4.99,
  estoqueAtual: 24,
  estoqueMinimo: 12,
});

describe('GET /produtos', () => {
  it('lista com paginação e ordenação por nome', async () => {
    const res = await api().get('/produtos?pageSize=2').set('Authorization', ctx.tokenVendedor);
    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ page: 1, pageSize: 2, total: 3, totalPages: 2 });
    expect(res.body.data.map((p: { nome: string }) => p.nome)).toEqual(['Água 500ml', 'Detergente']);
    expect(res.body.data[0]).toMatchObject({ precoVenda: 2.5, categoria: { nome: 'Bebidas' }, abaixoMinimo: true });
  });

  it('segunda página', async () => {
    const res = await api().get('/produtos?pageSize=2&page=2').set('Authorization', ctx.tokenVendedor);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].nome).toBe('Refrigerante 2L');
  });

  it('busca por nome ou SKU', async () => {
    const porNome = await api().get('/produtos?busca=refri').set('Authorization', ctx.tokenVendedor);
    expect(porNome.body.data.map((p: { sku: string }) => p.sku)).toEqual(['REF-1']);
    const porSku = await api().get('/produtos?busca=DET').set('Authorization', ctx.tokenVendedor);
    expect(porSku.body.data.map((p: { sku: string }) => p.sku)).toEqual(['DET-1']);
  });

  it('filtra por categoria e por abaixo do mínimo', async () => {
    const cat = await api().get(`/produtos?categoria=${ctx.limpeza.id}`).set('Authorization', ctx.tokenVendedor);
    expect(cat.body.meta.total).toBe(1);

    const baixo = await api().get('/produtos?abaixoMinimo=true').set('Authorization', ctx.tokenVendedor);
    expect(baixo.body.data.map((p: { sku: string }) => p.sku).sort()).toEqual(['AGU-1', 'DET-1']);

    const ok = await api().get('/produtos?abaixoMinimo=false').set('Authorization', ctx.tokenVendedor);
    expect(ok.body.data.map((p: { sku: string }) => p.sku)).toEqual(['REF-1']);
  });

  it('estoque exatamente igual ao mínimo já conta como abaixo do mínimo', async () => {
    await prisma.produto.update({ where: { id: ctx.refri.id }, data: { estoqueAtual: 10, estoqueMinimo: 10 } });

    const baixo = await api().get('/produtos?abaixoMinimo=true').set('Authorization', ctx.tokenVendedor);
    expect(baixo.body.data.map((p: { sku: string }) => p.sku)).toContain('REF-1');

    const alertas = await api().get('/alertas/estoque-baixo').set('Authorization', ctx.tokenVendedor);
    expect(alertas.body).toContainEqual(
      expect.objectContaining({ sku: 'REF-1', estoqueAtual: 10, estoqueMinimo: 10, faltam: 0 }),
    );
  });

  it('valida parâmetros de consulta', async () => {
    const res = await api().get('/produtos?pageSize=1000&abaixoMinimo=talvez').set('Authorization', ctx.tokenVendedor);
    expect(res.status).toBe(400);
  });

  it('GET /produtos/:id retorna o produto ou 404', async () => {
    const ok = await api().get(`/produtos/${ctx.refri.id}`).set('Authorization', ctx.tokenVendedor);
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ sku: 'REF-1', precoCusto: 5, precoVenda: 10, margem: 50 });
    const nao = await api().get('/produtos/999999').set('Authorization', ctx.tokenVendedor);
    expect(nao.status).toBe(404);
  });
});

describe('POST /produtos', () => {
  it('cria produto e registra o estoque inicial no histórico', async () => {
    const res = await api().post('/produtos').set('Authorization', ctx.tokenGerente).send(novoProduto());
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ sku: 'CER-1', estoqueAtual: 24, abaixoMinimo: false });

    const movs = await prisma.movimentacao.findMany({ where: { produtoId: res.body.id } });
    expect(movs).toHaveLength(1);
    expect(movs[0]).toMatchObject({ tipo: 'ENTRADA', quantidade: 24, estoqueAnterior: 0, estoquePosterior: 24 });
  });

  it('é proibido para VENDEDOR', async () => {
    const res = await api().post('/produtos').set('Authorization', ctx.tokenVendedor).send(novoProduto());
    expect(res.status).toBe(403);
  });

  it('recusa SKU duplicado', async () => {
    const res = await api()
      .post('/produtos')
      .set('Authorization', ctx.tokenGerente)
      .send({ ...novoProduto(), sku: 'ref-1' });
    expect(res.status).toBe(409);
  });

  it('recusa categoria inexistente', async () => {
    const res = await api()
      .post('/produtos')
      .set('Authorization', ctx.tokenGerente)
      .send({ ...novoProduto(), categoriaId: 999999 });
    expect(res.status).toBe(400);
  });

  it('recusa preço de venda menor que o custo', async () => {
    const res = await api()
      .post('/produtos')
      .set('Authorization', ctx.tokenGerente)
      .send({ ...novoProduto(), precoVenda: 1 });
    expect(res.status).toBe(422);
  });

  it('valida campos (negativos, casas decimais, campos extras)', async () => {
    const res = await api()
      .post('/produtos')
      .set('Authorization', ctx.tokenGerente)
      .send({ ...novoProduto(), precoCusto: -1, precoVenda: 1.999, estoqueMinimo: -2, hack: true });
    expect(res.status).toBe(400);
    const campos = res.body.detalhes.map((d: { campo: string }) => d.campo);
    expect(campos).toEqual(expect.arrayContaining(['precoCusto', 'precoVenda', 'estoqueMinimo']));
  });
});

describe('PUT/DELETE /produtos/:id', () => {
  it('atualiza dados do produto', async () => {
    const res = await api()
      .put(`/produtos/${ctx.refri.id}`)
      .set('Authorization', ctx.tokenGerente)
      .send({ nome: 'Refrigerante Cola 2L', precoVenda: 11.5, estoqueMinimo: 60 });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ nome: 'Refrigerante Cola 2L', precoVenda: 11.5, abaixoMinimo: true });
  });

  it('não permite alterar o estoque diretamente', async () => {
    const res = await api().put(`/produtos/${ctx.refri.id}`).set('Authorization', ctx.tokenGerente).send({ estoqueAtual: 999 });
    expect(res.status).toBe(400);
  });

  it('valida preço contra o valor já salvo', async () => {
    const res = await api().put(`/produtos/${ctx.refri.id}`).set('Authorization', ctx.tokenGerente).send({ precoVenda: 4 });
    expect(res.status).toBe(422);
  });

  it('PUT retorna 404 para produto inexistente', async () => {
    const res = await api().put('/produtos/999999').set('Authorization', ctx.tokenGerente).send({ nome: 'Novo nome' });
    expect(res.status).toBe(404);
  });

  it('DELETE desativa (exclusão lógica) e some da listagem padrão', async () => {
    const del = await api().delete(`/produtos/${ctx.agua.id}`).set('Authorization', ctx.tokenGerente);
    expect(del.status).toBe(204);
    expect((await prisma.produto.findUniqueOrThrow({ where: { id: ctx.agua.id } })).ativo).toBe(false);

    const lista = await api().get('/produtos').set('Authorization', ctx.tokenGerente);
    expect(lista.body.data.map((p: { sku: string }) => p.sku)).not.toContain('AGU-1');
    const inativos = await api().get('/produtos?ativo=false').set('Authorization', ctx.tokenGerente);
    expect(inativos.body.data.map((p: { sku: string }) => p.sku)).toEqual(['AGU-1']);
  });

  it('DELETE é proibido para VENDEDOR', async () => {
    const res = await api().delete(`/produtos/${ctx.agua.id}`).set('Authorization', ctx.tokenVendedor);
    expect(res.status).toBe(403);
  });
});
