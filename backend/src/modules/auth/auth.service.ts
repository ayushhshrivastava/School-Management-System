import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../core/database/prisma';
import { config } from '../../config';
import { logAuditEvent } from '../../core/audit/auditLogger';
import { 
  BadRequestError, 
  UnauthorizedError, 
  AppError 
} from '../../core/errors/AppError';
import { logger } from '../../core/logger/logger';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface UserSummary {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phone?: string | null;
  isActive: boolean;
  isSuperAdmin: boolean;
  schoolId: string;
  schoolName: string;
  roles: string[];
  permissions: string[];
}

export class AuthService {
  /**
   * Hashes a raw refresh token using SHA-256 for secure database storage.
   */
  private static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generates a short-lived Access Token (JWT)
   */
  public static generateAccessToken(user: {
    id: string;
    username: string;
    email: string;
    schoolId: string;
    isSuperAdmin: boolean;
    roles: string[];
    permissions: string[];
  }): string {
    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      schoolId: user.schoolId,
      isSuperAdmin: user.isSuperAdmin,
      roles: user.roles,
      permissions: user.permissions,
    };

    return jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN as any,
      issuer: 'kids-world-school-erp',
      audience: 'kws-internal-staff',
    });
  }

  /**
   * Generates a cryptographically random refresh token and saves its hash in the database.
   */
  public static async createRefreshToken(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {
    const rawToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    // Calculate expiry date (7 days)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    return rawToken;
  }

  /**
   * Authenticates user credentials, manages lockout counters, and issues tokens.
   */
  public static async login(
    identifier: string,
    password: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ user: UserSummary; tokens: TokenPair }> {
    // 1. Locate user by email or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase().trim() },
          { username: identifier.trim() },
        ],
      },
      include: {
        school: true,
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // If user does not exist: generic invalid credentials response
    if (!user) {
      await logAuditEvent({
        schoolId: 'UNKNOWN',
        action: 'LOGIN_FAILED',
        module: 'AUTH',
        ipAddress,
        userAgent,
        status: 'FAILED',
        details: `Login attempt failed for non-existent identifier: ${identifier}`,
      });
      throw new UnauthorizedError('Invalid username/email or password');
    }

    // 2. Check if account is deactivated
    if (!user.isActive) {
      await logAuditEvent({
        schoolId: user.schoolId,
        userId: user.id,
        action: 'LOGIN_REJECTED_INACTIVE',
        module: 'AUTH',
        ipAddress,
        userAgent,
        status: 'FAILED',
        details: 'Login rejected because account is deactivated.',
      });
      throw new UnauthorizedError('Your account has been deactivated. Please contact the administrator.');
    }

    // 3. Check for Account Lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / (60 * 1000));
      await logAuditEvent({
        schoolId: user.schoolId,
        userId: user.id,
        action: 'LOGIN_REJECTED_LOCKED',
        module: 'AUTH',
        ipAddress,
        userAgent,
        status: 'WARNING',
        details: `Login rejected because account is temporarily locked for ${remainingMinutes} more minute(s).`,
      });
      throw new AppError(
        `Account is temporarily locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minute(s).`,
        423,
        'ACCOUNT_LOCKED'
      );
    }

    // 4. Verify Password Hash with bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      const newFailedAttempts = user.failedLoginAttempts + 1;
      const isNowLocked = newFailedAttempts >= config.AUTH_MAX_FAILED_ATTEMPTS;
      const lockUntilDate = isNowLocked
        ? new Date(Date.now() + config.AUTH_LOCKOUT_MINUTES * 60 * 1000)
        : null;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: newFailedAttempts,
          lockedUntil: lockUntilDate,
        },
      });

      if (isNowLocked) {
        await logAuditEvent({
          schoolId: user.schoolId,
          userId: user.id,
          action: 'ACCOUNT_LOCKED',
          module: 'AUTH',
          ipAddress,
          userAgent,
          status: 'WARNING',
          details: `Account locked after ${newFailedAttempts} consecutive failed password attempts.`,
        });
        throw new AppError(
          `Account locked due to ${newFailedAttempts} failed login attempts. Please try again in ${config.AUTH_LOCKOUT_MINUTES} minutes.`,
          423,
          'ACCOUNT_LOCKED'
        );
      }

      await logAuditEvent({
        schoolId: user.schoolId,
        userId: user.id,
        action: 'LOGIN_FAILED',
        module: 'AUTH',
        ipAddress,
        userAgent,
        status: 'FAILED',
        details: `Incorrect password attempt (${newFailedAttempts}/${config.AUTH_MAX_FAILED_ATTEMPTS})`,
      });

      throw new UnauthorizedError('Invalid username/email or password');
    }

    // 5. Success: Reset failed attempts, clear lock, and update last login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    // 6. Extract Roles & Distinct Permissions
    const roles: string[] = [];
    const permissionsSet = new Set<string>();

    user.userRoles.forEach((ur) => {
      roles.push(ur.role.code);
      ur.role.rolePermissions.forEach((rp) => {
        permissionsSet.add(rp.permission.code);
      });
    });

    const permissions = Array.from(permissionsSet);

    // 7. Generate Access and Refresh Tokens
    const accessToken = this.generateAccessToken({
      id: user.id,
      username: user.username,
      email: user.email,
      schoolId: user.schoolId,
      isSuperAdmin: user.isSuperAdmin,
      roles,
      permissions,
    });

    const refreshToken = await this.createRefreshToken(user.id, ipAddress, userAgent);

    // 8. Record Successful Login Audit Event
    await logAuditEvent({
      schoolId: user.schoolId,
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      module: 'AUTH',
      ipAddress,
      userAgent,
      status: 'SUCCESS',
      details: 'User authenticated successfully.',
    });

    const safeUser: UserSummary = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      isActive: user.isActive,
      isSuperAdmin: user.isSuperAdmin,
      schoolId: user.schoolId,
      schoolName: user.school.name,
      roles,
      permissions,
    };

    return {
      user: safeUser,
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: config.JWT_EXPIRES_IN,
      },
    };
  }

  /**
   * Refreshes an access token using a valid, non-revoked refresh token.
   * Implements strict token rotation and reuse detection.
   */
  public static async refreshAccessToken(
    rawRefreshToken: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ accessToken: string; newRefreshToken: string }> {
    if (!rawRefreshToken) {
      throw new UnauthorizedError('Refresh token is required');
    }

    const tokenHash = this.hashToken(rawRefreshToken);

    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            userRoles: {
              include: {
                role: {
                  include: {
                    rolePermissions: {
                      include: {
                        permission: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!tokenRecord) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Reuse Detection: If a token that was already revoked is submitted,
    // it could indicate a stolen token replay attack! Invalidate ALL active sessions.
    if (tokenRecord.revokedAt) {
      logger.warn(`Security Warning: Revoked refresh token reuse attempted for user ${tokenRecord.userId}`);
      
      // Revoke all remaining active refresh tokens for this user
      await prisma.refreshToken.updateMany({
        where: { userId: tokenRecord.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await logAuditEvent({
        schoolId: tokenRecord.user.schoolId,
        userId: tokenRecord.userId,
        action: 'REFRESH_TOKEN_REUSE_DETECTED',
        module: 'AUTH',
        ipAddress,
        userAgent,
        status: 'WARNING',
        details: 'Attempted use of an already revoked refresh token. All active sessions invalidated.',
      });

      throw new UnauthorizedError('Security violation detected. Please log in again.');
    }

    // Check expiration
    if (tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedError('Refresh token has expired. Please log in again.');
    }

    // Check if user is still active
    if (!tokenRecord.user.isActive) {
      throw new UnauthorizedError('User account is deactivated.');
    }

    // Generate new refresh token and rotate
    const newRawRefreshToken = crypto.randomBytes(40).toString('hex');
    const newTokenHash = this.hashToken(newRawRefreshToken);
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Revoke old token and link to replacement
    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: {
        revokedAt: new Date(),
        replacedBy: newTokenHash,
      },
    });

    // Create new refresh token
    await prisma.refreshToken.create({
      data: {
        userId: tokenRecord.userId,
        tokenHash: newTokenHash,
        expiresAt: newExpiresAt,
        ipAddress,
        userAgent,
      },
    });

    // Extract roles and permissions
    const roles: string[] = [];
    const permissionsSet = new Set<string>();

    tokenRecord.user.userRoles.forEach((ur) => {
      roles.push(ur.role.code);
      ur.role.rolePermissions.forEach((rp) => {
        permissionsSet.add(rp.permission.code);
      });
    });

    const accessToken = this.generateAccessToken({
      id: tokenRecord.user.id,
      username: tokenRecord.user.username,
      email: tokenRecord.user.email,
      schoolId: tokenRecord.user.schoolId,
      isSuperAdmin: tokenRecord.user.isSuperAdmin,
      roles,
      permissions: Array.from(permissionsSet),
    });

    return {
      accessToken,
      newRefreshToken: newRawRefreshToken,
    };
  }

  /**
   * Logs out the user by revoking the specific refresh token or all user tokens.
   */
  public static async logout(
    rawRefreshToken?: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    if (rawRefreshToken) {
      const tokenHash = this.hashToken(rawRefreshToken);
      await prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        await logAuditEvent({
          schoolId: user.schoolId,
          userId: user.id,
          action: 'LOGOUT',
          module: 'AUTH',
          ipAddress,
          userAgent,
          status: 'SUCCESS',
          details: 'User logged out successfully.',
        });
      }
    }
  }

  /**
   * Changes the user's password, updates passwordChangedAt, and revokes all active refresh tokens.
   */
  public static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestError('User not found');
    }

    // Verify current password
    const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      await logAuditEvent({
        schoolId: user.schoolId,
        userId: user.id,
        action: 'PASSWORD_CHANGE_FAILED',
        module: 'AUTH',
        ipAddress,
        userAgent,
        status: 'FAILED',
        details: 'Incorrect current password provided during password change.',
      });
      throw new BadRequestError('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        passwordChangedAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    // Invalidate all existing refresh tokens for security
    await prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    // Record audit event
    await logAuditEvent({
      schoolId: user.schoolId,
      userId: user.id,
      action: 'PASSWORD_CHANGED',
      module: 'AUTH',
      ipAddress,
      userAgent,
      status: 'SUCCESS',
      details: 'Password changed successfully. All previous sessions invalidated.',
    });
  }

  /**
   * Retrieves sanitized profile of current authenticated user.
   */
  public static async getProfile(userId: string): Promise<UserSummary> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        school: true,
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedError('User account not found');
    }

    const roles: string[] = [];
    const permissionsSet = new Set<string>();

    user.userRoles.forEach((ur) => {
      roles.push(ur.role.code);
      ur.role.rolePermissions.forEach((rp) => {
        permissionsSet.add(rp.permission.code);
      });
    });

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      isActive: user.isActive,
      isSuperAdmin: user.isSuperAdmin,
      schoolId: user.schoolId,
      schoolName: user.school.name,
      roles,
      permissions: Array.from(permissionsSet),
    };
  }
}
