import { Router } from 'express';
import { SessionController } from './session.controller';
import { authenticate, requireAnyPermission } from '../../../core/middleware/auth';
import { asyncHandler } from '../../../core/middleware/asyncHandler';

const router = Router();

// All session routes require authentication
router.use(authenticate);

// View routes
router.get(
  '/',
  requireAnyPermission('academic_sessions:view', 'academics:view'),
  asyncHandler(SessionController.list)
);

router.get(
  '/current',
  requireAnyPermission('academic_sessions:view', 'academics:view'),
  asyncHandler(SessionController.getCurrent)
);

router.get(
  '/:id',
  requireAnyPermission('academic_sessions:view', 'academics:view'),
  asyncHandler(SessionController.getById)
);

// Create session
router.post(
  '/',
  requireAnyPermission('academic_sessions:create', 'academics:manage'),
  asyncHandler(SessionController.create)
);

// Update session metadata
router.put(
  '/:id',
  requireAnyPermission('academic_sessions:update', 'academics:manage'),
  asyncHandler(SessionController.update)
);

// Elevated state actions: Activate session & Lock session
router.patch(
  '/:id/activate',
  requireAnyPermission('academic_sessions:activate'),
  asyncHandler(SessionController.activate)
);

router.patch(
  '/:id/lock',
  requireAnyPermission('academic_sessions:lock'),
  asyncHandler(SessionController.lock)
);

export default router;
