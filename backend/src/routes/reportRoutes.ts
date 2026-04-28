// backend/src/routes/reportRoutes.ts
import { Router } from 'express';
import { 
  getReportSummary, 
  getOverallReport,
  getAgencyRankings,
  getParameterComparison,
  getAgencyTimeline
} from '../controllers/reportController';
import { requireRole } from '../middleware/auth';
import { getAgencyScores } from '../controllers/agencyScoreController';
import { getSubmissionPipeline } from '../controllers/submissionPipelineController';

const router = Router();

// ============================================
// Summary & Overview Reports
// ============================================

// GET /api/reports/overall → overall report for all agencies
router.get('/overall', requireRole(['system_admin', 'admin', 'prevention_officer']), getOverallReport);

// GET /api/reports/summary → system report summary (national averages, integrity distribution)
router.get('/summary', requireRole(['system_admin', 'admin', 'prevention_officer']), getReportSummary);

// GET /api/reports/agency-scores → agency scores for bar chart
router.get('/agency-scores', requireRole(['system_admin', 'admin', 'prevention_officer']), getAgencyScores);

// GET /api/reports/pipeline → submission pipeline stages
router.get('/pipeline', requireRole(['system_admin', 'admin', 'prevention_officer']), getSubmissionPipeline);

// ============================================
// Rankings & Comparisons (NEW)
// ============================================

// GET /api/reports/agency-rankings → agency leaderboard (1st, 2nd, 3rd...)
router.get('/agency-rankings', requireRole(['system_admin', 'admin']), getAgencyRankings);

// GET /api/reports/parameter-comparison → compare ICCS parameters, training %, AD %, CoC level, cases score
router.get('/parameter-comparison', requireRole(['system_admin', 'admin']), getParameterComparison);

// GET /api/reports/agency-timeline → year-on-year performance trend for a specific agency
router.get('/agency-timeline', requireRole(['system_admin', 'admin']), getAgencyTimeline);

export default router;