import { Router } from 'express';
import { ClassSubjectController } from './classSubject.controller';
import { authenticate, requireAnyPermission } from '../../../core/middleware/auth';
import { asyncHandler } from '../../../core/middleware/asyncHandler';

const router = Router();

// All class-subject routes require authentication
router.use(authenticate);

// View routes
router.get(
  '/',
  requireAnyPermission('class_subjects:view', 'academics:view'),
  asyncHandler(ClassSubjectController.list)
);

router.get(
  '/:id',
  requireAnyPermission('class_subjects:view', 'academics:view'),
  asyncHandler(ClassSubjectController.getById)
);

// Management routes
router.post(
  '/',
  requireAnyPermission('class_subjects:manage', 'academics:manage'),
  asyncHandler(ClassSubjectController.create)
);

router.post(
  '/batch',
  requireAnyPermission('class_subjects:manage', 'academics:manage'),
  asyncHandler(ClassSubjectController.batchAssign)
);

router.put(
  '/:id',
  requireAnyPermission('class_subjects:manage', 'academics:manage'),
  asyncHandler(ClassSubjectController.update)
);

router.delete(
  '/:id',
  requireAnyPermission('class_subjects:manage', 'academics:manage'),
  asyncHandler(ClassSubjectController.remove)
);

export default router;
