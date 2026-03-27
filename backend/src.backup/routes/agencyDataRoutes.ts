// backend/src/routes/agencyDataRoutes.ts

import { Router } from 'express';
import { 
  getAgencyData, 
  updateAgencyData,
  getAssignedOfficer 
} from '../controllers/agencyDataController';
import { requireAuth, requireRole } from '../middleware/auth';

// Remove the custom AuthRequest type and global declaration
// Express will handle the typing through the middleware

const router = Router();

// Apply authentication and role middleware to all routes in this file
router.use(requireAuth);
router.use(requireRole('prevention_officer'));

// GET /api/agency/data
router.get('/data', getAgencyData);

// PUT /api/agency/data
router.put('/data', updateAgencyData);

// GET /api/agency/assigned-officer
router.get('/assigned-officer', getAssignedOfficer);

export default router;