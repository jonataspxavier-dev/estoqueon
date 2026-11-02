import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { autenticar, autorizar } from '../middlewares/auth';
import * as c from '../controllers';

export const router = Router();

const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.NODE_ENV === 'test' ? 1000 : 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { erro: 'MUITAS_TENTATIVAS', mensagem: 'Muitas tentativas de login. Tente novamente em alguns minutos.' },
});

// ---------- Públicas ----------
router.post('/auth/login', limiteLogin, c.auth.login);

// ---------- Autenticadas ----------
// Aplicado só aos prefixos conhecidos, para que rotas inexistentes respondam 404 (e não 401)
router.use(['/auth/me', '/categorias', '/produtos', '/movimentacoes', '/vendas', '/relatorios', '/alertas'], autenticar);
const gerente = autorizar('GERENTE');

router.get('/auth/me', c.auth.me);

router.get('/categorias', c.categorias.listar);
router.post('/categorias', gerente, c.categorias.criar);
router.put('/categorias/:id', gerente, c.categorias.atualizar);
router.delete('/categorias/:id', gerente, c.categorias.remover);

router.get('/produtos', c.produtos.listar);
router.get('/produtos/:id', c.produtos.buscar);
router.post('/produtos', gerente, c.produtos.criar);
router.put('/produtos/:id', gerente, c.produtos.atualizar);
router.delete('/produtos/:id', gerente, c.produtos.remover);

router.get('/movimentacoes', c.movimentacoes.listar);
router.post('/movimentacoes', gerente, c.movimentacoes.criar);

router.get('/vendas', c.vendas.listar);
router.get('/vendas/:id', c.vendas.buscar);
router.post('/vendas', c.vendas.criar);

router.get('/relatorios/resumo', c.relatorios.resumo);
router.get('/relatorios/mais-vendidos', c.relatorios.maisVendidos);
router.get('/relatorios/exportar.csv', c.relatorios.exportar);

router.get('/alertas/estoque-baixo', c.relatorios.estoqueBaixo);
