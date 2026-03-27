// backend/src/services/userService.ts
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getDB, getAsync, runAsync, allAsync } from '../models/db';
import { User, UserRole } from '../types/user';

interface DBUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  agency_id?: string;
  password_hash: string;
  password_reset_token?: string;
  password_reset_expires?: string;
  last_password_change?: string;
  last_login?: string;
  login_attempts?: number;
  lock_until?: string;
  is_active?: number;
  department?: string;
  phone?: string;
  profile_image?: string;
  created_at?: string;
  updated_at?: string;
}

export class UserService {
  // Find user by email
  static async findByEmail(email: string): Promise<User | null> {
    const db = getDB();
    const searchEmail = email.toLowerCase();
    
    console.log('Search email:', searchEmail);
    
    // List all users to see what's in the database
    try {
      const allUsers = await allAsync<any[]>(
        db,
        'SELECT email, LENGTH(email) as len FROM users',
        []
      );
      console.log('All users in database:', allUsers);
    } catch (error) {
      console.error('Failed to get all users:', error);
    }
    
    // Get user with proper async
    const user = await getAsync<DBUser>(
      db, 
      'SELECT * FROM users WHERE email = ?', 
      [searchEmail]
    );
    
    if (!user) return null;
    
    return this.mapDBUserToUser(user);
  }

  // Find user by ID
  static async findById(id: string): Promise<User | null> {
    const db = getDB();
    const user = await getAsync<DBUser>(
      db, 
      'SELECT * FROM users WHERE id = ?', 
      [id]
    );
    
    if (!user) return null;
    
    return this.mapDBUserToUser(user);
  }

  // Create new user
  static async create(userData: {
    email: string;
    password: string;
    name: string;
    role: UserRole;
    agency_id?: string;
    department?: string;
    phone?: string;
  }): Promise<User> {
    const db = getDB();
    const id = crypto.randomUUID();
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    await runAsync(db, `
      INSERT INTO users (
        id, email, name, role, password_hash, 
        agency_id, department, phone, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      userData.email.toLowerCase(),
      userData.name,
      userData.role,
      hashedPassword,
      userData.agency_id || null,
      userData.department || null,
      userData.phone || null,
      1
    ]);

    return {
      id,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      agency_id: userData.agency_id,
      department: userData.department,
      phone: userData.phone,
      password_hash: hashedPassword
    };
  }

  // Update user password
  static async updatePassword(userId: string, newPassword: string): Promise<void> {
    const db = getDB();
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await runAsync(db, `
      UPDATE users 
      SET password_hash = ?, 
          password_reset_token = NULL,
          password_reset_expires = NULL,
          last_password_change = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [hashedPassword, userId]);
  }

  // Set password reset token in users table
  static async setPasswordResetToken(email: string, token: string): Promise<void> {
    const db = getDB();
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour
    
    await runAsync(db, `
      UPDATE users 
      SET password_reset_token = ?,
          password_reset_expires = ?
      WHERE email = ?
    `, [token, expiresAt.toISOString(), email.toLowerCase()]);
  }

  // Store reset token in password_reset_tokens table
  static async storeResetToken(email: string, token: string): Promise<void> {
    const db = getDB();
    const id = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour
    
    await runAsync(db, `
      INSERT OR REPLACE INTO password_reset_tokens (id, token, email, expires_at)
      VALUES (?, ?, ?, ?)
    `, [id, token, email.toLowerCase(), expiresAt.toISOString()]);
  }

  // Validate password reset token from password_reset_tokens table
  static async validateResetToken(token: string): Promise<{ email: string; isValid: boolean }> {
    const db = getDB();
    
    const tokenRecord = await getAsync<any>(db, `
      SELECT token, email, expires_at, used 
      FROM password_reset_tokens 
      WHERE token = ? AND used = 0
    `, [token]);
    
    if (!tokenRecord) {
      return { email: '', isValid: false };
    }
    
    const expiresAt = new Date(tokenRecord.expires_at);
    const isValid = expiresAt > new Date();
    
    return { 
      email: tokenRecord.email, 
      isValid 
    };
  }

