// backend/src/routes/focalRoutes.ts
import { Router } from 'express';
import { 
  getFocalIndicators, 
  submitToFocalHoA,
  saveIndicator 
} from '../controllers/focalDashboardController';

const router = Router();

router.get('/indicators', getFocalIndicators);
router.post('/submit', submitToFocalHoA);
router.post('/save-indicator', saveIndicator);

export default router;