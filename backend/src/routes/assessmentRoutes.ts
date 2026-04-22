// backend/src/routes/assessmentRoutes.ts - COMPLETE FIXED VERSION
import { Router } from 'express';
import { 
  getAssessmentProgress,
  saveIndicatorAssessment,
  saveAllAssessments,
  submitAssessment,
  validateAssessment,
  getFullAssessment,
  calculateIndicatorScore,
  getAssessmentStats,
  generateAssessmentForm,
  validateFormData,
  finalizeAssessment,
  unlockAssessment,
  getAgencyReport,
  getSummaryReport
} from '../controllers/assessmentController';

import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// All assessment routes require authentication by default
router.use(requireAuth);

/* =========================
   Assessment Progress Routes
   ========================= */

// Get assessment progress for an agency (prevention officers and admins)
router.get(
  '/progress/:agencyId',
  requireRole(['prevention_officer', 'admin', 'system_admin', 'commissioner', 'director']),
  getAssessmentProgress
);

// Get assessment statistics for an agency
router.get(
  '/stats/:agencyId',
  requireRole(['prevention_officer', 'admin', 'system_admin', 'commissioner', 'director']),
  getAssessmentStats
);

// Get full assessment details with all indicators
router.get(
  '/full/:agencyId',
  requireRole(['prevention_officer', 'admin', 'system_admin', 'commissioner', 'director']),
  getFullAssessment
);

/* =========================
   Assessment Save Routes
   ========================= */

// Save single indicator assessment (prevention officers only)
router.post(
  '/save',
  requireRole(['prevention_officer']),
  saveIndicatorAssessment
);

// Save all assessments at once (prevention officers only)
router.post(
  '/save-all',
  requireRole(['prevention_officer']),
  saveAllAssessments
);

/* =========================
   Assessment Workflow Routes
   ========================= */

// Submit assessment for validation (prevention officers only)
router.post(
  '/submit',
  requireRole(['prevention_officer']),
  submitAssessment
);

// Validate assessment (commissioners, directors, admins only)
router.post(
  '/validate/:agencyId',
  requireRole(['commissioner', 'director', 'admin', 'system_admin']),
  validateAssessment
);

// Finalize assessment (lock scores) - prevention officers or admins
router.post(
  '/finalize/:agencyId',
  requireRole(['prevention_officer', 'admin', 'system_admin']),
  finalizeAssessment
);

// Unlock assessment (prevention officers and admins only - with reason)
router.post(
  '/unlock/:agencyId',
  requireRole(['prevention_officer', 'admin', 'system_admin']),
  unlockAssessment
);

/* =========================
   Scoring Routes
   ========================= */

// Calculate score for specific indicator (prevention officers only)
router.post(
  '/calculate-score',
  requireRole(['prevention_officer']),
  calculateIndicatorScore
);

/* =========================
   Form Generation Routes
   ========================= */

// Generate dynamic form from template (prevention officers and admins)
router.get(
  '/form/generate',
  requireRole(['prevention_officer', 'admin', 'system_admin']),
  generateAssessmentForm
);

// Validate form data before saving (prevention officers only)
router.post(
  '/form/validate',
  requireRole(['prevention_officer']),
  validateFormData
);

/* =========================
   Report Generation Routes
   ========================= */

// Generate agency report - multiple roles can view reports
router.get(
  '/report/:agencyId',
  requireRole(['prevention_officer', 'admin', 'system_admin', 'commissioner', 'director', 'agency_head']),
  getAgencyReport
);

// Generate summary report for all agencies (called from dashboard)
router.get(
  '/reports/overall',  // ← Add this for the dashboard
  requireRole(['prevention_officer', 'admin', 'system_admin', 'commissioner', 'director']),
  getSummaryReport
);

// Generate summary report for all agencies - multiple roles can view
router.get(
  '/reports/summary',
  requireRole(['prevention_officer', 'admin', 'system_admin', 'commissioner', 'director']),
  getSummaryReport
);

/* =========================
   Legacy Routes (commented out for reference)
   ========================= */
// router.get('/:agencyId/assessment', getAssessment); // Old endpoint
// router.post('/:agencyId/assessment/save', saveAssessment); // Old endpoint

export default router;