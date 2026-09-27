import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../../types';
import { AuthService } from './auth.service';
import { loginSchema, changePasswordSchema, refreshTokenSchema } from './auth.validation';
import { config } from '../../config';

// Cookie options for secure HTTP-only refresh tokens
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: 'lax' as const, // Allows cross-origin for local dev when front/back on different ports
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/api/v1/auth',
};

export class AuthController {
  /**
   * POST /api/v1/auth/login
   */
  public static async login(req: AuthenticatedRequest, res: Response): Promise<void> {
    const validated = loginSchema.parse(req.body);
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
    const userAgent = req.headers['user-agent'];

    const result = await AuthService.login(
      validated.identifier,
      validated.password,
      ipAddress,
      userAgent
    );

    // Set secure HTTP-Only cookie for refresh token
    res.cookie('refreshToken', result.tokens.refreshToken, REFRESH_COOKIE_OPTIONS);

    const response: ApiResponse = {
      success: true,
      message: 'Login successful',
      data: {
        user: result.user,
        accessToken: result.tokens.accessToken,
        expiresIn: result.tokens.expiresIn,
      },
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  }

  /**
   * POST /api/v1/auth/refresh
   */
  public static async refresh(req: AuthenticatedRequest, res: Response): Promise<void> {
    const bodyValidation = refreshTokenSchema.safeParse(req.body);
    const rawRefreshToken = req.cookies?.refreshToken || bodyValidation.data?.refreshToken;

    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
    const userAgent = req.headers['user-agent'];

    const result = await AuthService.refreshAccessToken(rawRefreshToken, ipAddress, userAgent);

    // Rotate refresh token cookie
    res.cookie('refreshToken', result.newRefreshToken, REFRESH_COOKIE_OPTIONS);

    const response: ApiResponse = {
      success: true,
      message: 'Access token refreshed successfully',
      data: {
        accessToken: result.accessToken,
        expiresIn: config.JWT_EXPIRES_IN,
      },
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  }

  /**
   * POST /api/v1/auth/logout
   */
  public static async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    const rawRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
    const userAgent = req.headers['user-agent'];

    await AuthService.logout(rawRefreshToken, req.user?.id, ipAddress, userAgent);

    // Clear refresh token cookie
    res.clearCookie('refreshToken', { ...REFRESH_COOKIE_OPTIONS, maxAge: 0 });

    const response: ApiResponse = {
      success: true,
      message: 'Logged out successfully',
      data: null,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  }

  /**
   * GET /api/v1/auth/me
   */
  public static async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    const profile = await AuthService.getProfile(req.user!.id);

    const response: ApiResponse = {
      success: true,
      message: 'Current user profile retrieved',
      data: profile,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  }

  /**
   * POST /api/v1/auth/change-password
   */
  public static async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    const validated = changePasswordSchema.parse(req.body);
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
    const userAgent = req.headers['user-agent'];

    await AuthService.changePassword(
      req.user!.id,
      validated.currentPassword,
      validated.newPassword,
      ipAddress,
      userAgent
    );

    // Invalidate refresh cookie on password change
    res.clearCookie('refreshToken', { ...REFRESH_COOKIE_OPTIONS, maxAge: 0 });

    const response: ApiResponse = {
      success: true,
      message: 'Password changed successfully. Please log in again with your new credentials.',
      data: null,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  }

  /**
   * GET /api/v1/auth/test-permission (Used for verification tests)
   */
  public static async testPermission(req: AuthenticatedRequest, res: Response): Promise<void> {
    res.status(200).json({
      success: true,
      message: 'Permission check passed: user has students:view',
      data: { user: req.user },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * GET /api/v1/auth/test-role (Used for verification tests)
   */
  public static async testRole(req: AuthenticatedRequest, res: Response): Promise<void> {
    res.status(200).json({
      success: true,
      message: 'Role check passed: user is ACCOUNTANT or SUPER_ADMIN',
      data: { user: req.user },
      timestamp: new Date().toISOString(),
    });
  }
}