  // Mark reset token as used
  static async markTokenAsUsed(token: string): Promise<void> {
    const db = getDB();
    
    await runAsync(db, `
      UPDATE password_reset_tokens 
      SET used = 1 
      WHERE token = ?
    `, [token]);
  }

  // Clear password reset token from users table
  static async clearPasswordResetToken(email: string): Promise<void> {
    const db = getDB();
    
    await runAsync(db, `
      UPDATE users 
      SET password_reset_token = NULL,
          password_reset_expires = NULL
      WHERE email = ?
    `, [email.toLowerCase()]);
  }

  // Verify password
  static async verifyPassword(userId: string, password: string): Promise<boolean> {
    const user = await this.findById(userId);
    
    if (!user) return false;
    
    return await bcrypt.compare(password, user.password_hash);
  }

  // Verify password by email
  static async verifyPasswordByEmail(email: string, password: string): Promise<boolean> {
    const user = await this.findByEmail(email);
    
    if (!user) {
      console.log('verifyPasswordByEmail: User not found');
      return false;
    }
    
    console.log('verifyPasswordByEmail - User found:', user.email);
    console.log('verifyPasswordByEmail - Password provided:', password);
    console.log('verifyPasswordByEmail - Stored hash length:', user.password_hash?.length);
    
    // Check if hash looks like a bcrypt hash
    const isBcryptHash = user.password_hash?.startsWith('$2a$') || 
                         user.password_hash?.startsWith('$2b$') || 
                         user.password_hash?.startsWith('$2y$');
    console.log('verifyPasswordByEmail - Looks like bcrypt hash:', isBcryptHash);
    
    const result = await bcrypt.compare(password, user.password_hash);
    console.log('verifyPasswordByEmail - bcrypt.compare result:', result);
    
    return result;
  }

  // Update last login
  static async updateLastLogin(userId: string): Promise<void> {
    const db = getDB();
    
    await runAsync(db, `
      UPDATE users 
      SET last_login = CURRENT_TIMESTAMP,
          login_attempts = 0,
          lock_until = NULL
      WHERE id = ?
    `, [userId]);
  }

  // Increment login attempts
  static async incrementLoginAttempts(email: string): Promise<void> {
    const db = getDB();
    
    // Get current attempts
    const user = await getAsync<DBUser>(
      db, 
      'SELECT login_attempts, lock_until FROM users WHERE email = ?', 
      [email.toLowerCase()]
    );
    
    if (!user) return;
    
    let attempts = (user.login_attempts || 0) + 1;
    let lockUntil = user.lock_until || null;
    
    // Check if lock has expired
    if (lockUntil && new Date(lockUntil) < new Date()) {
      attempts = 1;
      lockUntil = null;
    }
    
    // Lock account after 5 failed attempts (30 minutes lock)
    if (attempts >= 5) {
      lockUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    }
    
    await runAsync(db, `
      UPDATE users 
      SET login_attempts = ?,
          lock_until = ?
      WHERE email = ?
    `, [attempts, lockUntil, email.toLowerCase()]);
  }

  // Check if account is locked
  static async isAccountLocked(email: string): Promise<boolean> {
    const db = getDB();
    const user = await getAsync<DBUser>(db, `
      SELECT lock_until FROM users WHERE email = ?
    `, [email.toLowerCase()]);
    
    if (!user || !user.lock_until) return false;
    
    const lockUntil = new Date(user.lock_until);
    return lockUntil > new Date();
  }

