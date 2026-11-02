import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import type { Perfil } from '@prisma/client';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

export type UsuarioToken = { id: number; nome: string; email: string; perfil: Perfil };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: UsuarioToken;
    }
  }
}

export const autenticar: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw AppError.unauthorized('Token não informado');

  try {
    const payload = jwt.verify(header.slice(7), env.JWT_SECRET) as jwt.JwtPayload & UsuarioToken;
    req.usuario = { id: Number(payload.sub), nome: payload.nome, email: payload.email, perfil: payload.perfil };
    next();
  } catch {
    throw AppError.unauthorized('Token inválido ou expirado');
  }
};

export const autorizar =
  (...perfis: Perfil[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.usuario) throw AppError.unauthorized();
    if (!perfis.includes(req.usuario.perfil)) throw AppError.forbidden();
    next();
  };

/** Retorna o usuário autenticado (garantido pelo middleware `autenticar`). */
export function usuarioAtual(req: Express.Request): UsuarioToken {
  if (!req.usuario) throw AppError.unauthorized();
  return req.usuario;
}
