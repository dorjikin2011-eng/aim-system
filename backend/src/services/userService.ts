// backend/src/services/userService.ts
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from '../models/db'; // PostgreSQL Pool instance
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
  is_active?: boolean;
  department?: string;
  phone?: string;
  profile_image?: string;
  created_at?: string;
  updated_at?: string;
}

export class UserService {

  /** -------------------- USER FINDING -------------------- */

  static async findByEmail(email: string): Promise<User | null> {
    const result = await db.query<DBUser>(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    const user = result.rows[0];
    if (!user) return null;
    return this.mapDBUserToUser(user);
  }

  static async findById(id: string): Promise<User | null> {
    const result = await db.query<DBUser>(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    const user = result.rows[0];
    if (!user) return null;
    return this.mapDBUserToUser(user);
  }

  /** -------------------- USER CREATION -------------------- */

  static async create(userData: {
    email: string;
    password: string;
    name: string;
    role: UserRole;
    agency_id?: string;
    department?: string;
    phone?: string;
  }): Promise<User> {
    const id = crypto.randomUUID();
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    await db.query(
      `INSERT INTO users 
        (id, email, name, role, password_hash, agency_id, department, phone, is_active, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())`,
      [
        id,
        userData.email.toLowerCase(),
        userData.name,
        userData.role,
        hashedPassword,
        userData.agency_id || null,
        userData.department || null,
        userData.phone || null,
        true
      ]
    );

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

  /** -------------------- PASSWORD HANDLING -------------------- */

  static async updatePassword(userId: string, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query(
      `UPDATE users
       SET password_hash = $1,
           password_reset_token = NULL,
           password_reset_expires = NULL,
           last_password_change = NOW(),
           updated_at = NOW()
       WHERE id = $2`,
      [hashedPassword, userId]
    );
  }

  static async verifyPassword(userId: string, password: string): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user) return false;
    return bcrypt.compare(password, user.password_hash);
  }

  static async verifyPasswordByEmail(email: string, password: string): Promise<boolean> {
    const user = await this.findByEmail(email);
    if (!user) return false;
    return bcrypt.compare(password, user.password_hash);
  }

  /** -------------------- PASSWORD RESET -------------------- */

  static async setPasswordResetToken(email: string, token: string): Promise<void> {
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour
    await db.query(
      `UPDATE users
       SET password_reset_token = $1,
           password_reset_expires = $2
       WHERE email = $3`,
      [token, expiresAt.toISOString(), email.toLowerCase()]
    );
  }

  static async storeResetToken(email: string, token: string): Promise<void> {
    const id = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    await db.query(
      `INSERT INTO password_reset_tokens (id, token, email, expires_at, used)
       VALUES ($1,$2,$3,$4,false)
       ON CONFLICT (email) DO UPDATE
       SET token = EXCLUDED.token,
           expires_at = EXCLUDED.expires_at,
           used = false`,
      [id, token, email.toLowerCase(), expiresAt.toISOString()]
    );
  }

  static async validateResetToken(token: string): Promise<{ email: string; isValid: boolean }> {
    const result = await db.query(
      `SELECT token, email, expires_at, used
       FROM password_reset_tokens
       WHERE token = $1 AND used = false`,
      [token]
    );
    const tokenRecord = result.rows[0];
    if (!tokenRecord) return { email: '', isValid: false };
    return {
      email: tokenRecord.email,
      isValid: new Date(tokenRecord.expires_at) > new Date()
    };
  }

  static async markTokenAsUsed(token: string): Promise<void> {
    await db.query(
      `UPDATE password_reset_tokens
       SET used = true
       WHERE token = $1`,
      [token]
    );
  }

  static async clearPasswordResetToken(email: string): Promise<void> {
    await db.query(
      `UPDATE users
       SET password_reset_token = NULL,
           password_reset_expires = NULL
       WHERE email = $1`,
      [email.toLowerCase()]
    );
  }

  /** -------------------- LOGIN & LOCK -------------------- */

  static async updateLastLogin(userId: string): Promise<void> {
    await db.query(
      `UPDATE users
       SET last_login = NOW(),
           login_attempts = 0,
           lock_until = NULL
       WHERE id = $1`,
      [userId]
    );
  }

  static async incrementLoginAttempts(email: string): Promise<void> {
    const result = await db.query(
      `SELECT login_attempts, lock_until
       FROM users
       WHERE email = $1`,
      [email.toLowerCase()]
    );

    const user = result.rows[0];
    if (!user) return;

    let attempts = (user.login_attempts || 0) + 1;
    let lockUntil: string | null = user.lock_until;

    if (lockUntil && new Date(lockUntil) < new Date()) {
      attempts = 1;
      lockUntil = null;
    }

    if (attempts >= 5) {
      lockUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    }

    await db.query(
      `UPDATE users
       SET login_attempts = $1,
           lock_until = $2
       WHERE email = $3`,
      [attempts, lockUntil, email.toLowerCase()]
    );
  }

  static async isAccountLocked(email: string): Promise<boolean> {
    const result = await db.query(
      `SELECT lock_until FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );
    const user = result.rows[0];
    if (!user || !user.lock_until) return false;
    return new Date(user.lock_until) > new Date();
  }

  static async getLockTimeRemaining(email: string): Promise<number> {
    const result = await db.query(
      `SELECT lock_until FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );
    const user = result.rows[0];
    if (!user || !user.lock_until) return 0;
    const diff = new Date(user.lock_until).getTime() - Date.now();
    return diff > 0 ? Math.ceil(diff / 60000) : 0;
  }

  /** -------------------- PROFILE -------------------- */

  static async updateProfile(userId: string, profileData: {
    name?: string;
    department?: string;
    phone?: string;
    profile_image?: string;
  }): Promise<void> {
    const updates: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (profileData.name !== undefined) { updates.push(`name = $${idx++}`); params.push(profileData.name); }
    if (profileData.department !== undefined) { updates.push(`department = $${idx++}`); params.push(profileData.department); }
    if (profileData.phone !== undefined) { updates.push(`phone = $${idx++}`); params.push(profileData.phone); }
    if (profileData.profile_image !== undefined) { updates.push(`profile_image = $${idx++}`); params.push(profileData.profile_image); }

    if (updates.length === 0) return;

    updates.push(`updated_at = NOW()`);
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`;
    params.push(userId);

    await db.query(query, params);
  }

  /** -------------------- ACCOUNT STATUS -------------------- */

  static async deactivateAccount(userId: string): Promise<void> {
    await db.query(
      `UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1`,
      [userId]
    );
  }

  static async reactivateAccount(userId: string): Promise<void> {
    await db.query(
      `UPDATE users
       SET is_active = true,
           login_attempts = 0,
           lock_until = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [userId]
    );
  }

