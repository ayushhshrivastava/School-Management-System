import { Router } from 'express';
import { SystemController } from './system.controller';

const router = Router();

router.get('/health', SystemController.getHealth);
router.get('/system/info', SystemController.getSystemInfo);

export default router;
