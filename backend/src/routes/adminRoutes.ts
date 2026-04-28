// backend/src/routes/adminRoutes.ts
import { Router } from 'express';
import { getAdminStats, getAssignedAgenciesWithStatus } from '../controllers/adminStatsController';
import { requireRole } from '../middleware/auth';

const router = Router();

// Allow both system_admin and admin roles
router.get('/stats', requireRole(['system_admin', 'admin']), getAdminStats);
router.get('/assigned-agencies', requireRole(['system_admin', 'admin']), getAssignedAgenciesWithStatus);

export default router;