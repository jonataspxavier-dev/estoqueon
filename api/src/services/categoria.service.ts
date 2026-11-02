import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';

export async function listar() {
  const categorias = await prisma.categoria.findMany({
    orderBy: { nome: 'asc' },
    include: { _count: { select: { produtos: true } } },
  });
  return categorias.map(({ _count, ...c }) => ({ ...c, totalProdutos: _count.produtos }));
}

export async function buscar(id: number) {
  const categoria = await prisma.categoria.findUnique({ where: { id } });
  if (!categoria) throw AppError.notFound('Categoria não encontrada');
  return categoria;
}

export async function criar(nome: string) {
  return prisma.categoria.create({ data: { nome } });
}

export async function atualizar(id: number, nome: string) {
  await buscar(id);
  return prisma.categoria.update({ where: { id }, data: { nome } });
}

export async function remover(id: number) {
  await buscar(id);
  const produtos = await prisma.produto.count({ where: { categoriaId: id } });
  if (produtos > 0) {
    throw AppError.conflict(`Categoria possui ${produtos} produto(s) vinculado(s). Mova-os antes de excluir.`);
  }
  await prisma.categoria.delete({ where: { id } });
}
