/**
 * Seed de demonstração: 2 usuários, 5 categorias, 30 produtos e ~60 dias de vendas.
 * É idempotente: se já houver usuários, não faz nada (use `--force` para recriar tudo).
 */
import { Prisma, PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Gerador pseudoaleatório determinístico (os dados ficam iguais a cada execução)
let semente = 42;
const rand = () => {
  semente = (semente * 1103515245 + 12345) % 2 ** 31;
  return semente / 2 ** 31;
};
const entre = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;

const categorias = ['Bebidas', 'Mercearia', 'Higiene', 'Limpeza', 'Hortifrúti'];

// [sku, nome, categoria, custo, venda, estoqueInicial, estoqueMinimo]
const produtos: [string, string, number, number, number, number, number][] = [
  ['BEB-001', 'Refrigerante Cola 2L', 0, 5.4, 9.99, 120, 20],
  ['BEB-002', 'Água Mineral 500ml', 0, 0.9, 2.5, 200, 40],
  ['BEB-003', 'Suco de Laranja 1L', 0, 4.2, 7.9, 60, 15],
  ['BEB-004', 'Cerveja Lata 350ml', 0, 2.6, 4.99, 240, 48],
  ['BEB-005', 'Café Torrado 500g', 0, 11.5, 19.9, 45, 10],
  ['BEB-006', 'Energético 250ml', 0, 4.8, 8.99, 30, 12],
  ['MER-001', 'Arroz Branco 5kg', 1, 19.9, 29.9, 80, 15],
  ['MER-002', 'Feijão Carioca 1kg', 1, 6.1, 9.49, 90, 20],
  ['MER-003', 'Macarrão Espaguete 500g', 1, 2.7, 4.79, 110, 25],
  ['MER-004', 'Óleo de Soja 900ml', 1, 5.3, 8.49, 70, 15],
  ['MER-005', 'Açúcar Refinado 1kg', 1, 3.4, 5.49, 85, 20],
  ['MER-006', 'Farinha de Trigo 1kg', 1, 3.9, 6.29, 40, 15],
  ['MER-007', 'Molho de Tomate 340g', 1, 1.8, 3.49, 95, 20],
  ['HIG-001', 'Sabonete 90g', 2, 1.2, 2.79, 150, 30],
  ['HIG-002', 'Creme Dental 90g', 2, 2.9, 5.99, 70, 20],
  ['HIG-003', 'Shampoo 350ml', 2, 8.5, 15.9, 35, 10],
  ['HIG-004', 'Papel Higiênico 12 rolos', 2, 13.9, 22.9, 50, 12],
  ['HIG-005', 'Desodorante Aerosol', 2, 7.8, 14.5, 28, 10],
  ['HIG-006', 'Escova de Dentes', 2, 3.1, 7.9, 12, 15],
  ['LIM-001', 'Detergente 500ml', 3, 1.5, 2.99, 130, 30],
  ['LIM-002', 'Sabão em Pó 1kg', 3, 9.8, 16.9, 45, 12],
  ['LIM-003', 'Água Sanitária 2L', 3, 3.6, 6.49, 55, 15],
  ['LIM-004', 'Esponja Multiuso (3un)', 3, 2.2, 4.99, 8, 20],
  ['LIM-005', 'Desinfetante 2L', 3, 5.9, 10.9, 40, 12],
  ['LIM-006', 'Saco de Lixo 50L', 3, 6.4, 11.9, 0, 10],
  ['HOR-001', 'Banana Prata (kg)', 4, 3.2, 6.49, 60, 15],
  ['HOR-002', 'Tomate (kg)', 4, 4.5, 8.99, 40, 12],
  ['HOR-003', 'Batata (kg)', 4, 3.1, 5.99, 55, 15],
  ['HOR-004', 'Cebola (kg)', 4, 3.4, 6.49, 6, 10],
  ['HOR-005', 'Alface Crespa (un)', 4, 1.6, 3.99, 25, 8],
];

async function limpar() {
  await prisma.movimentacao.deleteMany();
  await prisma.vendaItem.deleteMany();
  await prisma.venda.deleteMany();
  await prisma.produto.deleteMany();
  await prisma.categoria.deleteMany();
  await prisma.usuario.deleteMany();
}

async function main() {
  const forcar = process.argv.includes('--force');
  if (!forcar && (await prisma.usuario.count()) > 0) {
    console.log('Seed ignorado: banco já possui dados (use --force para recriar).');
    return;
  }
  await limpar();

  const [gerente, vendedor] = await Promise.all([
    prisma.usuario.create({
      data: {
        nome: 'Gabriela Gerente',
        email: 'gerente@estoqueon.com',
        senhaHash: await bcrypt.hash('gerente123', 10),
        perfil: 'GERENTE',
      },
    }),
    prisma.usuario.create({
      data: {
        nome: 'Vitor Vendedor',
        email: 'vendedor@estoqueon.com',
        senhaHash: await bcrypt.hash('vendedor123', 10),
        perfil: 'VENDEDOR',
      },
    }),
  ]);

  const cats = [];
  for (const nome of categorias) cats.push(await prisma.categoria.create({ data: { nome } }));

  const agora = new Date();
  const inicioHistorico = new Date(agora.getTime() - 60 * 86_400_000);

  // Estoque "comprado" no início do histórico = estoque final desejado + o que será vendido
  const lista = [];
  for (const [sku, nome, cat, custo, venda, , minimo] of produtos) {
    lista.push(
      await prisma.produto.create({
        data: {
          sku,
          nome,
          categoriaId: cats[cat]!.id,
          precoCusto: custo,
          precoVenda: venda,
          estoqueAtual: 0,
          estoqueMinimo: minimo,
        },
      }),
    );
  }

  // Gera vendas para os últimos 60 dias
  type Item = { produtoId: number; quantidade: number; preco: Prisma.Decimal; custo: Prisma.Decimal };
  const vendas: { data: Date; usuarioId: number; itens: Item[] }[] = [];
  const vendidos = new Map<number, number>();
  for (let d = 59; d >= 0; d--) {
    const dia = new Date(agora.getTime() - d * 86_400_000);
    const fimDeSemana = [0, 6].includes(dia.getDay());
    const qtdVendas = entre(fimDeSemana ? 5 : 2, fimDeSemana ? 10 : 7);
    for (let v = 0; v < qtdVendas; v++) {
      const data = new Date(dia);
      data.setHours(entre(8, 20), entre(0, 59), entre(0, 59), 0);
      if (data > agora) data.setTime(agora.getTime() - entre(1, 120) * 60_000);
      const itens: Item[] = [];
      const usados = new Set<number>();
      for (let i = 0; i < entre(1, 4); i++) {
        const p = lista[Math.floor(Math.pow(rand(), 1.6) * lista.length)]!; // alguns produtos vendem mais
        if (usados.has(p.id)) continue;
        usados.add(p.id);
        const quantidade = entre(1, 4);
        itens.push({ produtoId: p.id, quantidade, preco: p.precoVenda, custo: p.precoCusto });
        vendidos.set(p.id, (vendidos.get(p.id) ?? 0) + quantidade);
      }
      vendas.push({ data, usuarioId: rand() < 0.7 ? vendedor.id : gerente.id, itens });
    }
  }

  // Entrada inicial de estoque (registrada no histórico)
  const estoque = new Map<number, number>();
  for (let i = 0; i < lista.length; i++) {
    const p = lista[i]!;
    const final = produtos[i]![5];
    const inicial = final + (vendidos.get(p.id) ?? 0);
    estoque.set(p.id, inicial);
    if (inicial > 0) {
      await prisma.movimentacao.create({
        data: {
          produtoId: p.id,
          tipo: 'ENTRADA',
          quantidade: inicial,
          estoqueAnterior: 0,
          estoquePosterior: inicial,
          motivo: 'Estoque inicial (implantação do sistema)',
          usuarioId: gerente.id,
          criadoEm: inicioHistorico,
        },
      });
    }
  }

  vendas.sort((a, b) => a.data.getTime() - b.data.getTime());
  for (const v of vendas) {
    const total = v.itens.reduce((s, i) => s.add(i.preco.mul(i.quantidade)), new Prisma.Decimal(0));
    const venda = await prisma.venda.create({
      data: {
        usuarioId: v.usuarioId,
        total,
        criadoEm: v.data,
        itens: {
          create: v.itens.map((i) => ({
            produtoId: i.produtoId,
            quantidade: i.quantidade,
            precoUnitario: i.preco,
            custoUnitario: i.custo,
          })),
        },
      },
    });
    for (const i of v.itens) {
      const anterior = estoque.get(i.produtoId)!;
      estoque.set(i.produtoId, anterior - i.quantidade);
      await prisma.movimentacao.create({
        data: {
          produtoId: i.produtoId,
          tipo: 'SAIDA',
          quantidade: i.quantidade,
          estoqueAnterior: anterior,
          estoquePosterior: anterior - i.quantidade,
          motivo: `Venda #${venda.id}`,
          usuarioId: v.usuarioId,
          vendaId: venda.id,
          criadoEm: v.data,
        },
      });
    }
  }

  for (const [id, qtd] of estoque) {
    await prisma.produto.update({ where: { id }, data: { estoqueAtual: qtd } });
  }

  console.log(`Seed concluído: 2 usuários, ${cats.length} categorias, ${lista.length} produtos, ${vendas.length} vendas.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
