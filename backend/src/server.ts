import { createApp } from './app';
import { config } from './config';
import { logger } from './core/logger/logger';
import { prisma } from './core/database/prisma';

async function bootstrap() {
  const app = createApp();

  const server = app.listen(config.PORT, () => {
    logger.info('====================================================');
    logger.info('🏫 KIDS WORLD SCHOOL ERP — BACKEND API');
    logger.info(`🌐 Environment : ${config.NODE_ENV}`);
    logger.info(`🚀 Server Port : ${config.PORT}`);
    logger.info(`🔗 API Prefix  : ${config.API_PREFIX}`);
    logger.info(`🩺 Health Check: http://localhost:${config.PORT}${config.API_PREFIX}/health`);
    logger.info('====================================================');
  });

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);

    server.close(async () => {
      logger.info('HTTP server closed.');
      try {
        await prisma.$disconnect();
        logger.info('Database client disconnected.');
        process.exit(0);
      } catch (err) {
        logger.error('Error during shutdown: %s', (err as Error).message);
        process.exit(1);
      }
    });

    // Force shutdown if taking too long
    setTimeout(() => {
      logger.error('Forced shutdown due to timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.error('Fatal initialization error: %s', err.message, { stack: err.stack });
  process.exit(1);
});
