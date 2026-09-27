import { Router } from 'express';
import { ClassController } from './class.controller';
import { authenticate, requireAnyPermission } from '../../../core/middleware/auth';
import { asyncHandler } from '../../../core/middleware/asyncHandler';

const router = Router();

// All class routes require authentication
router.use(authenticate);

// View routes
router.get(
  '/',
  requireAnyPermission('classes:view', 'academics:view'),
  asyncHandler(ClassController.list)
);

router.get(
  '/:id',
  requireAnyPermission('classes:view', 'academics:view'),
  asyncHandler(ClassController.getById)
);

// Management routes
router.post(
  '/',
  requireAnyPermission('classes:create', 'academics:manage'),
  asyncHandler(ClassController.create)
);

router.put(
  '/:id',
  requireAnyPermission('classes:update', 'academics:manage'),
  asyncHandler(ClassController.update)
);

router.patch(
  '/:id/status',
  requireAnyPermission('classes:update', 'academics:manage'),
  asyncHandler(ClassController.toggleStatus)
);

router.delete(
  '/:id',
  requireAnyPermission('classes:delete', 'academics:manage'),
  asyncHandler(ClassController.delete)
);

export default router;
