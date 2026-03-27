// backend/src/routes/adminLogRoutes.ts
import { Router } from 'express';
import { getAuditLogs, exportAuditLogs } from '../controllers/adminLogController';
import { requireRole } from '../middleware/auth';

const router = Router();

// GET /api/admin/logs → fetch filtered logs
router.get('/', requireRole(['system_admin', 'admin']), getAuditLogs);

// GET /api/admin/logs/export → CSV export
router.get('/export', requireRole(['system_admin', 'admin']), exportAuditLogs);

export default router;