import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { money, periodo } from '../utils/http';
import { toCsv } from '../utils/csv';
import { filtroAbaixoMinimo } from './produto.service';

type Num = Prisma.Decimal | bigint | number | null;
const n = (v: Num) => (v === null ? 0 : Number(v));

function diasEntre(inicio: Date, fim: Date): string[] {
  const dias: string[] = [];
  const d = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth(), inicio.getUTCDate()));
  while (d <= fim && dias.length < 366) {
    dias.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return dias;
}

export async function resumo(de?: string, ate?: string) {
  const { inicio, fim } = periodo(de, ate);

  const [vendas, lucro, estoque, abaixoMinimo, porDia] = await Promise.all([
    prisma.venda.aggregate({ where: { criadoEm: { gte: inicio, lte: fim } }, _count: true, _sum: { total: true } }),
    prisma.$queryRaw<[{ lucro: Num; itens: Num; custo: Num }]>`
      SELECT SUM((vi.preco_unitario - vi.custo_unitario) * vi.quantidade) AS lucro,
             SUM(vi.quantidade) AS itens,
             SUM(vi.custo_unitario * vi.quantidade) AS custo
      FROM venda_item vi JOIN venda v ON v.id = vi.venda_id
      WHERE v.criado_em BETWEEN ${inicio} AND ${fim}`,
    prisma.$queryRaw<[{ custo: Num; venda: Num; unidades: Num; produtos: Num }]>`
      SELECT SUM(estoque_atual * preco_custo) AS custo, SUM(estoque_atual * preco_venda) AS venda,
             SUM(estoque_atual) AS unidades, COUNT(*) AS produtos
      FROM produto WHERE ativo = true`,
    prisma.produto.count({ where: { ativo: true, ...filtroAbaixoMinimo } }),
    prisma.$queryRaw<{ dia: Date | string; quantidade: Num; total: Num }[]>`
      SELECT DATE(criado_em) AS dia, COUNT(*) AS quantidade, SUM(total) AS total
      FROM venda WHERE criado_em BETWEEN ${inicio} AND ${fim}
      GROUP BY DATE(criado_em) ORDER BY dia`,
  ]);

  const faturamento = money(vendas._sum.total);
  const mapaDias = new Map(
    porDia.map((d) => [
      d.dia instanceof Date ? d.dia.toISOString().slice(0, 10) : String(d.dia).slice(0, 10),
      { quantidade: n(d.quantidade), total: money(n(d.total)) },
    ]),
  );

  return {
    periodo: { de: inicio.toISOString().slice(0, 10), ate: fim.toISOString().slice(0, 10) },
    vendas: {
      quantidade: vendas._count,
      faturamento,
      ticketMedio: vendas._count ? money(faturamento / vendas._count) : 0,
      itensVendidos: n(lucro[0].itens),
      custoMercadoria: money(n(lucro[0].custo)),
      lucroBruto: money(n(lucro[0].lucro)),
      margemBruta: faturamento ? Math.round((n(lucro[0].lucro) / faturamento) * 1000) / 10 : 0,
    },
    estoque: {
      produtosAtivos: n(estoque[0].produtos),
      unidades: n(estoque[0].unidades),
      valorCusto: money(n(estoque[0].custo)),
      valorVenda: money(n(estoque[0].venda)),
      produtosAbaixoMinimo: abaixoMinimo,
    },
    vendasPorDia: diasEntre(inicio, fim).map((dia) => ({ dia, ...(mapaDias.get(dia) ?? { quantidade: 0, total: 0 }) })),
  };
}

export async function maisVendidos(de: string | undefined, ate: string | undefined, limite: number) {
  const { inicio, fim } = periodo(de, ate);
  const linhas = await prisma.$queryRaw<{ id: number; sku: string; nome: string; quantidade: Num; receita: Num; lucro: Num }[]>`
    SELECT p.id, p.sku, p.nome,
           SUM(vi.quantidade) AS quantidade,
           SUM(vi.preco_unitario * vi.quantidade) AS receita,
           SUM((vi.preco_unitario - vi.custo_unitario) * vi.quantidade) AS lucro
    FROM venda_item vi
    JOIN venda v ON v.id = vi.venda_id
    JOIN produto p ON p.id = vi.produto_id
    WHERE v.criado_em BETWEEN ${inicio} AND ${fim}
    GROUP BY p.id, p.sku, p.nome
    ORDER BY quantidade DESC, receita DESC
    LIMIT ${limite}`;

  return linhas.map((l) => ({
    produtoId: Number(l.id),
    sku: l.sku,
    nome: l.nome,
    quantidade: n(l.quantidade),
    receita: money(n(l.receita)),
    lucro: money(n(l.lucro)),
  }));
}

