import bcrypt from 'bcryptjs';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';

export const app = createApp();
export const api = () => request(app);
export { prisma };

export type Contexto = Awaited<ReturnType<typeof prepararBanco>>;

/** Limpa o banco e cria um cenário base: 2 usuários, 2 categorias e 3 produtos. */
export async function prepararBanco() {
  await prisma.movimentacao.deleteMany();
  await prisma.vendaItem.deleteMany();
  await prisma.venda.deleteMany();
  await prisma.produto.deleteMany();
  await prisma.categoria.deleteMany();
  await prisma.usuario.deleteMany();

  const senhaHash = await bcrypt.hash('senha123', 4);
  const gerente = await prisma.usuario.create({
    data: { nome: 'Gerente Teste', email: 'gerente@teste.com', senhaHash, perfil: 'GERENTE' },
  });
  const vendedor = await prisma.usuario.create({
    data: { nome: 'Vendedor Teste', email: 'vendedor@teste.com', senhaHash, perfil: 'VENDEDOR' },
  });

  const bebidas = await prisma.categoria.create({ data: { nome: 'Bebidas' } });
  const limpeza = await prisma.categoria.create({ data: { nome: 'Limpeza' } });

  const refri = await prisma.produto.create({
    data: {
      sku: 'REF-1',
      nome: 'Refrigerante 2L',
      categoriaId: bebidas.id,
      precoCusto: 5,
      precoVenda: 10,
      estoqueAtual: 50,
      estoqueMinimo: 10,
    },
  });
  const agua = await prisma.produto.create({
    data: {
      sku: 'AGU-1',
      nome: 'Água 500ml',
      categoriaId: bebidas.id,
      precoCusto: 1,
      precoVenda: 2.5,
      estoqueAtual: 5,
      estoqueMinimo: 10,
    },
  });
  const detergente = await prisma.produto.create({
    data: {
      sku: 'DET-1',
      nome: 'Detergente',
      categoriaId: limpeza.id,
      precoCusto: 1.5,
      precoVenda: 3,
      estoqueAtual: 1,
      estoqueMinimo: 2,
    },
  });

  const login = async (email: string) => {
    const res = await api().post('/auth/login').send({ email, senha: 'senha123' });
    return `Bearer ${res.body.token as string}`;
  };

  return {
    gerente,
    vendedor,
    bebidas,
    limpeza,
    refri,
    agua,
    detergente,
    tokenGerente: await login(gerente.email),
    tokenVendedor: await login(vendedor.email),
  };
}

export async function estoqueDe(produtoId: number) {
  const p = await prisma.produto.findUniqueOrThrow({ where: { id: produtoId } });
  return p.estoqueAtual;
}
