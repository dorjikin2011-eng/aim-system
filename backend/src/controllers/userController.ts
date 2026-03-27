// backend/src/services/userService.ts
import { Request, Response } from 'express';
import { getDB, getAsync, runAsync, allAsync } from '../models/db';
import * as bcrypt from 'bcryptjs';
import { generateTemporaryPassword } from '../utils/authUtils';
import { sendPasswordResetEmail } from '../services/emailService';
import { User } from '../types/user';

// ============================================
// Get user by ID
// ============================================
async function getUserById(id: string): Promise<User | null> {
  try {
    const db = getDB();
    const user = await getAsync<User>(
      db, 
      'SELECT id, email, name, role FROM users WHERE id = ?',
      [id]
    );
    return user || null;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
}

// ============================================
// Get user by email
// ============================================
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const db = getDB();
    const user = await getAsync<User>(
      db, 
      'SELECT id, email, name, role, password_hash, is_active FROM users WHERE email = ?',
      [email]
    );
    return user || null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
}

// ============================================
// Get user with agency details
// ============================================
export async function getUserWithAgency(id: string): Promise<any | null> {
  try {
    const db = getDB();
    const user = await getAsync<any>(
      db, 
      `SELECT 
        u.id, u.email, u.name, u.role, u.phone, u.department,
        u.agency_id, u.is_active, u.created_at, u.updated_at,
        a.name as agency_name, a.sector as agency_sector
       FROM users u
       LEFT JOIN agencies a ON u.agency_id = a.id
       WHERE u.id = ?`,
      [id]
    );
    return user || null;
  } catch (error) {
    console.error('Error getting user with agency:', error);
    return null;
  }
}

// ============================================
// Update user password
// ============================================
async function updateUserPassword(id: string, hashedPassword: string): Promise<void> {
  try {
    const db = getDB();
    await runAsync(db, 
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedPassword, id]
    );
  } catch (error) {
    console.error('Error updating user password:', error);
    throw error;
  }
}

// ============================================
// Get all users
// ============================================
export async function getAllUsers(includeInactive: boolean = false): Promise<User[]> {
  try {
    const db = getDB();
    let query = 'SELECT id, email, name, role, agency_id, is_active, created_at, updated_at FROM users';
    if (!includeInactive) {
      query += ' WHERE is_active = 1';
    }
    query += ' ORDER BY created_at DESC';
    
    const users = await allAsync<User[]>(db, query, []);
    return users || [];
  } catch (error) {
    console.error('Error getting all users:', error);
    return [];
  }
}

// ============================================
// Get users by role
// ============================================
export async function getUsersByRole(role: string): Promise<User[]> {
  try {
    const db = getDB();
    const users = await allAsync<User[]>(
      db,
      'SELECT id, email, name, role, agency_id, is_active FROM users WHERE role = ? AND is_active = 1 ORDER BY name',
      [role]
    );
    return users || [];
  } catch (error) {
    console.error('Error getting users by role:', error);
    return [];
  }
}

// ============================================
// Get users by agency
// ============================================
export async function getUsersByAgency(agencyId: string): Promise<User[]> {
  try {
    const db = getDB();
    const users = await allAsync<User[]>(
      db,
      'SELECT id, email, name, role, phone, department FROM users WHERE agency_id = ? AND is_active = 1 ORDER BY name',
      [agencyId]
    );
    return users || [];
  } catch (error) {
    console.error('Error getting users by agency:', error);
    return [];
  }
}

