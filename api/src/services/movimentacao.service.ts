import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import { paginate, periodo } from '../utils/http';
import type { MovimentacaoInput, MovimentacaoListQuery } from '../schemas';

type LinhaEstoque = { id: number; estoque_atual: number };

/** Bloqueia as linhas dos produtos (SELECT ... FOR UPDATE) em ordem de id para evitar deadlock. */
export async function travarProdutos(tx: Prisma.TransactionClient, ids: number[]) {
  const ordenados = [...new Set(ids)].sort((a, b) => a - b);
  const linhas = await tx.$queryRaw<LinhaEstoque[]>`
    SELECT id, estoque_atual FROM produto WHERE id IN (${Prisma.join(ordenados)}) ORDER BY id FOR UPDATE`;
  return new Map(linhas.map((l) => [Number(l.id), Number(l.estoque_atual)]));
}

export async function registrar(dados: MovimentacaoInput, usuarioId: number) {
  return prisma.$transaction(
    async (tx) => {
      const estoques = await travarProdutos(tx, [dados.produtoId]);
      const anterior = estoques.get(dados.produtoId);
      if (anterior === undefined) throw AppError.notFound('Produto não encontrado');

      let posterior: number;
      if (dados.tipo === 'ENTRADA') posterior = anterior + dados.quantidade;
      else if (dados.tipo === 'SAIDA') posterior = anterior - dados.quantidade;
      else posterior = dados.quantidade; // AJUSTE: quantidade = estoque contado

      if (posterior < 0) {
        throw AppError.unprocessable(`Estoque insuficiente: disponível ${anterior}, solicitado ${dados.quantidade}`, {
          produtoId: dados.produtoId,
          disponivel: anterior,
          solicitado: dados.quantidade,
        });
      }

      await tx.produto.update({ where: { id: dados.produtoId }, data: { estoqueAtual: posterior } });
      return tx.movimentacao.create({
        data: {
          produtoId: dados.produtoId,
          tipo: dados.tipo,
          quantidade: dados.tipo === 'AJUSTE' ? posterior - anterior : dados.quantidade,
          estoqueAnterior: anterior,
          estoquePosterior: posterior,
          motivo: dados.motivo,
          usuarioId,
        },
        include: { produto: { select: { id: true, sku: true, nome: true } }, usuario: { select: { id: true, nome: true } } },
      });
    },
    { timeout: 10_000, maxWait: 10_000 },
  );
}

export async function listar(q: MovimentacaoListQuery) {
  const where: Prisma.MovimentacaoWhereInput = { produtoId: q.produtoId, tipo: q.tipo };
  if (q.de || q.ate) {
    const { inicio, fim } = periodo(q.de, q.ate);
    where.criadoEm = { gte: q.de ? inicio : undefined, lte: q.ate ? fim : undefined };
  }

  const [total, itens] = await prisma.$transaction([
    prisma.movimentacao.count({ where }),
    prisma.movimentacao.findMany({
      where,
      orderBy: [{ criadoEm: 'desc' }, { id: 'desc' }],
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: { produto: { select: { id: true, sku: true, nome: true } }, usuario: { select: { id: true, nome: true } } },
    }),
  ]);
  return paginate(itens, total, q.page, q.pageSize);
}
