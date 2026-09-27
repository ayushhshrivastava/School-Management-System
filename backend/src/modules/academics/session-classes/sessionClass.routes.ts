import { Router } from 'express';
import { SessionClassController } from './sessionClass.controller';
import { authenticate, requireAnyPermission } from '../../../core/middleware/auth';
import { asyncHandler } from '../../../core/middleware/asyncHandler';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requireAnyPermission('classes:view', 'academics:view'),
  asyncHandler(SessionClassController.list)
);

router.post(
  '/sync',
  requireAnyPermission('classes:create', 'academics:manage'),
  asyncHandler(SessionClassController.sync)
);

router.patch(
  '/:id/status',
  requireAnyPermission('classes:update', 'academics:manage'),
  asyncHandler(SessionClassController.toggle)
);

export default router;
