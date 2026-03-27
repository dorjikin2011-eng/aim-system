// /backend/src/controllers/passwordResetController.ts
import { Request, Response } from 'express';
import crypto from 'crypto';
import * as bcrypt from 'bcryptjs'; // ✅ ADD THIS - same as authController
import { getDB } from '../models/db';
import { sendEmail } from '../services/emailService';

// Request password reset
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const db = getDB();
  try {
    
    // Check if user exists
    const user = await new Promise<any>((resolve, reject) => {
      await getAsync(db, 
        'SELECT id, email, name FROM users WHERE email = ?',
        [email],
        (err, row) => {
          if (err) {
            console.error('Database error:', err);
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });

    // For security, don't reveal if user exists
    if (!user) {
      console.log(`Password reset requested for non-existent email: ${email}`);
      return res.json({ 
        message: 'If an account exists with this email, a password reset link will be sent.' 
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour from now
    
    console.log('Generated reset token for user:', user.email);
    console.log('Token:', resetToken);
    console.log('Expires:', resetExpires);

    // Save token to database
    try {
      await new Promise<void>((resolve, reject) => {
        await runAsync(db, 
          `UPDATE users 
           SET password_reset_token = ?, password_reset_expires = ? 
           WHERE id = ?`,
          [resetToken, resetExpires.toISOString(), user.id],
          (err) => {
            if (err) {
              console.error('Database update error:', err);
              reject(err);
            } else {
              console.log('Token saved to database for user:', user.id);
              resolve();
            }
          }
        );
      });
    } catch (dbError) {
      console.error('Failed to save token to database:', dbError);
      // Check if columns exist
      console.log('Checking if password_reset_token column exists...');
      const columns = await new Promise<any[]>((resolve, reject) => {
        await allAsync(db, "PRAGMA table_info(users)", (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      const columnNames = columns.map(col => col.name);
      console.log('Available columns:', columnNames);
      
      if (!columnNames.includes('password_reset_token')) {
        return res.status(500).json({ 
          error: 'Database configuration error. Please contact administrator.' 
        });
      }
    }

    // Create reset URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
    
    console.log('Reset URL:', resetUrl);

    // Send email
    try {
      await sendEmail({
        to: user.email,
        subject: 'Password Reset Request - ACC AIMS',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Password Reset Request</h2>
            <p>Hello ${user.name},</p>
            <p>You have requested to reset your password for the ACC Agency Integrity Maturity System (AIMS).</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #2563eb; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 6px; font-weight: bold;">
                Reset Password
              </a>
            </div>
            <p>Or copy and paste this link in your browser:</p>
            <p style="background-color: #f3f4f6; padding: 10px; border-radius: 4px; 
                      word-break: break-all; font-family: monospace;">
              ${resetUrl}
            </p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this password reset, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #6b7280; font-size: 14px;">
              This is an automated message from ACC AIMS System.
            </p>
          </div>
        `
      });
      
      console.log('Password reset email sent to:', user.email);
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Don't fail the request if email fails
      // In production, you might want to queue the email
    }

    res.json({ 
      message: 'If an account exists with this email, a password reset link will be sent.' 
    });
    
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      error: 'Failed to process password reset request. Please try again later.' 
    });
  }
};

// Validate reset token
export const validateResetToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const db = getDB();
  try {
    
    // Check if token is valid and not expired
    const user = await new Promise<any>((resolve, reject) => {
      await getAsync(db, 
        `SELECT id, email, name, password_reset_expires 
         FROM users 
         WHERE password_reset_token = ? 
           AND password_reset_expires > ?`,
        [token, new Date().toISOString()],
        (err, row) => {
          if (err) {
            console.error('Database error:', err);
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });

    if (!user) {
      return res.status(400).json({ 
        valid: false, 
        error: 'Invalid or expired reset token' 
      });
    }

    res.json({ 
      valid: true,
      email: user.email,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
    
  } catch (error) {
    console.error('Validate token error:', error);
    res.status(500).json({ 
      valid: false,
      error: 'Failed to validate reset token' 
    });
  }
};

// Hash password function using bcrypt (same as authController)
const hashPassword = async (password: string): Promise<string> => {
  try {
    // Use the same salt rounds as your UserService
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
  } catch (error) {
    console.error('Password hashing error:', error);
    throw new Error('Failed to hash password');
  }
};

// Reset password with token
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      return res.status(400).json({ 
        error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' 
      });
    }

    const db = getDB();
  try {
    
    // Check if token is valid and not expired
    const user = await new Promise<any>((resolve, reject) => {
      await getAsync(db, 
        `SELECT id, email, name 
         FROM users 
         WHERE password_reset_token = ? 
           AND password_reset_expires > ?`,
        [token, new Date().toISOString()],
        (err, row) => {
          if (err) {
            console.error('Database error:', err);
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });

    if (!user) {
      return res.status(400).json({ 
        error: 'Invalid or expired reset token' 
      });
    }

    // Hash the new password using bcrypt
    const hashedPassword = await hashPassword(newPassword);
    
    // Update password and clear reset token
    try {
      await new Promise<void>((resolve, reject) => {
        await runAsync(db, 
          `UPDATE users 
           SET password_hash = ?, 
               password_reset_token = NULL, 
               password_reset_expires = NULL,
               password_changed_at = ?,
               updated_at = ?
           WHERE id = ?`,
          [
            hashedPassword, 
            new Date().toISOString(),
            new Date().toISOString(),
            user.id
          ],
          (err) => {
            if (err) {
              console.error('Database update error:', err);
              reject(err);
            } else {
              console.log('Password updated for user:', user.email);
              resolve();
            }
          }
        );
      });
    } catch (updateError) {
      console.error('Failed to update password:', updateError);
      return res.status(500).json({ 
        error: 'Failed to update password. Please try again.' 
      });
    }

    // Send confirmation email
    try {
      await sendEmail({
        to: user.email,
        subject: 'Password Reset Successful - ACC AIMS',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10b981;">Password Reset Successful</h2>
            <p>Hello ${user.name},</p>
            <p>Your password for the ACC Agency Integrity Maturity System (AIMS) has been successfully reset.</p>
            <p>If you did not make this change, please contact the system administrator immediately.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #6b7280; font-size: 14px;">
              This is an automated message from ACC AIMS System.
            </p>
          </div>
        `
      });
      console.log('Confirmation email sent to:', user.email);
    } catch (emailError) {
      console.error('Confirmation email error:', emailError);
      // Don't fail the request if email fails
    }

    res.json({ 
      success: true,
      message: 'Password has been reset successfully. You can now login with your new password.' 
    });
    
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      error: 'Failed to reset password. Please try again.' 
    });
  }
};