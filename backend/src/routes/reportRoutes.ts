// backend/src/routes/reportRoutes.ts
import { Router } from 'express';
import { getReportSummary } from '../controllers/reportController';
import { requireRole } from '../middleware/auth';
import { getAgencyScores } from '../controllers/agencyScoreController';
import { getSubmissionPipeline } from '../controllers/submissionPipelineController';

const router = Router();

// GET /api/reports/summary → system report summary
router.get('/summary', requireRole(['system_admin', 'admin']), getReportSummary);
router.get('/agency-scores', requireRole(['system_admin', 'admin']), getAgencyScores);
router.get('/pipeline', requireRole(['system_admin', 'admin']), getSubmissionPipeline);

export default router;