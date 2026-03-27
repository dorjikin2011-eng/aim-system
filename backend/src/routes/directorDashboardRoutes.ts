// backend/src/routes/directorDashboardRoutes.ts
import express from 'express';
import { getDirectorDashboard } from '../controllers/directorController';

const router = express.Router();

// Dashboard data - only accessible to directors
router.get('/dashboard', (req, res, next) => {
  // Check session and role with type assertion
  if (!(req.session as any)?.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  if ((req.session as any).user.role !== 'director') {
    return res.status(403).json({ 
      error: 'Access denied. Director role required.',
      userRole: (req.session as any).user.role
    });
  }
  
  // Continue to the dashboard controller
  next();
}, getDirectorDashboard);

export default router;