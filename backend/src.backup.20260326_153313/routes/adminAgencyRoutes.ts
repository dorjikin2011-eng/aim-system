// backend/src/routes/adminAgencyRoutes.ts
import { Router } from 'express';
import { 
  getAgencies, 
  getAgencyById,        // ✅ ADDED: Required for edit form
  createAgency, 
  updateAgency, 
  deleteAgency,
  createAgencyWithHOA,
  getPotentialHOAs
} from '../controllers/adminAgencyController';
import { requireRole } from '../middleware/auth';

const router = Router();

// Agency routes - ORDER MATTERS (specific routes before parameterized)
router.get('/', requireRole(['system_admin', 'admin']), getAgencies);
router.get('/:id', requireRole(['system_admin', 'admin']), getAgencyById); // ✅ ADDED
router.post('/', requireRole(['system_admin', 'admin']), createAgency);
router.put('/:id', requireRole(['system_admin', 'admin']), updateAgency);
router.delete('/:id', requireRole(['system_admin', 'admin']), deleteAgency);

// Agency Creation Wizard routes
router.post('/create-with-hoa', requireRole(['system_admin', 'admin']), createAgencyWithHOA);
router.get('/users/potential-hoas', requireRole(['system_admin', 'admin']), getPotentialHOAs);

export default router;