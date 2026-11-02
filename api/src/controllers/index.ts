import type { Request, Response } from 'express';
import * as s from '../schemas';
import * as authService from '../services/auth.service';
import * as categoriaService from '../services/categoria.service';
import * as produtoService from '../services/produto.service';
import * as movimentacaoService from '../services/movimentacao.service';
import * as vendaService from '../services/venda.service';
import * as relatorioService from '../services/relatorio.service';
import { usuarioAtual } from '../middlewares/auth';

// Controllers só validam a entrada (Zod), chamam o service e formatam a resposta.

export const auth = {
  async login(req: Request, res: Response) {
    const { email, senha } = s.loginSchema.parse(req.body);
    res.json(await authService.login(email, senha));
  },
  me(req: Request, res: Response) {
    res.json(usuarioAtual(req));
  },
};

export const categorias = {
  async listar(_req: Request, res: Response) {
    res.json(await categoriaService.listar());
  },
  async criar(req: Request, res: Response) {
    const { nome } = s.categoriaSchema.parse(req.body);
    res.status(201).json(await categoriaService.criar(nome));
  },
  async atualizar(req: Request, res: Response) {
    const { id } = s.idParam.parse(req.params);
    const { nome } = s.categoriaSchema.parse(req.body);
    res.json(await categoriaService.atualizar(id, nome));
  },
  async remover(req: Request, res: Response) {
    const { id } = s.idParam.parse(req.params);
    await categoriaService.remover(id);
    res.status(204).end();
  },
};

export const produtos = {
  async listar(req: Request, res: Response) {
    res.json(await produtoService.listar(s.produtoListQuery.parse(req.query)));
  },
  async buscar(req: Request, res: Response) {
    const { id } = s.idParam.parse(req.params);
    res.json(await produtoService.buscar(id));
  },
  async criar(req: Request, res: Response) {
    const dados = s.produtoCreateSchema.parse(req.body);
    res.status(201).json(await produtoService.criar(dados, usuarioAtual(req).id));
  },
  async atualizar(req: Request, res: Response) {
    const { id } = s.idParam.parse(req.params);
    res.json(await produtoService.atualizar(id, s.produtoUpdateSchema.parse(req.body)));
  },
  async remover(req: Request, res: Response) {
    const { id } = s.idParam.parse(req.params);
    await produtoService.remover(id);
    res.status(204).end();
  },
};

export const movimentacoes = {
  async criar(req: Request, res: Response) {
    const dados = s.movimentacaoSchema.parse(req.body);
    res.status(201).json(await movimentacaoService.registrar(dados, usuarioAtual(req).id));
  },
  async listar(req: Request, res: Response) {
    res.json(await movimentacaoService.listar(s.movimentacaoListQuery.parse(req.query)));
  },
};

export const vendas = {
  async criar(req: Request, res: Response) {
    const dados = s.vendaSchema.parse(req.body);
    res.status(201).json(await vendaService.criar(dados, usuarioAtual(req).id));
  },
  async listar(req: Request, res: Response) {
    res.json(await vendaService.listar(s.vendaListQuery.parse(req.query), usuarioAtual(req)));
  },
  async buscar(req: Request, res: Response) {
    const { id } = s.idParam.parse(req.params);
    res.json(await vendaService.buscar(id, usuarioAtual(req)));
  },
};

export const relatorios = {
  async resumo(req: Request, res: Response) {
    const { de, ate } = s.periodoQuery.parse(req.query);
    res.json(await relatorioService.resumo(de, ate));
  },
  async maisVendidos(req: Request, res: Response) {
    const { de, ate, limite } = s.maisVendidosQuery.parse(req.query);
    res.json(await relatorioService.maisVendidos(de, ate, limite));
  },
  async exportar(req: Request, res: Response) {
    const { tipo, de, ate } = s.exportarQuery.parse(req.query);
    const { nome, csv } = await relatorioService.exportarCsv(tipo, de, ate);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nome}"`);
    res.send(csv);
  },
  async estoqueBaixo(_req: Request, res: Response) {
    res.json(await relatorioService.estoqueBaixo());
  },
};
