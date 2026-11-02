import { env } from './config/env';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { createApp } from './app';

const server = createApp().listen(env.PORT, () => {
  logger.info(`EstoqueOn API rodando em http://localhost:${env.PORT} — docs em /docs`);
});

async function encerrar(sinal: string) {
  logger.info(`${sinal} recebido, encerrando...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGTERM', () => void encerrar('SIGTERM'));
process.on('SIGINT', () => void encerrar('SIGINT'));
