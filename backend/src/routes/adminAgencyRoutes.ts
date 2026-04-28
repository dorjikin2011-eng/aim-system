// backend/src/routes/adminAgencyRoutes.ts
import { Router } from 'express';
import { 
  getAgencies, 
  getAgencyById,
  createAgency, 
  updateAgency, 
  deleteAgency,
  createAgencyWithHOA,
  getPotentialHOAs
} from '../controllers/adminAgencyController';
import { requireRole, requireWriteAccess } from '../middleware/auth';

const router = Router();

// Agency routes - ORDER MATTERS (specific routes before parameterized)
router.get('/', requireRole(['system_admin', 'admin']), getAgencies);
router.get('/:id', requireRole(['system_admin', 'admin']), getAgencyById);
router.post('/', requireRole(['system_admin', 'admin']), requireWriteAccess, createAgency);
router.put('/:id', requireRole(['system_admin', 'admin']), requireWriteAccess, updateAgency);
router.delete('/:id', requireRole(['system_admin', 'admin']), requireWriteAccess, deleteAgency);

// Agency Creation Wizard routes
router.post('/create-with-hoa', requireRole(['system_admin', 'admin']), requireWriteAccess, createAgencyWithHOA);
router.get('/users/potential-hoas', requireRole(['system_admin', 'admin']), getPotentialHOAs);

export default router;