// ============================================
// Create new user
// ============================================
export async function createUser(
  email: string,
  name: string,
  role: string,
  agencyId: string | null = null,
  phone: string | null = null,
  department: string | null = null,
  sendEmail: boolean = true
): Promise<{ id: string; tempPassword: string }> {
  try {
    const db = getDB();
    
    // Check if user already exists
    const existing = await getAsync<User>(
      db,
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    
    if (existing) {
      throw new Error('User with this email already exists');
    }
    
    // Generate temporary password
    const tempPassword = generateTemporaryPassword(12);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    
    // Create user
    const userId = `USR_${Date.now()}_${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    const now = new Date().toISOString();
    
    await runAsync(db,
      `INSERT INTO users (
        id, email, name, password_hash, role, agency_id, 
        phone, department, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [userId, email, name, hashedPassword, role, agencyId, phone, department, now, now]
    );
    
    // Send email if requested
    if (sendEmail) {
      await sendPasswordResetEmail(email, tempPassword);
    }
    
    return { id: userId, tempPassword };
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

// ============================================
// Update user
// ============================================
export async function updateUser(
  id: string,
  updates: Partial<User>
): Promise<boolean> {
  try {
    const db = getDB();
    const updateFields: string[] = [];
    const params: any[] = [];
    
    if (updates.name !== undefined) {
      updateFields.push('name = ?');
      params.push(updates.name);
    }
    if (updates.role !== undefined) {
      updateFields.push('role = ?');
      params.push(updates.role);
    }
    if (updates.agency_id !== undefined) {
      updateFields.push('agency_id = ?');
      params.push(updates.agency_id);
    }
    if (updates.phone !== undefined) {
      updateFields.push('phone = ?');
      params.push(updates.phone);
    }
    if (updates.department !== undefined) {
      updateFields.push('department = ?');
      params.push(updates.department);
    }
    if (updates.is_active !== undefined) {
      updateFields.push('is_active = ?');
      params.push(updates.is_active ? 1 : 0);
    }
    
    if (updateFields.length === 0) {
      return false;
    }
    
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);
    
    await runAsync(db,
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );
    
    return true;
  } catch (error) {
    console.error('Error updating user:', error);
    return false;
  }
}

// ============================================
// Delete user (soft delete)
// ============================================
export async function deleteUser(id: string): Promise<boolean> {
  try {
    const db = getDB();
    await runAsync(db,
      'UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    return false;
  }
}

// ============================================
// Hard delete user (permanent)
// ============================================
export async function hardDeleteUser(id: string): Promise<boolean> {
  try {
    const db = getDB();
    await runAsync(db, 'DELETE FROM users WHERE id = ?', [id]);
    return true;
  } catch (error) {
    console.error('Error hard deleting user:', error);
    return false;
  }
}

// ============================================
// Reset user password (admin initiated)
// ============================================
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
    
    console.log(`Password reset initiated for user ${user.email} by admin ${(req as any).session?.user?.email || 'system'}`);
    
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

// ============================================
// Change user password (user initiated)
// ============================================
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  try {
    const db = getDB();
    
    // Get user with password hash
    const user = await getAsync<any>(
      db,
      'SELECT id, password_hash FROM users WHERE id = ?',
      [userId]
    );
    
    if (!user) {
      return { success: false, message: 'User not found' };
    }
    
    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      return { success: false, message: 'Current password is incorrect' };
    }
    
    // Hash new password and update
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await updateUserPassword(userId, hashedPassword);
    
    return { success: true, message: 'Password changed successfully' };
  } catch (error) {
    console.error('Error changing password:', error);
    return { success: false, message: 'Failed to change password' };
  }
}

// ============================================
// Get user stats
// ============================================
export async function getUserStats(): Promise<any> {
  try {
    const db = getDB();
    
    const stats = await getAsync<any>(
      db,
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN role = 'system_admin' THEN 1 ELSE 0 END) as admins,
        SUM(CASE WHEN role = 'commissioner' THEN 1 ELSE 0 END) as commissioners,
        SUM(CASE WHEN role = 'director' THEN 1 ELSE 0 END) as directors,
        SUM(CASE WHEN role = 'prevention_officer' THEN 1 ELSE 0 END) as prevention_officers,
        SUM(CASE WHEN role = 'agency_head' THEN 1 ELSE 0 END) as agency_heads,
        SUM(CASE WHEN role = 'focal_person' THEN 1 ELSE 0 END) as focal_persons,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive
       FROM users`,
      []
    );
    
    return stats || {
      total: 0,
      admins: 0,
      commissioners: 0,
      directors: 0,
      prevention_officers: 0,
      agency_heads: 0,
      focal_persons: 0,
      active: 0,
      inactive: 0
    };
  } catch (error) {
    console.error('Error getting user stats:', error);
    return null;
  }
}