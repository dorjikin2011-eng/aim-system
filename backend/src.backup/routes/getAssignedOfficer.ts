// backend/src/routes/getAssignedOfficer.ts

import { Router } from 'express';
import { getAssignedOfficer } from '../controllers/agencyDataController';
import { requireAuth, requireRole } from '../middleware/auth';
import { User } from '../types';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

const router = Router();

// Apply authentication and role middleware
router.use(requireAuth);
router.use(requireRole('prevention_officer'));

// GET /api/agency/assigned-officer - Get the prevention officer assigned to this agency
router.get('/', getAssignedOfficer);

export default router;