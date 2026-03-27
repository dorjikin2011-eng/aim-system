import { Router } from 'express';
import { getCommissionDashboard } from '../controllers/commissionDashboardController';

const router = Router();

// GET /api/commission/dashboard
router.get('/dashboard', getCommissionDashboard);

export default router;
