import { Router } from 'express';
import { SubjectController } from './subject.controller';
import { authenticate, requireAnyPermission } from '../../../core/middleware/auth';
import { asyncHandler } from '../../../core/middleware/asyncHandler';

const router = Router();

// All subject routes require authentication
router.use(authenticate);

// View routes
router.get(
  '/',
  requireAnyPermission('subjects:view', 'academics:view'),
  asyncHandler(SubjectController.list)
);

router.get(
  '/:id',
  requireAnyPermission('subjects:view', 'academics:view'),
  asyncHandler(SubjectController.getById)
);

// Management routes
router.post(
  '/',
  requireAnyPermission('subjects:create', 'academics:manage'),
  asyncHandler(SubjectController.create)
);

router.put(
  '/:id',
  requireAnyPermission('subjects:update', 'academics:manage'),
  asyncHandler(SubjectController.update)
);

router.patch(
  '/:id/status',
  requireAnyPermission('subjects:update', 'academics:manage'),
  asyncHandler(SubjectController.toggleStatus)
);

router.delete(
  '/:id',
  requireAnyPermission('subjects:delete', 'academics:manage'),
  asyncHandler(SubjectController.delete)
);

export default router;