export async function estoqueBaixo() {
  const produtos = await prisma.produto.findMany({
    where: { ativo: true, ...filtroAbaixoMinimo },
    include: { categoria: { select: { nome: true } } },
  });
  return produtos
    .map((p) => ({
      produtoId: p.id,
      sku: p.sku,
      nome: p.nome,
      categoria: p.categoria.nome,
      estoqueAtual: p.estoqueAtual,
      estoqueMinimo: p.estoqueMinimo,
      faltam: Math.max(0, p.estoqueMinimo - p.estoqueAtual),
      situacao: p.estoqueAtual === 0 ? 'ZERADO' : 'BAIXO',
    }))
    .sort((a, b) => a.estoqueAtual - b.estoqueAtual || b.faltam - a.faltam);
}

const brl = (v: number) => v.toFixed(2).replace('.', ',');

export async function exportarCsv(tipo: 'vendas' | 'mais-vendidos' | 'estoque' | 'movimentacoes', de?: string, ate?: string) {
  const { inicio, fim } = periodo(de, ate);
  const sufixo = `${inicio.toISOString().slice(0, 10)}_${fim.toISOString().slice(0, 10)}`;

  if (tipo === 'vendas') {
    const itens = await prisma.vendaItem.findMany({
      where: { venda: { criadoEm: { gte: inicio, lte: fim } } },
      include: { venda: { include: { usuario: { select: { nome: true } } } }, produto: { select: { sku: true, nome: true } } },
      orderBy: [{ venda: { criadoEm: 'asc' } }, { id: 'asc' }],
    });
    const csv = toCsv(
      ['venda_id', 'data', 'vendedor', 'sku', 'produto', 'quantidade', 'preco_unitario', 'subtotal', 'lucro_bruto'],
      itens.map((i) => [
        i.vendaId,
        i.venda.criadoEm,
        i.venda.usuario.nome,
        i.produto.sku,
        i.produto.nome,
        i.quantidade,
        brl(Number(i.precoUnitario)),
        brl(Number(i.precoUnitario) * i.quantidade),
        brl((Number(i.precoUnitario) - Number(i.custoUnitario)) * i.quantidade),
      ]),
    );
    return { nome: `vendas_${sufixo}.csv`, csv };
  }

  if (tipo === 'mais-vendidos') {
    const linhas = await maisVendidos(de, ate, 100);
    const csv = toCsv(
      ['posicao', 'sku', 'produto', 'quantidade', 'receita', 'lucro_bruto'],
      linhas.map((l, i) => [i + 1, l.sku, l.nome, l.quantidade, brl(l.receita), brl(l.lucro)]),
    );
    return { nome: `mais-vendidos_${sufixo}.csv`, csv };
  }

  if (tipo === 'movimentacoes') {
    const movs = await prisma.movimentacao.findMany({
      where: { criadoEm: { gte: inicio, lte: fim } },
      include: { produto: { select: { sku: true, nome: true } }, usuario: { select: { nome: true } } },
      orderBy: [{ criadoEm: 'asc' }, { id: 'asc' }],
    });
    const csv = toCsv(
      ['id', 'data', 'tipo', 'sku', 'produto', 'quantidade', 'estoque_anterior', 'estoque_posterior', 'motivo', 'usuario'],
      movs.map((m) => [
        m.id,
        m.criadoEm,
        m.tipo,
        m.produto.sku,
        m.produto.nome,
        m.quantidade,
        m.estoqueAnterior,
        m.estoquePosterior,
        m.motivo,
        m.usuario.nome,
      ]),
    );
    return { nome: `movimentacoes_${sufixo}.csv`, csv };
  }

  const produtos = await prisma.produto.findMany({
    where: { ativo: true },
    include: { categoria: { select: { nome: true } } },
    orderBy: { nome: 'asc' },
  });
  const csv = toCsv(
    ['sku', 'produto', 'categoria', 'estoque_atual', 'estoque_minimo', 'preco_custo', 'preco_venda', 'valor_em_estoque_custo'],
    produtos.map((p) => [
      p.sku,
      p.nome,
      p.categoria.nome,
      p.estoqueAtual,
      p.estoqueMinimo,
      brl(Number(p.precoCusto)),
      brl(Number(p.precoVenda)),
      brl(Number(p.precoCusto) * p.estoqueAtual),
    ]),
  );
  return { nome: `estoque_${new Date().toISOString().slice(0, 10)}.csv`, csv };
}
