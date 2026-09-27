import rateLimit from 'express-rate-limit';
import { config } from '../../config';

export const apiRateLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many requests from this IP, please try again later.',
    errorCode: 'RATE_LIMIT_EXCEEDED',
    timestamp: new Date().toISOString(),
  },
});
