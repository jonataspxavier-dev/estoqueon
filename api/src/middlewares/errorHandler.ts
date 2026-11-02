import type { ErrorRequestHandler, RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ erro: 'NAO_ENCONTRADO', mensagem: `Rota ${req.method} ${req.path} não existe` });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      erro: 'VALIDACAO',
      mensagem: 'Dados inválidos',
      detalhes: err.issues.map((i) => ({ campo: i.path.join('.'), mensagem: i.message })),
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.status).json({ erro: err.code, mensagem: err.message, detalhes: err.details });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const alvo = (err.meta?.target as string | string[] | undefined) ?? 'campo';
      res.status(409).json({ erro: 'CONFLITO', mensagem: `Já existe um registro com este valor (${String(alvo)})` });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ erro: 'NAO_ENCONTRADO', mensagem: 'Recurso não encontrado' });
      return;
    }
    if (err.code === 'P2003') {
      res.status(409).json({ erro: 'CONFLITO', mensagem: 'Registro relacionado não existe ou está em uso' });
      return;
    }
  }

  // JSON malformado no corpo
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ erro: 'JSON_INVALIDO', mensagem: 'Corpo da requisição não é um JSON válido' });
    return;
  }

  req.log?.error({ err }, 'Erro não tratado');
  res.status(500).json({ erro: 'ERRO_INTERNO', mensagem: 'Erro interno do servidor' });
};
