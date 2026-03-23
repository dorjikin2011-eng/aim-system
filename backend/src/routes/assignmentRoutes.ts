// backend/src/routes/assignmentRoutes.ts
import { Router } from 'express';
import { getAgencyReport } from '../controllers/assessmentController';
import { 
  getAssignments,
  getOfficerAssignments,
  getAvailableOfficers,
  getUnassignedAgencies,
  createAssignment,
  deleteAssignment,
  getAssignmentStats
} from '../controllers/assignmentController';
import { requireRole } from '../middleware/auth';

const router = Router();

// All routes require system_admin role
router.get('/', requireRole(['system_admin', 'admin']), getAssignments);
router.get('/stats', requireRole(['system_admin', 'admin']), getAssignmentStats);
router.get('/available-officers', requireRole(['system_admin', 'admin']), getAvailableOfficers);
router.get('/unassigned-agencies', requireRole(['system_admin', 'admin']), getUnassignedAgencies);
router.get('/officers/:officerId', requireRole(['system_admin', 'admin']), getOfficerAssignments);
router.post('/', requireRole(['system_admin', 'admin']), createAssignment);
router.delete('/:id', requireRole(['system_admin', 'admin']), deleteAssignment);
// Agency report
router.get('/report/:agencyId', requireRole(['prevention_officer']), getAgencyReport);

export default router;