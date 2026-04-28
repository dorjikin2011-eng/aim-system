// backend/src/controllers/adminUserController.ts
import { Request, Response } from 'express';
import { getDB, getAsync, runAsync, allAsync } from '../models/db';
import { logAction } from '../services/auditService';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { sendPasswordResetEmail } from '../services/emailService';
import nodemailer from 'nodemailer';

// Frontend URL configuration
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://frontend-alpha-nine-65.vercel.app';

// Map frontend role names to database role names
const mapRoleToDB = (role: string): string => {
  const roleMap: Record<string, string> = {
    'system_admin': 'system_admin',
    'agency_head': 'agency_head',
    'focal_person': 'focal_person',
    'prevention_officer': 'prevention_officer',
    'commissioner': 'commissioner',
    'director': 'director'
  };
  return roleMap[role] || role;
};

const VALID_ROLES = [
  'commissioner',
  'director',
  'system_admin',
  'prevention_officer',
  'agency_head',
  'focal_person'
] as const;

type UserRole = typeof VALID_ROLES[number];

// Helper: Generate secure temporary password
const generateTempPassword = () => {
  return randomBytes(8).toString('hex');
};

// ============================================
// GET /api/admin/users
// ============================================
export const getUsers = async (req: Request, res: Response) => {
  try {
    const db = getDB();
    
    // FIXED: Changed generic type from any[] to any
    const users = await allAsync<any>(db, 
      `SELECT 
        u.id, u.email, u.name, u.role, u.is_active, u.phone, u.department,
        u.created_at, u.updated_at,
        a.name as agency_name
       FROM users u
       LEFT JOIN agencies a ON u.agency_id = a.id
       ORDER BY u.created_at DESC`,
      []
    );

    const mappedUsers = users.map(user => ({
      ...user,
      status: user.is_active ? 'active' : 'inactive'
    }));

    res.json({ users: mappedUsers });
  } catch (err) {
    console.error('User list error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// ============================================
// GET /api/admin/users/:id
// ============================================
export const getUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    const db = getDB();
    
    // FIXED: Changed ? to $1 for PostgreSQL
    const user = await getAsync<any>(db, 
      `SELECT 
        id, email, name, role, agency_id,
        phone, department as position, is_active, created_at, updated_at
       FROM users WHERE id = $1`,
      [id]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      success: true, 
      user: { 
        ...user, 
        status: user.is_active ? 'active' : 'inactive' 
      } 
    });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to load user' });
  }
};

