// backend/src/routes/assignedOfficerRoutes.ts

import { Router } from 'express';
import { getAssignedOfficer } from '../controllers/agencyDataController';
import { requireAuth, requireRole } from '../middleware/auth';

// Remove the custom AuthRequest type - Express will handle it
const router = Router();

// Apply authentication and role middleware
router.use(requireAuth);
router.use(requireRole('prevention_officer'));

// GET /api/agency/assigned-officer - Get the prevention officer assigned to this agency
router.get('/', getAssignedOfficer);  // Now this will work

export default router;