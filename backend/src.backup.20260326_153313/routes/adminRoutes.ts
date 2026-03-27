//backend/src/routes/adminRoutes.ts
import { Router } from 'express';
import { getAdminStats } from '../controllers/adminStatsController';
import { requireRole } from '../middleware/auth';

const router = Router();

// Allow both system_admin and admin roles
router.get('/stats', requireRole(['system_admin', 'admin']), getAdminStats);

export default router;