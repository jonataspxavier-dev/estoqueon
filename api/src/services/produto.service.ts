import { Prisma, type Categoria, type Produto } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import { money, paginate } from '../utils/http';
import type { ProdutoCreate, ProdutoListQuery, ProdutoUpdate } from '../schemas';

export function serializarProduto(p: Produto & { categoria?: Categoria }) {
  return {
    id: p.id,
    sku: p.sku,
    nome: p.nome,
    categoriaId: p.categoriaId,
    categoria: p.categoria ? { id: p.categoria.id, nome: p.categoria.nome } : undefined,
    precoCusto: money(p.precoCusto),
    precoVenda: money(p.precoVenda),
    margem: Number(p.precoVenda) > 0 ? Math.round((1 - Number(p.precoCusto) / Number(p.precoVenda)) * 1000) / 10 : 0,
    estoqueAtual: p.estoqueAtual,
    estoqueMinimo: p.estoqueMinimo,
    abaixoMinimo: p.estoqueAtual <= p.estoqueMinimo,
    ativo: p.ativo,
  };
}

/** Produto "abaixo do mínimo" = estoque atual menor ou igual ao estoque mínimo */
export const filtroAbaixoMinimo: Prisma.ProdutoWhereInput = {
  estoqueAtual: { lte: prisma.produto.fields.estoqueMinimo },
};

export async function listar(q: ProdutoListQuery) {
  const where: Prisma.ProdutoWhereInput = {
    ativo: q.ativo ?? true,
    categoriaId: q.categoria,
    ...(q.busca ? { OR: [{ nome: { contains: q.busca } }, { sku: { contains: q.busca } }] } : {}),
    ...(q.abaixoMinimo === true ? filtroAbaixoMinimo : {}),
    ...(q.abaixoMinimo === false ? { estoqueAtual: { gt: prisma.produto.fields.estoqueMinimo } } : {}),
  };

  const [total, produtos] = await prisma.$transaction([
    prisma.produto.count({ where }),
    prisma.produto.findMany({
      where,
      include: { categoria: true },
      orderBy: [{ [q.ordenar]: q.direcao }, { id: 'asc' }],
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
  ]);

  return paginate(produtos.map(serializarProduto), total, q.page, q.pageSize);
}

export async function buscar(id: number) {
  const produto = await prisma.produto.findUnique({ where: { id }, include: { categoria: true } });
  if (!produto) throw AppError.notFound('Produto não encontrado');
  return serializarProduto(produto);
}

async function garantirCategoria(categoriaId: number) {
  const existe = await prisma.categoria.findUnique({ where: { id: categoriaId }, select: { id: true } });
  if (!existe) throw AppError.badRequest('Categoria informada não existe');
}

function validarPrecos(precoCusto?: number, precoVenda?: number) {
  if (precoCusto !== undefined && precoVenda !== undefined && precoVenda < precoCusto) {
    throw AppError.unprocessable('Preço de venda não pode ser menor que o preço de custo');
  }
}

export async function criar(dados: ProdutoCreate, usuarioId: number) {
  await garantirCategoria(dados.categoriaId);
  validarPrecos(dados.precoCusto, dados.precoVenda);

  const produto = await prisma.$transaction(async (tx) => {
    const criado = await tx.produto.create({ data: dados, include: { categoria: true } });
    // Estoque inicial fica registrado no histórico
    if (dados.estoqueAtual > 0) {
      await tx.movimentacao.create({
        data: {
          produtoId: criado.id,
          tipo: 'ENTRADA',
          quantidade: dados.estoqueAtual,
          estoqueAnterior: 0,
          estoquePosterior: dados.estoqueAtual,
          motivo: 'Estoque inicial no cadastro',
          usuarioId,
        },
      });
    }
    return criado;
  });
  return serializarProduto(produto);
}

export async function atualizar(id: number, dados: ProdutoUpdate) {
  const atual = await prisma.produto.findUnique({ where: { id } });
  if (!atual) throw AppError.notFound('Produto não encontrado');
  if (dados.categoriaId) await garantirCategoria(dados.categoriaId);
  validarPrecos(dados.precoCusto ?? Number(atual.precoCusto), dados.precoVenda ?? Number(atual.precoVenda));

  const produto = await prisma.produto.update({ where: { id }, data: dados, include: { categoria: true } });
  return serializarProduto(produto);
}

/** Exclusão lógica: produtos com histórico não podem sumir do banco */
export async function remover(id: number) {
  const atual = await prisma.produto.findUnique({ where: { id } });
  if (!atual) throw AppError.notFound('Produto não encontrado');
  await prisma.produto.update({ where: { id }, data: { ativo: false } });
}