// ============================================
// POST /api/admin/users
// ============================================
export const createUser = async (req: Request, res: Response) => {
  const { email, name, role, agencyId, phone, position, sendEmail: shouldSendEmail } = req.body;
  
  // Map role to database value
  const dbRole = mapRoleToDB(role);

  // Validation
  if (!email || !name || !role) {
    return res.status(400).json({ error: 'Email, name, and role are required' });
  }
  if (!VALID_ROLES.includes(role as UserRole)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  if (role !== 'system_admin' && !agencyId) {
    return res.status(400).json({ error: 'Agency is required for non-admin roles' });
  }

  try {
    const db = getDB();

    // Check duplicate email
    // FIXED: Changed ? to $1
    const existing = await getAsync<any>(db, 
      'SELECT id FROM users WHERE email = $1', 
      [email]
    );

    if (existing) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Generate temporary password for email notification
    const tempPassword = shouldSendEmail ? generateTempPassword() : 'password';
    const hash = await bcrypt.hash(tempPassword, 10);

    const id = `USR_${Date.now()}_${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    const now = new Date().toISOString();

    // Insert user
    // FIXED: Changed ? to $1, $2, etc. and is_active = true
    await runAsync(db, 
      `INSERT INTO users (
        id, email, name, password_hash, role, agency_id, 
        phone, department, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, $10)`,
      [
        id,
        email,
        name,
        hash,
        dbRole,
        agencyId || null,
        phone || null,
        position || null,
        now,
        now
      ]
    );

    // Send email if requested
    if (shouldSendEmail) {
      try {
        const welcomeHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1e40af; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">ACC AIMS</h1>
              <p style="color: #dbeafe; margin: 5px 0 0 0;">Anti-Corruption Commission</p>
            </div>
            
            <div style="padding: 24px;">
              <h2 style="color: #1e40af;">Welcome to AIMS</h2>
              <p>Hello ${name},</p>
              <p>Your account has been successfully created by the Anti-Corruption Commission.</p>
              
              <div style="background: #f3f4f6; border-left: 4px solid #1e40af; padding: 16px; margin: 20px 0;">
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Temporary Password:</strong> <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">${tempPassword}</code></p>
              </div>
              
              <p><strong>Important:</strong> You must change this password immediately after your first login.</p>
              
              <div style="text-align: center; margin: 24px 0;">
                <a href="${FRONTEND_URL}/login" 
                   style="display: inline-block; background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Login to AIMS
                </a>
              </div>
              
              <p style="font-size: 12px; color: #6b7280; margin-top: 24px;">
                This is an automated message. Please do not reply to this email.
                If you did not request this account, please contact the ACC IT Department.
              </p>
            </div>
          </div>
        `;
        
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
          }
        });
        
        await transporter.sendMail({
          from: process.env.SMTP_FROM_EMAIL || `"ACC AIMS" <${process.env.SMTP_USER}>`,
          to: email,
          subject: 'Your AIMS Account Has Been Created',
          html: welcomeHtml
        });
        
        console.log(`✅ Welcome email sent successfully to ${email}`);
      } catch (emailError) {
        console.error(`❌ Failed to send welcome email to ${email}:`, emailError);
        // Don't fail the user creation if email fails
      }
    }

    // Audit log
    await logAction(req, 'create_user', { type: 'user', id }, { 
      email, 
      name, 
      role, 
      agencyId,
      sendEmail: shouldSendEmail 
    });

    res.status(201).json({ 
      user: { 
        id, 
        email, 
        name, 
        role, 
        agencyId, 
        phone,
        department: position,
        created_at: now 
      } 
    });
  } catch (err) {
    console.error('User create error:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

// ============================================
// PUT /api/admin/users/:id
// ============================================
export const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, role, agencyId, phone, position } = req.body;

  if (!name || !role) {
    return res.status(400).json({ error: 'Name and role are required' });
  }
  if (role !== 'system_admin' && !agencyId) {
    return res.status(400).json({ error: 'Agency is required for non-admin roles' });
  }

  try {
    const db = getDB();

    // FIXED: Changed ? to $1
    const current = await getAsync<any>(db, 
      'SELECT email, name, role, agency_id, phone, department FROM users WHERE id = $1', 
      [id]
    );

    if (!current) {
      return res.status(404).json({ error: 'User not found' });
    }

    // FIXED: Build update query with proper PostgreSQL parameters
    const updates: string[] = [];
    const params: any[] = [];
    let paramCounter = 1;

    if (current.name !== name) {
      updates.push(`name = $${paramCounter}`);
      params.push(name);
      paramCounter++;
    }
    if (current.role !== role) {
      const dbRole = mapRoleToDB(role);
      updates.push(`role = $${paramCounter}`);
      params.push(dbRole);
      paramCounter++;
    }
    if (current.agency_id !== (agencyId || null)) {
      updates.push(`agency_id = $${paramCounter}`);
      params.push(agencyId || null);
      paramCounter++;
    }
    if (current.phone !== (phone || null)) {
      updates.push(`phone = $${paramCounter}`);
      params.push(phone || null);
      paramCounter++;
    }
    if (current.department !== (position || null)) {
      updates.push(`department = $${paramCounter}`);
      params.push(position || null);
      paramCounter++;
    }

    if (updates.length === 0) {
      return res.json({ user: { ...current, id } });
    }

    updates.push(`updated_at = $${paramCounter}`);
    params.push(new Date().toISOString());
    paramCounter++;
    
    params.push(id);
    
    const updateQuery = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCounter}`;
    
    await runAsync(db, updateQuery, params);

    await logAction(req, 'update_user', { type: 'user', id }, { 
      before: current, 
      after: { name, role, agencyId, phone, department: position } 
    });

    res.json({ 
      user: { 
        id, 
        email: current.email, 
        name, 
        role, 
        agencyId, 
        phone,
        department: position,
        updated_at: new Date().toISOString() 
      } 
    });
  } catch (err) {
    console.error('User update error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

// ============================================
// DELETE /api/admin/users/:id
// ============================================
export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const db = getDB();

    // Use type assertion for session user
    if ((req.session as any)?.user?.id === id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // FIXED: Changed ? to $1
    const user = await getAsync<any>(db, 
      'SELECT email, name, role FROM users WHERE id = $1', 
      [id]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // FIXED: Changed ? to $1
    await runAsync(db, 'DELETE FROM users WHERE id = $1', [id]);

    await logAction(req, 'delete_user', { type: 'user', id }, user);

    res.json({ success: true });
  } catch (err) {
    console.error('User delete error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

// ============================================
// POST /api/admin/users/:id/reset-password
// ============================================
export const resetPassword = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const db = getDB();

    // FIXED: Changed ? to $1
    const user = await getAsync<any>(db, 
      'SELECT email, name FROM users WHERE id = $1', 
      [id]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const tempPassword = generateTempPassword();
    const hash = await bcrypt.hash(tempPassword, 10);
    
    // FIXED: Changed ? to $1, $2, $3
    await runAsync(db, 
      'UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3',
      [hash, new Date().toISOString(), id]
    );

    await sendPasswordResetEmail(user.email, tempPassword);

    await logAction(req, 'reset_password', { type: 'user', id }, { 
      email: user.email
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};