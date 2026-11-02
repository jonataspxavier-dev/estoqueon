import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';

// Hash fixo usado quando o e-mail não existe, para o tempo de resposta não revelar quais e-mails estão cadastrados
const HASH_FALSO = bcrypt.hashSync('usuario-inexistente', 10);

export async function login(email: string, senha: string) {
  const usuario = await prisma.usuario.findUnique({ where: { email } });
  const senhaOk = await bcrypt.compare(senha, usuario?.senhaHash ?? HASH_FALSO);
  if (!usuario || !senhaOk) throw AppError.unauthorized('E-mail ou senha incorretos');

  const token = jwt.sign({ nome: usuario.nome, email: usuario.email, perfil: usuario.perfil }, env.JWT_SECRET, {
    subject: String(usuario.id),
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  });

  return {
    token,
    usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil },
  };
}
