import { Router } from 'express';
import { 
  getHoaNominations,
  nominateFocal,
  getPendingNominations,
  approveNomination,
  rejectNomination
} from '../controllers/focalNominationController';

const router = Router();

// HoA routes
router.get('/nominations', getHoaNominations);
router.post('/nominate-focal', nominateFocal);

// ACC admin routes
router.get('/admin/focal-nominations', getPendingNominations);
router.post('/admin/focal-nominations/:id/approve', approveNomination);
router.post('/admin/focal-nominations/:id/reject', rejectNomination);

export default router;
