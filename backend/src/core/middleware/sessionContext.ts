import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../types';
import { prisma } from '../database/prisma';
import { BadRequestError, SessionLockedError } from '../errors/AppError';
import { logger } from '../logger/logger';

/**
 * Middleware that extracts and resolves the active academic session.
 * Future academic, attendance, fee, and exam queries will use this context.
 */
export async function sessionContextMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const requestedSessionId = (req.headers['x-academic-session-id'] as string) || (req.query.sessionId as string);

    // If an explicit session ID is supplied, verify and attach it
    if (requestedSessionId) {
      const session = await prisma.academicSession.findUnique({
        where: { id: requestedSessionId },
      });

      if (!session) {
        throw new BadRequestError(`Academic session with ID "${requestedSessionId}" does not exist.`);
      }

      req.academicSession = {
        id: session.id,
        code: session.code,
        name: session.name,
        isCurrent: session.isCurrent,
        isLocked: session.isLocked,
      };
    }

    next();
  } catch (error) {
    // If database is not yet migrated, do not break health/foundation routes
    logger.debug('Session context middleware resolution: %s', (error as Error).message);
    next();
  }
}

/**
 * Guard that prevents state-modifying operations (POST, PUT, PATCH, DELETE)
 * on archived or locked academic sessions.
 */
export function requireUnlockedSession(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

  if (mutatingMethods.includes(req.method) && req.academicSession?.isLocked) {
    return next(new SessionLockedError(req.academicSession.name));
  }

  next();
}
