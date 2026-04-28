import { Router } from 'express';
import { 
  getUsers, 
  getUser,
  createUser, 
  updateUser, 
  deleteUser,
  resetPassword
} from '../controllers/adminUserController';
import { requireRole, requireWriteAccess } from '../middleware/auth';

const router = Router();

router.get('/', requireRole(['system_admin', 'admin']), getUsers);
router.post('/', requireRole(['system_admin', 'admin']), requireWriteAccess, createUser);
router.put('/:id', requireRole(['system_admin', 'admin']), requireWriteAccess, updateUser);
router.delete('/:id', requireRole(['system_admin', 'admin']), requireWriteAccess, deleteUser);
router.post('/:id/reset-password', requireRole(['system_admin', 'admin']), requireWriteAccess, resetPassword);
router.get('/:id', getUser);

export default router;                                                                                                         