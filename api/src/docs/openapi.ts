/* Especificação OpenAPI 3 de todas as rotas da API. Servida em /docs (UI) e /docs.json. */

const ref = (nome: string) => ({ $ref: `#/components/schemas/${nome}` });
const json = (schema: object) => ({ content: { 'application/json': { schema } } });
const resp = (descricao: string, schema?: object) => ({ description: descricao, ...(schema ? json(schema) : {}) });
const qp = (name: string, schema: object, description?: string) => ({ in: 'query', name, schema, description });
const idPath = { in: 'path', name: 'id', required: true, schema: { type: 'integer' } };
const pagina = [qp('page', { type: 'integer', default: 1 }), qp('pageSize', { type: 'integer', default: 20, maximum: 100 })];
const periodo = [
  qp('de', { type: 'string', format: 'date' }, 'Data inicial (AAAA-MM-DD). Padrão: 30 dias atrás'),
  qp('ate', { type: 'string', format: 'date' }, 'Data final inclusiva (AAAA-MM-DD). Padrão: hoje'),
];

const erros = {
  400: resp('Dados inválidos', ref('Erro')),
  401: resp('Não autenticado', ref('Erro')),
};
const errosGerente = { ...erros, 403: resp('Apenas GERENTE', ref('Erro')) };
const paginado = (item: string) => ({
  type: 'object',
  properties: { data: { type: 'array', items: ref(item) }, meta: ref('Meta') },
});