  /** -------------------- AUTH USER -------------------- */

  static async getAuthUser(email: string): Promise<any> {
    const result = await db.query(
      `SELECT id, email, name, role, agency_id, department, phone, profile_image
       FROM users
       WHERE email = $1 AND is_active = true`,
      [email.toLowerCase()]
    );
    return result.rows[0] || null;
  }

  static async getAuthUserById(id: string): Promise<any> {
    const result = await db.query(
      `SELECT id, email, name, role, agency_id, department, phone, profile_image
       FROM users
       WHERE id = $1 AND is_active = true`,
      [id]
    );
    return result.rows[0] || null;
  }

  /** -------------------- ADMIN USER LIST -------------------- */

  static async getAllUsers(): Promise<User[]> {
    const result = await db.query<DBUser>(
      `SELECT * FROM users ORDER BY created_at DESC`
    );
    return result.rows.map(this.mapDBUserToUser);
  }

  static async searchUsers(query: string): Promise<User[]> {
    const searchTerm = `%${query}%`;
    const result = await db.query<DBUser>(
      `SELECT * FROM users
       WHERE name ILIKE $1 OR email ILIKE $1 OR department ILIKE $1
       ORDER BY name`,
      [searchTerm]
    );
    return result.rows.map(this.mapDBUserToUser);
  }

  /** -------------------- UTILS -------------------- */

  private static mapDBUserToUser(dbUser: DBUser): User {
    return {
      ...dbUser,
      is_active: dbUser.is_active === true
    };
  }
}

export default UserService;