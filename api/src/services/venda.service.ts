import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import { money, paginate, periodo } from '../utils/http';
import type { UsuarioToken } from '../middlewares/auth';
import type { VendaInput, VendaListQuery } from '../schemas';
import { travarProdutos } from './movimentacao.service';

const incluirDetalhes = {
  usuario: { select: { id: true, nome: true } },
  itens: { include: { produto: { select: { id: true, sku: true, nome: true } } } },
} satisfies Prisma.VendaInclude;

type VendaDetalhada = Prisma.VendaGetPayload<{ include: typeof incluirDetalhes }>;

function serializar(v: VendaDetalhada) {
  return {
    id: v.id,
    total: money(v.total),
    criadoEm: v.criadoEm,
    usuario: v.usuario,
    itens: v.itens.map((i) => ({
      id: i.id,
      produto: i.produto,
      quantidade: i.quantidade,
      precoUnitario: money(i.precoUnitario),
      subtotal: money(Number(i.precoUnitario) * i.quantidade),
    })),
  };
}

/**
 * Registra uma venda com vários itens em uma única transação:
 * trava as linhas dos produtos, confere o estoque de todos, grava a venda,
 * baixa o estoque e registra as movimentações de saída. Qualquer falha desfaz tudo.
 */
export async function criar(dados: VendaInput, usuarioId: number) {
  // Agrupa itens repetidos do mesmo produto
  const quantidades = new Map<number, number>();
  for (const item of dados.itens) {
    quantidades.set(item.produtoId, (quantidades.get(item.produtoId) ?? 0) + item.quantidade);
  }
  const ids = [...quantidades.keys()];

  const venda = await prisma.$transaction(
    async (tx) => {
      const estoques = await travarProdutos(tx, ids);
      const produtos = await tx.produto.findMany({ where: { id: { in: ids } } });
      const porId = new Map(produtos.map((p) => [p.id, p]));

      const inexistentes = ids.filter((id) => !porId.get(id)?.ativo);
      if (inexistentes.length) {
        throw AppError.unprocessable('Produto(s) inexistente(s) ou inativo(s)', { produtoIds: inexistentes });
      }

      const insuficientes = ids
        .map((id) => ({
          produtoId: id,
          nome: porId.get(id)!.nome,
          disponivel: estoques.get(id)!,
          solicitado: quantidades.get(id)!,
        }))
        .filter((i) => i.solicitado > i.disponivel);
      if (insuficientes.length) {
        throw AppError.unprocessable('Estoque insuficiente para concluir a venda', { itens: insuficientes });
      }

      let total = new Prisma.Decimal(0);
      const itens = ids.map((id) => {
        const p = porId.get(id)!;
        const quantidade = quantidades.get(id)!;
        total = total.add(p.precoVenda.mul(quantidade));
        return { produtoId: id, quantidade, precoUnitario: p.precoVenda, custoUnitario: p.precoCusto };
      });

      const criada = await tx.venda.create({ data: { usuarioId, total, itens: { create: itens } } });

      for (const id of ids) {
        const anterior = estoques.get(id)!;
        const quantidade = quantidades.get(id)!;
        await tx.produto.update({ where: { id }, data: { estoqueAtual: { decrement: quantidade } } });
        await tx.movimentacao.create({
          data: {
            produtoId: id,
            tipo: 'SAIDA',
            quantidade,
            estoqueAnterior: anterior,
            estoquePosterior: anterior - quantidade,
            motivo: `Venda #${criada.id}`,
            usuarioId,
            vendaId: criada.id,
          },
        });
      }

      return tx.venda.findUniqueOrThrow({ where: { id: criada.id }, include: incluirDetalhes });
    },
    { timeout: 15_000, maxWait: 15_000 },
  );

  return serializar(venda);
}

/** Vendedores só enxergam as próprias vendas; gerentes veem todas. */
export async function listar(q: VendaListQuery, usuario: UsuarioToken) {
  const where: Prisma.VendaWhereInput = {
    usuarioId: usuario.perfil === 'VENDEDOR' ? usuario.id : q.usuarioId,
  };
  if (q.de || q.ate) {
    const { inicio, fim } = periodo(q.de, q.ate);
    where.criadoEm = { gte: q.de ? inicio : undefined, lte: q.ate ? fim : undefined };
  }

  const [total, vendas] = await prisma.$transaction([
    prisma.venda.count({ where }),
    prisma.venda.findMany({
      where,
      orderBy: [{ criadoEm: 'desc' }, { id: 'desc' }],
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: incluirDetalhes,
    }),
  ]);
  return paginate(vendas.map(serializar), total, q.page, q.pageSize);
}

export async function buscar(id: number, usuario: UsuarioToken) {
  const venda = await prisma.venda.findUnique({ where: { id }, include: incluirDetalhes });
  if (!venda || (usuario.perfil === 'VENDEDOR' && venda.usuarioId !== usuario.id)) {
    throw AppError.notFound('Venda não encontrada');
  }
  return serializar(venda);
}
