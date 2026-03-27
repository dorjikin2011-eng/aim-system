import { Router } from 'express';
import { 
  getUsers, 
  getUser,
  createUser, 
  updateUser, 
  deleteUser,
  resetPassword
} from '../controllers/adminUserController';
import { requireRole } from '../middleware/auth';

const router = Router();

router.get('/', requireRole(['system_admin', 'admin']), getUsers);
router.post('/', requireRole(['system_admin', 'admin']), createUser);
router.put('/:id', requireRole(['system_admin', 'admin']), updateUser);
router.delete('/:id', requireRole(['system_admin', 'admin']), deleteUser);
router.post('/:id/reset-password', requireRole(['system_admin', 'admin']), resetPassword);
router.get('/:id', getUser);

export default router;