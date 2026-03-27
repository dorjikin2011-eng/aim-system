// backend/src/routes/getAssignedOfficer.ts

import { Router, Request } from 'express';
import { getAssignedOfficer } from '../controllers/agencyDataController';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// Extend Express Request type locally to match your middleware
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string;
      email: string;
      role: string;
    };
  }
}

// Apply authentication and role middleware
router.use(requireAuth);
router.use(requireRole('prevention_officer'));

// GET /api/agency/assigned-officer - Get the prevention officer assigned to this agency
router.get('/', getAssignedOfficer);

export default router;