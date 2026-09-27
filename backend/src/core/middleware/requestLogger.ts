import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../types';
import { logger } from '../logger/logger';

export function requestLogger(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const correlationId = (req.headers['x-correlation-id'] as string) || Math.random().toString(36).substring(2, 10);
  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const { method, originalUrl, ip } = req;
    const { statusCode } = res;

    const message = `${method} ${originalUrl} ${statusCode} - ${duration}ms [${ip}]`;

    if (statusCode >= 500) {
      logger.error(message, { correlationId, statusCode, duration });
    } else if (statusCode >= 400) {
      logger.warn(message, { correlationId, statusCode, duration });
    } else {
      logger.info(message, { correlationId, statusCode, duration });
    }
  });

  next();
}
