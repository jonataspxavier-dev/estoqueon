import { api, prepararBanco, prisma, type Contexto } from './helpers';

let ctx: Contexto;
beforeAll(async () => {
  ctx = await prepararBanco();
});
afterAll(() => prisma.$disconnect());

describe('POST /auth/login', () => {
  it('autentica e retorna token + usuário sem a senha', async () => {
    const res = await api().post('/auth/login').send({ email: 'GERENTE@teste.com', senha: 'senha123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.usuario).toEqual({
      id: ctx.gerente.id,
      nome: 'Gerente Teste',
      email: 'gerente@teste.com',
      perfil: 'GERENTE',
    });
    expect(JSON.stringify(res.body)).not.toContain('senha');
  });

  it('recusa senha incorreta com 401', async () => {
    const res = await api().post('/auth/login').send({ email: 'gerente@teste.com', senha: 'errada' });
    expect(res.status).toBe(401);
    expect(res.body.mensagem).toBe('E-mail ou senha incorretos');
  });

  it('recusa e-mail inexistente com a mesma mensagem', async () => {
    const res = await api().post('/auth/login').send({ email: 'ninguem@teste.com', senha: 'senha123' });
    expect(res.status).toBe(401);
    expect(res.body.mensagem).toBe('E-mail ou senha incorretos');
  });

  it('valida o corpo da requisição', async () => {
    const res = await api().post('/auth/login').send({ email: 'invalido' });
    expect(res.status).toBe(400);
    expect(res.body.erro).toBe('VALIDACAO');
    expect(res.body.detalhes.map((d: { campo: string }) => d.campo)).toEqual(expect.arrayContaining(['email', 'senha']));
  });

  it('retorna 400 para JSON malformado', async () => {
    const res = await api().post('/auth/login').set('Content-Type', 'application/json').send('{"email":');
    expect(res.status).toBe(400);
    expect(res.body.erro).toBe('JSON_INVALIDO');
  });
});

describe('GET /auth/me e proteção das rotas', () => {
  it('retorna o usuário do token', async () => {
    const res = await api().get('/auth/me').set('Authorization', ctx.tokenVendedor);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: ctx.vendedor.id, perfil: 'VENDEDOR' });
  });

  it('exige token', async () => {
    const res = await api().get('/produtos');
    expect(res.status).toBe(401);
  });

  it('recusa token inválido', async () => {
    const res = await api().get('/produtos').set('Authorization', 'Bearer abc.def.ghi');
    expect(res.status).toBe(401);
    expect(res.body.mensagem).toBe('Token inválido ou expirado');
  });
});

describe('Sistema', () => {
  it('GET /health responde com o banco ok', async () => {
    const res = await api().get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', banco: 'ok' });
  });

  it('GET /docs.json expõe a especificação OpenAPI com todas as rotas', async () => {
    const res = await api().get('/docs.json');
    expect(res.status).toBe(200);
    expect(Object.keys(res.body.paths)).toEqual(
      expect.arrayContaining([
        '/auth/login',
        '/produtos',
        '/produtos/{id}',
        '/categorias',
        '/movimentacoes',
        '/vendas',
        '/relatorios/resumo',
        '/relatorios/mais-vendidos',
        '/relatorios/exportar.csv',
        '/alertas/estoque-baixo',
      ]),
    );
  });

  it('rota inexistente retorna 404 em JSON', async () => {
    const res = await api().get('/nao-existe');
    expect(res.status).toBe(404);
    expect(res.body.erro).toBe('NAO_ENCONTRADO');
  });

  it('envia cabeçalhos de segurança (Helmet)', async () => {
    const res = await api().get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
