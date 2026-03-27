import { Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import { getDB } from '../models/db';
import { generateTemporaryPassword } from '../utils/authUtils';
import { sendPasswordResetEmail } from '../services/emailService';
import { User } from '../types/user';

async function getUserById(id: string): Promise<User | null> {
  const db = getDB();
  try {
  return new Promise((resolve, reject) => {
    await getAsync(db, 
      'SELECT id, email, name, role FROM users WHERE id = ?',
      [id],
      (err: Error | null, row: any) => {
        if (err) reject(err);
        else resolve(row as User | null);
      }
    );
  });
}

async function updateUserPassword(id: string, hashedPassword: string) {
  const db = getDB();
  try {
  return new Promise((resolve, reject) => {
    await runAsync(db, 
      'UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?',
      [hashedPassword, id],
      function(err: Error | null) {
        if (err) reject(err);
        else resolve(this);
      }
    );
  });
}

export const resetUserPassword = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    const user = await getUserById(id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const tempPassword = generateTemporaryPassword(12);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    
    await updateUserPassword(id, hashedPassword);
    await sendPasswordResetEmail(user.email, tempPassword);
    
    console.log(`Password reset initiated for user ${user.email} by admin ${req.session.user?.email}`);
    
    res.json({ 
      success: true, 
      message: 'Password reset instructions sent successfully' 
    });
    
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ 
      error: 'Failed to reset password. Please try again later.' 
    });
  }
};