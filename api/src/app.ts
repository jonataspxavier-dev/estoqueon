import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { pinoHttp } from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { openapi } from './docs/openapi';
import { router } from './routes';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url === '/health' },
      // Log enxuto: método, URL, status e usuário — sem cabeçalhos
      serializers: {
        req: (req: { id: unknown; method: string; url: string }) => ({ id: req.id, method: req.method, url: req.url }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
      customProps: (req) => ({ usuarioId: (req as express.Request).usuario?.id }),
    }),
  );

  // O Swagger UI usa scripts inline, então a CSP é ajustada apenas para /docs
  app.use(
    '/docs',
    helmet({ contentSecurityPolicy: false }),
    swaggerUi.serve,
    swaggerUi.setup(openapi, {
      customSiteTitle: 'EstoqueOn API — Docs',
    }),
  );
  app.get('/docs.json', (_req, res) => res.json(openapi));

  app.use(helmet());
  const origens = env.CORS_ORIGIN.split(',').map((o) => o.trim());
  app.use(
    cors({
      origin: origens.includes('*') ? true : origens,
      exposedHeaders: ['Content-Disposition'],
    }),
  );
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit: env.RATE_LIMIT_MAX,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      skip: () => env.NODE_ENV === 'test',
      message: { erro: 'MUITAS_REQUISICOES', mensagem: 'Limite de requisições excedido. Aguarde um minuto.' },
    }),
  );
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ok', banco: 'ok', uptime: Math.round(process.uptime()) });
    } catch {
      res.status(503).json({ status: 'erro', banco: 'indisponivel' });
    }
  });

  app.use(router);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
