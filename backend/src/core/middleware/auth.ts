import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, AuthUserContext } from '../../types';
import { UnauthorizedError, ForbiddenError } from '../errors/AppError';
import { config } from '../../config';
import { prisma } from '../database/prisma';

interface JwtPayloadClaims {
  sub: string;
  username: string;
  email: string;
  schoolId: string;
  isSuperAdmin: boolean;
  roles: string[];
  permissions: string[];
  iat: number;
  exp: number;
}

/**
 * Authentication Middleware: Validates Access Token and populates request context.
 */
export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token missing or invalid');
    }

    const token = authHeader.split(' ')[1];

    let decoded: JwtPayloadClaims;
    try {
      decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayloadClaims;
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Authentication token has expired');
      }
      throw new UnauthorizedError('Invalid authentication token');
    }

    // Verify user exists and remains active
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        username: true,
        email: true,
        schoolId: true,
        isActive: true,
        isSuperAdmin: true,
        passwordChangedAt: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError('User account is inactive or not found');
    }

    // Session Revocation: Invalidate tokens issued before the last password change
    if (user.passwordChangedAt) {
      const passwordChangedTime = Math.floor(user.passwordChangedAt.getTime() / 1000);
      if (decoded.iat < passwordChangedTime) {
        throw new UnauthorizedError('Password was recently changed. Please log in again.');
      }
    }

    const userContext: AuthUserContext = {
      id: user.id,
      username: user.username,
      email: user.email,
      schoolId: user.schoolId,
      isSuperAdmin: user.isSuperAdmin,
      roles: decoded.roles || [],
      permissions: decoded.permissions || [],
    };

    req.user = userContext;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Authorization Guard: Requires that the user possesses specific permission(s).
 * Super Admins automatically bypass permission checks.
 */
export function requirePermission(...requiredPermissions: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    // Super Admin bypass
    if (req.user.isSuperAdmin) {
      return next();
    }

    // Check if user has ALL required permissions
    const userPerms = new Set(req.user.permissions);
    const hasAll = requiredPermissions.every((p) => userPerms.has(p));

    if (!hasAll) {
      const missing = requiredPermissions.filter((p) => !userPerms.has(p));
      return next(
        new ForbiddenError(`Missing required permission: ${missing.join(', ')}`)
      );
    }

    next();
  };
}

/**
 * Authorization Guard: Requires that the user possesses at least one of the specified roles.
 * Super Admins automatically bypass role checks.
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    // Super Admin bypass
    if (req.user.isSuperAdmin || req.user.roles.includes('SUPER_ADMIN')) {
      return next();
    }

    const hasRole = allowedRoles.some((role) => req.user?.roles.includes(role));

    if (!hasRole) {
      return next(
        new ForbiddenError(
          `Access requires one of the following roles: ${allowedRoles.join(', ')}`
        )
      );
    }

    next();
  };
}
