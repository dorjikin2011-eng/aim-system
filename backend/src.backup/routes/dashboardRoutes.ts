// backend/src/routes/dashboardRoutes.ts
import { Router } from 'express';
import { getDashboardData } from '../controllers/dashboardController';

const router = Router();
router.get('/dashboard', getDashboardData); // ✅ GET /api/prevention/dashboard
export default router;