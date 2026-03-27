//backend/src/routes/authRoutes.ts
import { Router } from 'express';
import { 
  login, 
  logout, 
  getCurrentUser, 
  changePassword 
} from '../controllers/authController';
import { 
  forgotPassword as requestPasswordReset, // ✅ ALIAS
  validateResetToken, 
  resetPassword 
} from '../controllers/passwordResetController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Login/Logout
router.post('/login', login);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, getCurrentUser);

// Password management
router.post('/change-password', requireAuth, changePassword);
router.post('/forgot-password', requestPasswordReset); // ✅ Now works with alias
router.get('/validate-reset-token/:token', validateResetToken);
router.post('/reset-password', resetPassword);

export default router;
