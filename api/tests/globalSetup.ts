import { execSync } from 'node:child_process';
import path from 'node:path';
import dotenv from 'dotenv';

/** Aplica as migrations no banco de testes antes da suíte (cada teste limpa os próprios dados). */
export default function globalSetup() {
  const root = path.resolve(__dirname, '..');
  const { parsed } = dotenv.config({ path: path.join(root, '.env.test'), quiet: true });
  const databaseUrl = process.env.DATABASE_URL_TEST ?? parsed?.DATABASE_URL;
  if (!databaseUrl?.includes('test')) {
    throw new Error('Por segurança, o DATABASE_URL de testes precisa conter "test" no nome do banco.');
  }
  execSync('npx prisma migrate deploy', {
    cwd: root,
    stdio: 'ignore',
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}
