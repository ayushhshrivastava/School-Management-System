import { Router } from 'express';
import { ConfigController } from './config.controller';
import { authenticate, requireAnyPermission } from '../../core/middleware/auth';
import { asyncHandler } from '../../core/middleware/asyncHandler';

const router = Router();

// Public route for landing and brand info
router.get('/public', asyncHandler(ConfigController.getPublic));

// All management routes require authentication
router.use(authenticate);

// View routes
router.get(
  '/',
  requireAnyPermission('system:config:view', 'system:config', 'academics:view'),
  asyncHandler(ConfigController.list)
);

router.get(
  '/:category/:key',
  requireAnyPermission('system:config:view', 'system:config', 'academics:view'),
  asyncHandler(ConfigController.getByKey)
);

// Edit routes
router.post(
  '/',
  requireAnyPermission('system:config:edit', 'system:config'),
  asyncHandler(ConfigController.upsert)
);

router.post(
  '/batch',
  requireAnyPermission('system:config:edit', 'system:config'),
  asyncHandler(ConfigController.batchUpsert)
);

router.put(
  '/:category/:key',
  requireAnyPermission('system:config:edit', 'system:config'),
  asyncHandler(ConfigController.upsert)
);

router.delete(
  '/:category/:key',
  requireAnyPermission('system:config:edit', 'system:config'),
  asyncHandler(ConfigController.delete)
);

export default router;
