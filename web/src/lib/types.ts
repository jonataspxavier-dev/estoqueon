export type Perfil = 'GERENTE' | 'VENDEDOR';
export type Usuario = { id: number; nome: string; email: string; perfil: Perfil };

export type Paginated<T> = { data: T[]; meta: { page: number; pageSize: number; total: number; totalPages: number } };

export type Categoria = { id: number; nome: string; totalProdutos: number };

export type Produto = {
  id: number;
  sku: string;
  nome: string;
  categoriaId: number;
  categoria?: { id: number; nome: string };
  precoCusto: number;
  precoVenda: number;
  margem: number;
  estoqueAtual: number;
  estoqueMinimo: number;
  abaixoMinimo: boolean;
  ativo: boolean;
};

export type TipoMov = 'ENTRADA' | 'SAIDA' | 'AJUSTE';
export type Movimentacao = {
  id: number;
  tipo: TipoMov;
  quantidade: number;
  estoqueAnterior: number;
  estoquePosterior: number;
  motivo: string;
  vendaId: number | null;
  criadoEm: string;
  produto: { id: number; sku: string; nome: string };
  usuario: { id: number; nome: string };
};

export type Venda = {
  id: number;
  total: number;
  criadoEm: string;
  usuario: { id: number; nome: string };
  itens: { id: number; produto: { id: number; sku: string; nome: string }; quantidade: number; precoUnitario: number; subtotal: number }[];
};

export type Resumo = {
  periodo: { de: string; ate: string };
  vendas: {
    quantidade: number;
    faturamento: number;
    ticketMedio: number;
    itensVendidos: number;
    custoMercadoria: number;
    lucroBruto: number;
    margemBruta: number;
  };
  estoque: { produtosAtivos: number; unidades: number; valorCusto: number; valorVenda: number; produtosAbaixoMinimo: number };
  vendasPorDia: { dia: string; quantidade: number; total: number }[];
};

export type MaisVendido = { produtoId: number; sku: string; nome: string; quantidade: number; receita: number; lucro: number };

export type Alerta = {
  produtoId: number;
  sku: string;
  nome: string;
  categoria: string;
  estoqueAtual: number;
  estoqueMinimo: number;
  faltam: number;
  situacao: 'ZERADO' | 'BAIXO';
};
