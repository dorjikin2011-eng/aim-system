import express from 'express';
import { getDirectorDashboard } from '../controllers/directorController';

const router = express.Router();

// Dashboard data - only accessible to directors
router.get('/dashboard', (req, res, next) => {
  // Check session and role
  if (!req.session?.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  if (req.session.user.role !== 'director') {
    return res.status(403).json({ 
      error: 'Access denied. Director role required.',
      userRole: req.session.user.role
    });
  }
  
  // Continue to the dashboard controller
  next();
}, getDirectorDashboard);

export default router;