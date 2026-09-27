import { Router } from 'express';
import { SectionController } from './section.controller';
import { authenticate, requireAnyPermission } from '../../../core/middleware/auth';
import { asyncHandler } from '../../../core/middleware/asyncHandler';

const router = Router();

// All section routes require authentication
router.use(authenticate);

// View routes
router.get(
  '/',
  requireAnyPermission('sections:view', 'academics:view'),
  asyncHandler(SectionController.list)
);

router.get(
  '/:id',
  requireAnyPermission('sections:view', 'academics:view'),
  asyncHandler(SectionController.getById)
);

// Management routes
router.post(
  '/',
  requireAnyPermission('sections:create', 'academics:manage'),
  asyncHandler(SectionController.create)
);

router.put(
  '/:id',
  requireAnyPermission('sections:update', 'academics:manage'),
  asyncHandler(SectionController.update)
);

router.patch(
  '/:id/status',
  requireAnyPermission('sections:update', 'academics:manage'),
  asyncHandler(SectionController.toggleStatus)
);

router.delete(
  '/:id',
  requireAnyPermission('sections:delete', 'academics:manage'),
  asyncHandler(SectionController.delete)
);

export default router;