export const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'EstoqueOn API',
    version: '1.0.0',
    description:
      'API REST de controle de estoque e vendas para pequenos comércios.\n\n' +
      '**Como testar:** faça `POST /auth/login` com `gerente@estoqueon.com` / `gerente123` ' +
      '(ou `vendedor@estoqueon.com` / `vendedor123`), copie o `token` e clique em **Authorize**.',
  },
  servers: [{ url: '/', description: 'Servidor atual' }],
  tags: [
    { name: 'Auth' },
    { name: 'Categorias' },
    { name: 'Produtos' },
    { name: 'Movimentações' },
    { name: 'Vendas' },
    { name: 'Relatórios' },
    { name: 'Alertas' },
    { name: 'Sistema' },
  ],
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Erro: {
        type: 'object',
        properties: {
          erro: { type: 'string', example: 'VALIDACAO' },
          mensagem: { type: 'string', example: 'Dados inválidos' },
          detalhes: { description: 'Detalhes opcionais (campos inválidos, itens sem estoque, etc.)' },
        },
      },
      Meta: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          pageSize: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },
      Usuario: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          nome: { type: 'string' },
          email: { type: 'string' },
          perfil: { type: 'string', enum: ['GERENTE', 'VENDEDOR'] },
        },
      },
      Categoria: {
        type: 'object',
        properties: { id: { type: 'integer' }, nome: { type: 'string' }, totalProdutos: { type: 'integer' } },
      },
      CategoriaInput: { type: 'object', required: ['nome'], properties: { nome: { type: 'string', example: 'Bebidas' } } },
      Produto: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          sku: { type: 'string', example: 'BEB-001' },
          nome: { type: 'string' },
          categoriaId: { type: 'integer' },
          categoria: { type: 'object', properties: { id: { type: 'integer' }, nome: { type: 'string' } } },
          precoCusto: { type: 'number', example: 3.5 },
          precoVenda: { type: 'number', example: 6.9 },
          margem: { type: 'number', description: 'Margem sobre o preço de venda (%)', example: 49.3 },
          estoqueAtual: { type: 'integer' },
          estoqueMinimo: { type: 'integer' },
          abaixoMinimo: { type: 'boolean' },
          ativo: { type: 'boolean' },
        },
      },
      ProdutoInput: {
        type: 'object',
        required: ['sku', 'nome', 'categoriaId', 'precoCusto', 'precoVenda'],
        properties: {
          sku: { type: 'string', example: 'BEB-099' },
          nome: { type: 'string', example: 'Suco de Uva 1L' },
          categoriaId: { type: 'integer', example: 1 },
          precoCusto: { type: 'number', example: 5.2 },
          precoVenda: { type: 'number', example: 9.9 },
          estoqueAtual: { type: 'integer', example: 20, description: 'Somente na criação; depois use movimentações' },
          estoqueMinimo: { type: 'integer', example: 5 },
          ativo: { type: 'boolean', example: true },
        },
      },
      MovimentacaoInput: {
        type: 'object',
        required: ['produtoId', 'tipo', 'quantidade', 'motivo'],
        properties: {
          produtoId: { type: 'integer', example: 1 },
          tipo: { type: 'string', enum: ['ENTRADA', 'SAIDA', 'AJUSTE'] },
          quantidade: {
            type: 'integer',
            example: 10,
            description: 'ENTRADA/SAIDA: quantidade movimentada (> 0). AJUSTE: estoque contado no inventário (≥ 0).',
          },
          motivo: { type: 'string', example: 'Compra do fornecedor — NF 1234' },
        },
      },
      Movimentacao: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          tipo: { type: 'string', enum: ['ENTRADA', 'SAIDA', 'AJUSTE'] },
          quantidade: { type: 'integer', description: 'No AJUSTE, é a diferença aplicada (pode ser negativa)' },
          estoqueAnterior: { type: 'integer' },
          estoquePosterior: { type: 'integer' },
          motivo: { type: 'string' },
          vendaId: { type: 'integer', nullable: true },
          criadoEm: { type: 'string', format: 'date-time' },
          produto: { type: 'object', properties: { id: { type: 'integer' }, sku: { type: 'string' }, nome: { type: 'string' } } },
          usuario: { type: 'object', properties: { id: { type: 'integer' }, nome: { type: 'string' } } },
        },
      },
      VendaInput: {
        type: 'object',
        required: ['itens'],
        properties: {
          itens: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['produtoId', 'quantidade'],
              properties: { produtoId: { type: 'integer', example: 1 }, quantidade: { type: 'integer', example: 2 } },
            },
          },
        },
      },
      Venda: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          total: { type: 'number' },
          criadoEm: { type: 'string', format: 'date-time' },
          usuario: { type: 'object', properties: { id: { type: 'integer' }, nome: { type: 'string' } } },
          itens: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                produto: {
                  type: 'object',
                  properties: { id: { type: 'integer' }, sku: { type: 'string' }, nome: { type: 'string' } },
                },
                quantidade: { type: 'integer' },
                precoUnitario: { type: 'number' },
                subtotal: { type: 'number' },
              },
            },
          },
        },
      },
      Resumo: {
        type: 'object',
        properties: {
          periodo: { type: 'object', properties: { de: { type: 'string' }, ate: { type: 'string' } } },
          vendas: {
            type: 'object',
            properties: {
              quantidade: { type: 'integer' },
              faturamento: { type: 'number' },
              ticketMedio: { type: 'number' },
              itensVendidos: { type: 'integer' },
              custoMercadoria: { type: 'number' },
              lucroBruto: { type: 'number' },
              margemBruta: { type: 'number', description: '%' },
            },
          },
          estoque: {
            type: 'object',
            properties: {
              produtosAtivos: { type: 'integer' },
              unidades: { type: 'integer' },
              valorCusto: { type: 'number', description: 'Valor total em estoque pelo preço de custo' },
              valorVenda: { type: 'number', description: 'Valor total em estoque pelo preço de venda' },
              produtosAbaixoMinimo: { type: 'integer' },
            },
          },
          vendasPorDia: {
            type: 'array',
            items: {
              type: 'object',
              properties: { dia: { type: 'string' }, quantidade: { type: 'integer' }, total: { type: 'number' } },
            },
          },
        },
      },
      MaisVendido: {
        type: 'object',
        properties: {
          produtoId: { type: 'integer' },
          sku: { type: 'string' },
          nome: { type: 'string' },
          quantidade: { type: 'integer' },
          receita: { type: 'number' },
          lucro: { type: 'number' },
        },
      },
      Alerta: {
        type: 'object',
        properties: {
          produtoId: { type: 'integer' },
          sku: { type: 'string' },
          nome: { type: 'string' },
          categoria: { type: 'string' },
          estoqueAtual: { type: 'integer' },
          estoqueMinimo: { type: 'integer' },
          faltam: { type: 'integer' },
          situacao: { type: 'string', enum: ['ZERADO', 'BAIXO'] },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Sistema'],
        summary: 'Verifica se a API e o banco estão no ar',
        security: [],
        responses: { 200: resp('OK'), 503: resp('Banco indisponível') },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login (retorna JWT)',
        security: [],
        requestBody: json({
          type: 'object',
          required: ['email', 'senha'],
          properties: {
            email: { type: 'string', example: 'gerente@estoqueon.com' },
            senha: { type: 'string', example: 'gerente123' },
          },
        }),
        responses: {
          200: resp('Autenticado', { type: 'object', properties: { token: { type: 'string' }, usuario: ref('Usuario') } }),
          400: resp('Dados inválidos', ref('Erro')),
          401: resp('E-mail ou senha incorretos', ref('Erro')),
          429: resp('Muitas tentativas', ref('Erro')),
        },
      },
    },
    '/auth/me': {
      get: { tags: ['Auth'], summary: 'Usuário do token atual', responses: { 200: resp('OK', ref('Usuario')), 401: erros[401] } },
    },
    '/categorias': {
      get: {
        tags: ['Categorias'],
        summary: 'Lista categorias',
        responses: { 200: resp('OK', { type: 'array', items: ref('Categoria') }), 401: erros[401] },
      },
      post: {
        tags: ['Categorias'],
        summary: 'Cria categoria (GERENTE)',
        requestBody: json(ref('CategoriaInput')),
        responses: { 201: resp('Criada', ref('Categoria')), ...errosGerente, 409: resp('Nome já existe', ref('Erro')) },
      },
    },
    '/categorias/{id}': {
      put: {
        tags: ['Categorias'],
        summary: 'Renomeia categoria (GERENTE)',
        parameters: [idPath],
        requestBody: json(ref('CategoriaInput')),
        responses: {
          200: resp('OK', ref('Categoria')),
          ...errosGerente,
          404: resp('Não encontrada', ref('Erro')),
          409: resp('Nome já existe', ref('Erro')),
        },
      },
      delete: {
        tags: ['Categorias'],
        summary: 'Exclui categoria sem produtos (GERENTE)',
        parameters: [idPath],
        responses: {
          204: resp('Excluída'),
          ...errosGerente,
          404: resp('Não encontrada', ref('Erro')),
          409: resp('Possui produtos', ref('Erro')),
        },
      },
    },
    '/produtos': {
      get: {
        tags: ['Produtos'],
        summary: 'Lista produtos com busca, filtros e paginação',
        parameters: [
          qp('busca', { type: 'string' }, 'Busca por nome ou SKU'),
          qp('categoria', { type: 'integer' }, 'ID da categoria'),
          qp('abaixoMinimo', { type: 'boolean' }, 'Somente produtos com estoque ≤ mínimo'),
          qp('ativo', { type: 'boolean', default: true }),
          qp('ordenar', { type: 'string', enum: ['nome', 'sku', 'estoqueAtual', 'precoVenda'], default: 'nome' }),
          qp('direcao', { type: 'string', enum: ['asc', 'desc'], default: 'asc' }),
          ...pagina,
        ],
        responses: { 200: resp('OK', paginado('Produto')), ...erros },
      },
      post: {
        tags: ['Produtos'],
        summary: 'Cria produto (GERENTE)',
        description: 'Se `estoqueAtual` > 0, registra uma movimentação de ENTRADA de estoque inicial.',
        requestBody: json(ref('ProdutoInput')),
        responses: {
          201: resp('Criado', ref('Produto')),
          ...errosGerente,
          409: resp('SKU já existe', ref('Erro')),
          422: resp('Preço de venda menor que o custo', ref('Erro')),
        },
      },
    },
    '/produtos/{id}': {
      get: {
        tags: ['Produtos'],
        summary: 'Detalhe do produto',
        parameters: [idPath],
        responses: { 200: resp('OK', ref('Produto')), ...erros, 404: resp('Não encontrado', ref('Erro')) },
      },
      put: {
        tags: ['Produtos'],
        summary: 'Atualiza produto (GERENTE)',
        description: 'O estoque não é alterado aqui — use `POST /movimentacoes`.',
        parameters: [idPath],
        requestBody: json(ref('ProdutoInput')),
        responses: {
          200: resp('OK', ref('Produto')),
          ...errosGerente,
          404: resp('Não encontrado', ref('Erro')),
          409: resp('SKU já existe', ref('Erro')),
        },
      },
      delete: {
        tags: ['Produtos'],
        summary: 'Desativa produto (GERENTE)',
        description: 'Exclusão lógica (`ativo = false`) para preservar o histórico de vendas e movimentações.',
        parameters: [idPath],
        responses: { 204: resp('Desativado'), ...errosGerente, 404: resp('Não encontrado', ref('Erro')) },
      },
    },
    '/movimentacoes': {
      get: {
        tags: ['Movimentações'],
        summary: 'Histórico de movimentações de estoque',
        parameters: [
          qp('produtoId', { type: 'integer' }),
          qp('tipo', { type: 'string', enum: ['ENTRADA', 'SAIDA', 'AJUSTE'] }),
          ...periodo,
          ...pagina,
        ],
        responses: { 200: resp('OK', paginado('Movimentacao')), ...erros },
      },
      post: {
        tags: ['Movimentações'],
        summary: 'Registra entrada, saída ou ajuste (GERENTE)',
        requestBody: json(ref('MovimentacaoInput')),
        responses: {
          201: resp('Registrada', ref('Movimentacao')),
          ...errosGerente,
          404: resp('Produto não encontrado', ref('Erro')),
          422: resp('Estoque insuficiente', ref('Erro')),
        },
      },
    },
    '/vendas': {
      get: {
        tags: ['Vendas'],
        summary: 'Lista vendas (VENDEDOR vê apenas as próprias)',
        parameters: [...periodo, qp('usuarioId', { type: 'integer' }, 'Filtra por vendedor (apenas GERENTE)'), ...pagina],
        responses: { 200: resp('OK', paginado('Venda')), ...erros },
      },
      post: {
        tags: ['Vendas'],
        summary: 'Registra venda com vários itens',
        description:
          'Executa em transação com bloqueio das linhas dos produtos: confere o estoque de todos os itens, grava a venda, ' +
          'baixa o estoque e registra as saídas. Se faltar estoque em qualquer item, nada é alterado (422).',
        requestBody: json(ref('VendaInput')),
        responses: {
          201: resp('Venda registrada', ref('Venda')),
          ...erros,
          422: resp('Estoque insuficiente ou produto inativo', ref('Erro')),
        },
      },
    },
    '/vendas/{id}': {
      get: {
        tags: ['Vendas'],
        summary: 'Detalhe da venda',
        parameters: [idPath],
        responses: { 200: resp('OK', ref('Venda')), ...erros, 404: resp('Não encontrada', ref('Erro')) },
      },
    },
    '/relatorios/resumo': {
      get: {
        tags: ['Relatórios'],
        summary: 'Faturamento, lucro bruto, ticket médio, valor em estoque e vendas por dia',
        parameters: periodo,
        responses: { 200: resp('OK', ref('Resumo')), ...erros },
      },
    },
    '/relatorios/mais-vendidos': {
      get: {
        tags: ['Relatórios'],
        summary: 'Ranking de produtos mais vendidos',
        parameters: [...periodo, qp('limite', { type: 'integer', default: 10, maximum: 100 })],
        responses: { 200: resp('OK', { type: 'array', items: ref('MaisVendido') }), ...erros },
      },
    },
    '/relatorios/exportar.csv': {
      get: {
        tags: ['Relatórios'],
        summary: 'Exporta relatório em CSV (separador ";", UTF-8 com BOM)',
        parameters: [qp('tipo', { type: 'string', enum: ['vendas', 'mais-vendidos', 'estoque', 'movimentacoes'] }), ...periodo],
        responses: { 200: { description: 'Arquivo CSV', content: { 'text/csv': { schema: { type: 'string' } } } }, ...erros },
      },
    },
    '/alertas/estoque-baixo': {
      get: {
        tags: ['Alertas'],
        summary: 'Produtos ativos com estoque menor ou igual ao mínimo',
        responses: { 200: resp('OK', { type: 'array', items: ref('Alerta') }), ...erros },
      },
    },
  },
} as const;
