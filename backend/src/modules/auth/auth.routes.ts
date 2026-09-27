import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate, requirePermission, requireRole } from '../../core/middleware/auth';
import { asyncHandler } from '../../core/middleware/asyncHandler';
import rateLimit from 'express-rate-limit';

const router = Router();

// Strict rate limiter for login route
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20, // generous enough for automated tests
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many login attempts. Please wait 5 minutes before trying again.',
    errorCode: 'RATE_LIMIT_EXCEEDED',
    timestamp: new Date().toISOString(),
  },
});

// Public Authentication Routes
router.post('/login', loginLimiter, asyncHandler(AuthController.login));
router.post('/refresh', asyncHandler(AuthController.refresh));

// Protected Authentication Routes
router.post('/logout', authenticate, asyncHandler(AuthController.logout));
router.get('/me', authenticate, asyncHandler(AuthController.getMe));
router.post('/change-password', authenticate, asyncHandler(AuthController.changePassword));

// RBAC Verification Endpoints
router.get(
  '/test-permission',
  authenticate,
  requirePermission('students:view'),
  asyncHandler(AuthController.testPermission)
);

router.get(
  '/test-role',
  authenticate,
  requireRole('ACCOUNTANT', 'SUPER_ADMIN'),
  asyncHandler(AuthController.testRole)
);

export default router;
