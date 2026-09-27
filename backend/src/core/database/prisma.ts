import { PrismaClient } from '@prisma/client';
import { logger } from '../logger/logger';

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma =
  global.prismaGlobal ||
  new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  });

if (process.env.NODE_ENV !== 'production') {
  global.prismaGlobal = prisma;
}

// Log database errors & slow queries in development
// @ts-ignore
prisma.$on('error', (e: any) => {
  logger.error('Prisma Database Error: %s', e.message);
});

// @ts-ignore
prisma.$on('warn', (e: any) => {
  logger.warn('Prisma Database Warning: %s', e.message);
});

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    // Attempt simple query
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.warn('Database connection check note: %s', (error as Error).message);
    return false;
  }
}
