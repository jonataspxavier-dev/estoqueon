import { z } from 'zod';

const data = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD')
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Data inválida');

const booleanQuery = z.enum(['true', 'false', '1', '0']).transform((v) => v === 'true' || v === '1');

export const idParam = z.object({ id: z.coerce.number().int().positive('ID inválido') });

export const paginacao = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const periodoQuery = z
  .object({ de: data.optional(), ate: data.optional() })
  .refine((p) => !p.de || !p.ate || p.de <= p.ate, { message: '"de" deve ser anterior ou igual a "ate"', path: ['de'] });

// ---------- Auth ----------
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  senha: z.string().min(1, 'Senha é obrigatória'),
});

// ---------- Categorias ----------
export const categoriaSchema = z.object({
  nome: z.string().trim().min(2, 'Nome deve ter ao menos 2 caracteres').max(80),
});

// ---------- Produtos ----------
const preco = z.coerce
  .number()
  .nonnegative('Preço não pode ser negativo')
  .max(99_999_999.99)
  .multipleOf(0.01, 'Use no máximo 2 casas decimais');

export const produtoCreateSchema = z
  .object({
    sku: z
      .string()
      .trim()
      .toUpperCase()
      .min(2)
      .max(50)
      .regex(/^[A-Z0-9-_.]+$/, 'SKU aceita letras, números, - _ .'),
    nome: z.string().trim().min(2).max(150),
    categoriaId: z.coerce.number().int().positive(),
    precoCusto: preco,
    precoVenda: preco,
    estoqueAtual: z.coerce.number().int().min(0).default(0),
    estoqueMinimo: z.coerce.number().int().min(0).default(0),
    ativo: z.boolean().default(true),
  })
  .strict();

export const produtoUpdateSchema = produtoCreateSchema
  .omit({ estoqueAtual: true })
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Informe ao menos um campo para atualizar');

export const produtoListQuery = paginacao.extend({
  busca: z.string().trim().max(100).optional(),
  categoria: z.coerce.number().int().positive().optional(),
  abaixoMinimo: booleanQuery.optional(),
  ativo: booleanQuery.optional(),
  ordenar: z.enum(['nome', 'sku', 'estoqueAtual', 'precoVenda']).default('nome'),
  direcao: z.enum(['asc', 'desc']).default('asc'),
});

// ---------- Movimentações ----------
export const movimentacaoSchema = z
  .object({
    produtoId: z.coerce.number().int().positive(),
    tipo: z.enum(['ENTRADA', 'SAIDA', 'AJUSTE']),
    quantidade: z.coerce.number().int(),
    motivo: z.string().trim().min(3, 'Informe o motivo (mín. 3 caracteres)').max(255),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.tipo === 'AJUSTE' && v.quantidade < 0) {
      ctx.addIssue({ code: 'custom', path: ['quantidade'], message: 'No ajuste, informe o estoque contado (≥ 0)' });
    }
    if (v.tipo !== 'AJUSTE' && v.quantidade <= 0) {
      ctx.addIssue({ code: 'custom', path: ['quantidade'], message: 'Quantidade deve ser maior que zero' });
    }
  });

export const movimentacaoListQuery = paginacao.merge(
  z.object({
    produtoId: z.coerce.number().int().positive().optional(),
    tipo: z.enum(['ENTRADA', 'SAIDA', 'AJUSTE']).optional(),
    de: data.optional(),
    ate: data.optional(),
  }),
);

// ---------- Vendas ----------
export const vendaSchema = z
  .object({
    itens: z
      .array(
        z.object({
          produtoId: z.coerce.number().int().positive(),
          quantidade: z.coerce.number().int().positive('Quantidade deve ser maior que zero').max(100_000),
        }),
      )
      .min(1, 'A venda precisa de ao menos um item')
      .max(200),
  })
  .strict();

export const vendaListQuery = paginacao.merge(
  z.object({ de: data.optional(), ate: data.optional(), usuarioId: z.coerce.number().int().positive().optional() }),
);

// ---------- Relatórios ----------
export const maisVendidosQuery = z.object({
  de: data.optional(),
  ate: data.optional(),
  limite: z.coerce.number().int().min(1).max(100).default(10),
});

export const exportarQuery = z.object({
  tipo: z.enum(['vendas', 'mais-vendidos', 'estoque', 'movimentacoes']),
  de: data.optional(),
  ate: data.optional(),
});

export type ProdutoCreate = z.infer<typeof produtoCreateSchema>;
export type ProdutoUpdate = z.infer<typeof produtoUpdateSchema>;
export type ProdutoListQuery = z.infer<typeof produtoListQuery>;
export type MovimentacaoInput = z.infer<typeof movimentacaoSchema>;
export type MovimentacaoListQuery = z.infer<typeof movimentacaoListQuery>;
export type VendaInput = z.infer<typeof vendaSchema>;
export type VendaListQuery = z.infer<typeof vendaListQuery>;
