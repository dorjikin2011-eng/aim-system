// backend/src/routes/reportExportRoutes.ts
import { Router } from 'express';
import { exportReportToExcel } from '../controllers/reportExportController';
import { requireRole } from '../middleware/auth';

const router = Router();

router.get('/export/excel', requireRole('system_admin'), exportReportToExcel);

export default router;