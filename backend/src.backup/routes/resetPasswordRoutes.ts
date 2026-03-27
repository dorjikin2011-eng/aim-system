import express from 'express';
import {
  forgotPassword,
  resetPassword,
  validateResetToken
} from '../controllers/passwordResetController';

const router = express.Router();

router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/validate-token/:token', validateResetToken);

export default router;