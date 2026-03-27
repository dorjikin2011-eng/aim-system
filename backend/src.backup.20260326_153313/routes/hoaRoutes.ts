import { Router } from 'express';
import { 
  getHoaSubmissions, 
  approveSubmission, 
  returnSubmission, 
  validateFinalScore 
} from '../controllers/hoaDashboardController';

const router = Router();

router.get('/submissions', getHoaSubmissions);
router.post('/approve', approveSubmission);
router.post('/return', returnSubmission);
router.post('/validate', validateFinalScore);

export default router;
