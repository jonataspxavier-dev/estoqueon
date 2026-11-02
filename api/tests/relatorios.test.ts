import { api, prepararBanco, prisma, type Contexto } from './helpers';

let ctx: Contexto;
const hoje = new Date().toISOString().slice(0, 10);

beforeAll(async () => {
  ctx = await prepararBanco();
  // refri: venda 10, custo 5 | agua: venda 2,50, custo 1
  await api()
    .post('/vendas')
    .set('Authorization', ctx.tokenVendedor)
    .send({
      itens: [
        { produtoId: ctx.refri.id, quantidade: 4 },
        { produtoId: ctx.agua.id, quantidade: 2 },
      ],
    });
  await api()
    .post('/vendas')
    .set('Authorization', ctx.tokenGerente)
    .send({ itens: [{ produtoId: ctx.agua.id, quantidade: 1 }] });
});
afterAll(() => prisma.$disconnect());

describe('GET /relatorios/resumo', () => {
  it('calcula faturamento, lucro bruto, ticket médio e valor em estoque', async () => {
    const res = await api().get(`/relatorios/resumo?de=${hoje}&ate=${hoje}`).set('Authorization', ctx.tokenGerente);
    expect(res.status).toBe(200);
    expect(res.body.vendas).toEqual({
      quantidade: 2,
      faturamento: 47.5, // 40 + 5 + 2,50
      ticketMedio: 23.75,
      itensVendidos: 7,
      custoMercadoria: 23, // 4×5 + 3×1
      lucroBruto: 24.5,
      margemBruta: 51.6,
    });
    // Estoque restante: refri 46×5 + agua 2×1 + detergente 1×1,5 (custo)
    expect(res.body.estoque).toEqual({
      produtosAtivos: 3,
      unidades: 49,
      valorCusto: 233.5,
      valorVenda: 468,
      produtosAbaixoMinimo: 2,
    });
    expect(res.body.vendasPorDia).toEqual([{ dia: hoje, quantidade: 2, total: 47.5 }]);
  });

  it('por padrão considera os últimos 30 dias, com um ponto por dia', async () => {
    const res = await api().get('/relatorios/resumo').set('Authorization', ctx.tokenVendedor);
    expect(res.status).toBe(200);
    expect(res.body.vendasPorDia).toHaveLength(30);
    expect(res.body.vendasPorDia.at(-1)).toEqual({ dia: hoje, quantidade: 2, total: 47.5 });
  });

  it('período sem vendas retorna zeros', async () => {
    const res = await api().get('/relatorios/resumo?de=2020-01-01&ate=2020-01-03').set('Authorization', ctx.tokenGerente);
    expect(res.body.vendas).toMatchObject({ quantidade: 0, faturamento: 0, lucroBruto: 0, ticketMedio: 0 });
    expect(res.body.vendasPorDia).toHaveLength(3);
  });

  it('recusa período invertido', async () => {
    const res = await api().get('/relatorios/resumo?de=2026-02-01&ate=2026-01-01').set('Authorization', ctx.tokenGerente);
    expect(res.status).toBe(400);
  });
});

describe('GET /relatorios/mais-vendidos', () => {
  it('ordena por quantidade vendida', async () => {
    const res = await api().get(`/relatorios/mais-vendidos?de=${hoje}&ate=${hoje}`).set('Authorization', ctx.tokenGerente);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { produtoId: ctx.refri.id, sku: 'REF-1', nome: 'Refrigerante 2L', quantidade: 4, receita: 40, lucro: 20 },
      { produtoId: ctx.agua.id, sku: 'AGU-1', nome: 'Água 500ml', quantidade: 3, receita: 7.5, lucro: 4.5 },
    ]);
  });

  it('respeita o limite', async () => {
    const res = await api().get('/relatorios/mais-vendidos?limite=1').set('Authorization', ctx.tokenGerente);
    expect(res.body).toHaveLength(1);
  });
});

describe('GET /relatorios/exportar.csv', () => {
  it('exporta vendas em CSV com cabeçalho e uma linha por item', async () => {
    const res = await api()
      .get(`/relatorios/exportar.csv?tipo=vendas&de=${hoje}&ate=${hoje}`)
      .set('Authorization', ctx.tokenGerente);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toBe(`attachment; filename="vendas_${hoje}_${hoje}.csv"`);
    const linhas = res.text.replace('﻿', '').trim().split('\r\n');
    expect(linhas[0]).toBe('venda_id;data;vendedor;sku;produto;quantidade;preco_unitario;subtotal;lucro_bruto');
    expect(linhas).toHaveLength(4);
    expect(linhas.some((l) => l.includes('REF-1;Refrigerante 2L;4;10,00;40,00;20,00'))).toBe(true);
  });

  it.each(['mais-vendidos', 'estoque', 'movimentacoes'])('exporta o tipo %s', async (tipo) => {
    const res = await api().get(`/relatorios/exportar.csv?tipo=${tipo}`).set('Authorization', ctx.tokenGerente);
    expect(res.status).toBe(200);
    expect(res.text.split('\r\n').length).toBeGreaterThan(2);
  });

  it('valida o tipo', async () => {
    const res = await api().get('/relatorios/exportar.csv?tipo=senhas').set('Authorization', ctx.tokenGerente);
    expect(res.status).toBe(400);
  });
});

describe('GET /alertas/estoque-baixo', () => {
  it('lista produtos com estoque ≤ mínimo, os mais críticos primeiro', async () => {
    const res = await api().get('/alertas/estoque-baixo').set('Authorization', ctx.tokenVendedor);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      expect.objectContaining({ sku: 'DET-1', estoqueAtual: 1, estoqueMinimo: 2, faltam: 1, situacao: 'BAIXO' }),
      expect.objectContaining({ sku: 'AGU-1', estoqueAtual: 2, estoqueMinimo: 10, faltam: 8, situacao: 'BAIXO' }),
    ]);
  });

  it('não inclui produtos inativos', async () => {
    await prisma.produto.update({ where: { id: ctx.detergente.id }, data: { ativo: false } });
    const res = await api().get('/alertas/estoque-baixo').set('Authorization', ctx.tokenVendedor);
    expect(res.body.map((a: { sku: string }) => a.sku)).toEqual(['AGU-1']);
  });
});