  // Get lock time remaining (in minutes)
  static async getLockTimeRemaining(email: string): Promise<number> {
    const db = getDB();
    const user = await getAsync<DBUser>(db, `
      SELECT lock_until FROM users WHERE email = ?
    `, [email.toLowerCase()]);
    
    if (!user || !user.lock_until) return 0;
    
    const lockUntil = new Date(user.lock_until);
    const now = new Date();
    
    if (lockUntil <= now) return 0;
    
    return Math.ceil((lockUntil.getTime() - now.getTime()) / 60000);
  }

  // Map database user to User type
  private static mapDBUserToUser(dbUser: DBUser): User {
    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
      agency_id: dbUser.agency_id,
      password_hash: dbUser.password_hash,
      password_reset_token: dbUser.password_reset_token,
      password_reset_expires: dbUser.password_reset_expires,
      last_password_change: dbUser.last_password_change,
      last_login: dbUser.last_login,
      login_attempts: dbUser.login_attempts,
      lock_until: dbUser.lock_until,
      is_active: dbUser.is_active === 1,
      department: dbUser.department,
      phone: dbUser.phone,
      profile_image: dbUser.profile_image,
      created_at: dbUser.created_at,
      updated_at: dbUser.updated_at
    };
  }

  // Get user for auth (without sensitive info)
  static async getAuthUser(email: string): Promise<any> {
    const db = getDB();
    const user = await getAsync<any>(db, `
      SELECT id, email, name, role, agency_id, department, phone, profile_image
      FROM users WHERE email = ? AND is_active = 1
    `, [email.toLowerCase()]);
    
    return user;
  }

  // Get user for auth by ID (without sensitive info)
  static async getAuthUserById(id: string): Promise<any> {
    const db = getDB();
    const user = await getAsync<any>(db, `
      SELECT id, email, name, role, agency_id, department, phone, profile_image
      FROM users WHERE id = ? AND is_active = 1
    `, [id]);
    
    return user;
  }

  // Update user profile
  static async updateProfile(userId: string, profileData: {
    name?: string;
    department?: string;
    phone?: string;
    profile_image?: string;
  }): Promise<void> {
    const db = getDB();
    
    const updates: string[] = [];
    const params: any[] = [];
    
    if (profileData.name !== undefined) {
      updates.push('name = ?');
      params.push(profileData.name);
    }
    
    if (profileData.department !== undefined) {
      updates.push('department = ?');
      params.push(profileData.department);
    }
    
    if (profileData.phone !== undefined) {
      updates.push('phone = ?');
      params.push(profileData.phone);
    }
    
    if (profileData.profile_image !== undefined) {
      updates.push('profile_image = ?');
      params.push(profileData.profile_image);
    }
    
    if (updates.length === 0) return;
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(userId);
    
    await runAsync(db, `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = ?
    `, params);
  }

  // Deactivate user account
  static async deactivateAccount(userId: string): Promise<void> {
    const db = getDB();
    
    await runAsync(db, `
      UPDATE users 
      SET is_active = 0,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [userId]);
  }

  // Reactivate user account
  static async reactivateAccount(userId: string): Promise<void> {
    const db = getDB();
    
    await runAsync(db, `
      UPDATE users 
      SET is_active = 1,
          login_attempts = 0,
          lock_until = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [userId]);
  }

  // Get all users (for admin)
  static async getAllUsers(): Promise<User[]> {
    const db = getDB();
    const users = await allAsync<DBUser[]>(
      db, 
      'SELECT * FROM users ORDER BY created_at DESC',
      []
    );
    
    return users.map(user => this.mapDBUserToUser(user));
  }

  // Search users
  static async searchUsers(query: string): Promise<User[]> {
    const db = getDB();
    const searchTerm = `%${query}%`;
    
    const users = await allAsync<DBUser[]>(
      db, 
      `SELECT * FROM users 
       WHERE name LIKE ? OR email LIKE ? OR department LIKE ?
       ORDER BY name`,
      [searchTerm, searchTerm, searchTerm]
    );
    
    return users.map(user => this.mapDBUserToUser(user));
  }
}

export default UserService;