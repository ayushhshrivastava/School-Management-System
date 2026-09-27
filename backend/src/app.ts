import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { requestLogger } from './core/middleware/requestLogger';
import { apiRateLimiter } from './core/middleware/rateLimiter';
import { errorHandler } from './core/middleware/errorHandler';
import { sessionContextMiddleware } from './core/middleware/sessionContext';
import { NotFoundError } from './core/errors/AppError';
import systemRoutes from './modules/system/system.routes';
import authRoutes from './modules/auth/auth.routes';
import academicsRoutes from './modules/academics/academics.routes';
import sessionRoutes from './modules/academics/sessions/session.routes';
import classRoutes from './modules/academics/classes/class.routes';
import sectionRoutes from './modules/academics/sections/section.routes';
import subjectRoutes from './modules/academics/subjects/subject.routes';
import classSubjectRoutes from './modules/academics/class-subjects/classSubject.routes';
import configRoutes from './modules/config/config.routes';

export function createApp(): Application {
  const app: Application = express();

  // 1. Trust proxy for rate limiting behind load balancers/proxies
  app.set('trust proxy', 1);

  // 2. Security Headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: config.NODE_ENV === 'production' ? undefined : false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // 3. CORS Configuration
  const allowedOrigins = config.CORS_ORIGIN.split(',').map((origin) => origin.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-academic-session-id', 'x-correlation-id'],
    })
  );

  // 4. Rate Limiting
  app.use(apiRateLimiter);

  // 5. Body Parsing with payload limits
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(cookieParser(config.COOKIE_SECRET));

  // 6. Request Logging & Correlation ID
  app.use(requestLogger);

  // 7. Academic Session Context Resolution
  app.use(sessionContextMiddleware);

  // 8. API Routes
  app.use(config.API_PREFIX, systemRoutes);
  app.use(`${config.API_PREFIX}/auth`, authRoutes);
  app.use(`${config.API_PREFIX}/academic-sessions`, sessionRoutes);
  app.use(`${config.API_PREFIX}/classes`, classRoutes);
  app.use(`${config.API_PREFIX}/sections`, sectionRoutes);
  app.use(`${config.API_PREFIX}/subjects`, subjectRoutes);
  app.use(`${config.API_PREFIX}/class-subjects`, classSubjectRoutes);
  app.use(`${config.API_PREFIX}/academics`, academicsRoutes);
  app.use(`${config.API_PREFIX}/configs`, configRoutes);
  app.use(`${config.API_PREFIX}/system/configs`, configRoutes);

  // 9. Root Welcome Route
  app.get('/', (req: Request, res: Response) => {
    res.json({
      name: 'Kids World School ERP — API Core',
      version: '1.0.0',
      status: 'ONLINE',
      docs: `${config.API_PREFIX}/system/info`,
      health: `${config.API_PREFIX}/health`,
    });
  });

  // 10. 404 Route Handler
  app.use((req: Request, res: Response, next: NextFunction) => {
    next(new NotFoundError(`Route ${req.method} ${req.path}`));
  });

  // 11. Centralized Error Handler
  app.use(errorHandler);

  return app;
}
