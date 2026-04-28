// backend/src/controllers/adminAgencyController.ts
import { Request, Response } from 'express';
import { getDB, getAsync, runAsync, allAsync } from '../models/db';
import { logAction } from '../services/auditService';
import nodemailer from 'nodemailer';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

// Frontend URL configuration
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://frontend-alpha-nine-65.vercel.app';
const LOGIN_URL = `${FRONTEND_URL}/login`;

// ============================================
// GET /api/admin/agencies/:id
// ============================================
export const getAgencyById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDB();

    const agency = await getAsync<any>(db, `
      SELECT 
        id, name, sector, agency_type, status,
        hoa_name, hoa_email, hoa_phone,
        focal_person_name, focal_person_email, focal_person_phone,
        contact_person, contact_email, contact_phone,
        address, created_at, updated_at
      FROM agencies
      WHERE id = $1
    `, [id]);

    if (!agency) {
      return res.status(404).json({ 
        success: false, 
        error: 'Agency not found' 
      });
    }

    res.json({ success: true, agency });
  } catch (err) {
    console.error('Error fetching agency:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch agency' 
    });
  }
};

// ============================================
// GET /api/admin/agencies/users/potential-hoas
// Get users who can be assigned as Head of Agency
// ============================================
export const getPotentialHOAs = async (req: Request, res: Response) => {
  try {
    const db = getDB();
    
    const users = await allAsync<any>(db, 
      `SELECT 
        u.id,
        u.email,
        u.name,
        u.role,
        u.phone,
        u.position,
        a.name as current_agency,
        u.created_at
      FROM users u
      LEFT JOIN agencies a ON u.agency_id = a.id
      WHERE u.role IN ('agency_head', 'focal_person', 'prevention_officer', 'commissioner', 'director')
        AND u.is_active = true
        AND u.id NOT IN (
          SELECT hoa_user_id FROM agencies WHERE hoa_user_id IS NOT NULL
        )
      ORDER BY u.name`,
      []
    );
    
    res.json({
      success: true,
      users: users.map((user: any) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone || '',
        position: user.position || '',
        currentAgency: user.current_agency || 'No Agency',
        role: user.role,
        createdAt: user.created_at
      }))
    });
  } catch (err) {
    console.error('Error fetching potential HoAs:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch potential HoAs' 
    });
  }
};

// ============================================
// GET /api/admin/agencies
// ============================================
export const getAgencies = async (req: Request, res: Response) => {
  try {
    const db = getDB();
    
    const agencies = await allAsync<any>(db, `
      SELECT 
        a.id, 
        a.name, 
        a.sector, 
        a.agency_type, 
        a.status, 
        a.address, 
        a.website,
        a.contact_email, 
        a.contact_phone, 
        a.contact_person,
        a.hoa_name, 
        a.hoa_email, 
        a.hoa_phone,
        a.focal_person_name, 
        a.focal_person_email, 
        a.focal_person_phone,
        a.created_at, 
        a.updated_at,
        COUNT(u.id) as user_count
      FROM agencies a
      LEFT JOIN users u ON u.agency_id = a.id
      GROUP BY a.id
      ORDER BY a.name
    `);

    res.json({ 
      success: true,
      agencies: agencies 
    });
  } catch (err) {
    console.error('Agency list error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch agencies' 
    });
  }
};

// ============================================
// POST /api/admin/agencies
// ============================================
export const createAgency = async (req: Request, res: Response) => {
  const { name, sector } = req.body;

  if (!name?.trim() || !sector?.trim()) {
    return res.status(400).json({ error: 'Name and sector are required' });
  }

  try {
    const db = getDB();
    
    const existing = await getAsync<any>(db, 
      'SELECT id FROM agencies WHERE LOWER(name) = LOWER($1)', 
      [name.trim()]
    );

    if (existing) {
      return res.status(409).json({ error: 'Agency with this name already exists' });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await runAsync(db,
      `INSERT INTO agencies (id, name, sector, created_at) VALUES ($1, $2, $3, $4)`,
      [id, name.trim(), sector.trim(), now]
    );

    // Audit log
    try {
      await logAction(req, 'create_agency', { type: 'agency', id }, { name, sector });
    } catch (auditError) {
      console.error('[AUDIT ERROR] Failed to log agency creation:', auditError);
    }

    res.status(201).json({ 
      agency: { id, name: name.trim(), sector: sector.trim(), created_at: now } 
    });
  } catch (err) {
    console.error('Agency create error:', err);
    res.status(500).json({ error: 'Failed to create agency' });
  }
};

// ============================================
// PUT /api/admin/agencies/:id
// ============================================
export const updateAgency = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { 
    name, 
    sector, 
    agency_type,
    status,
    address,
    website,
    contactEmail, 
    contactPhone, 
    contactPerson,
    hoa_name,
    hoa_email,
    hoa_phone,
    focal_person_name,
    focal_person_email,
    focal_person_phone,
    hoaUserId 
  } = req.body;

  if (!name?.trim() || !sector?.trim()) {
    return res.status(400).json({ error: 'Name and sector are required' });
  }

  try {
    const db = getDB();

    const current = await getAsync<any>(db, 
      'SELECT * FROM agencies WHERE id = $1', 
      [id]
    );

    if (!current) {
      return res.status(404).json({ error: 'Agency not found' });
    }

    const now = new Date().toISOString();

    await runAsync(db,
      `UPDATE agencies SET 
        name = $1, 
        sector = $2, 
        agency_type = $3,
        status = $4, 
        address = $5, 
        website = $6, 
        contact_email = $7, 
        contact_phone = $8, 
        contact_person = $9,
        hoa_name = $10,
        hoa_email = $11,
        hoa_phone = $12,
        focal_person_name = $13,
        focal_person_email = $14,
        focal_person_phone = $15,
        hoa_user_id = $16, 
        updated_at = $17
       WHERE id = $18`,
      [
        name.trim(),
        sector.trim(),
        agency_type || current.agency_type,
        status || current.status,
        address?.trim() || null,
        website?.trim() || null,
        contactEmail?.trim() || null,
        contactPhone?.trim() || null,
        contactPerson?.trim() || null,
        hoa_name?.trim() || null,
        hoa_email?.trim() || null,
        hoa_phone?.trim() || null,
        focal_person_name?.trim() || null,
        focal_person_email?.trim() || null,
        focal_person_phone?.trim() || null,
        hoaUserId || current.hoa_user_id,
        now,
        id
      ]
    );

    // Audit log
    try {
      await logAction(req, 'update_agency', { type: 'agency', id }, {
        name: name.trim(),
        sector: sector.trim(),
        status: status || current.status,
        updated_fields: Object.keys(req.body)
      });
    } catch (auditError) {
      console.error('[AUDIT ERROR] Failed to log agency update:', auditError);
    }

    res.json({ 
      success: true,
      message: 'Agency updated successfully',
      agency: { 
        id, 
        name: name.trim(), 
        sector: sector.trim(),
        status: status || current.status,
        updated_at: now 
      } 
    });

  } catch (err) {
    console.error('Agency update error:', err);
    res.status(500).json({ error: 'Failed to update agency' });
  }
};

// ============================================
// DELETE /api/admin/agencies/:id
// ============================================
export const deleteAgency = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const db = getDB();

    const usageResult = await getAsync<any>(db, 
      'SELECT COUNT(*) as user_count FROM users WHERE agency_id = $1',
      [id]
    );

    const userCount = parseInt(usageResult?.user_count || '0');
    
    if (userCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete: ${userCount} users depend on this agency` 
      });
    }

    // Get name for audit
    const agency = await getAsync<any>(db, 
      'SELECT name, sector FROM agencies WHERE id = $1', 
      [id]
    );

    if (!agency) {
      return res.status(404).json({ error: 'Agency not found' });
    }

    await runAsync(db, 'DELETE FROM agencies WHERE id = $1', [id]);

    // Audit log
    try {
      await logAction(req, 'delete_agency', { type: 'agency', id }, agency);
    } catch (auditError) {
      console.error('[AUDIT ERROR] Failed to log agency deletion:', auditError);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Agency delete error:', err);
    res.status(500).json({ error: 'Failed to delete agency' });
  }
};

// ============================================
// Email Service Configuration with Debugging
// ============================================
const createTransporter = () => {
  console.log('[EMAIL DEBUG] SMTP Configuration:', {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE,
    user: process.env.SMTP_USER ? '****' + process.env.SMTP_USER.slice(-4) : 'Not set',
    hasPassword: !!process.env.SMTP_PASSWORD,
    fromEmail: process.env.SMTP_FROM_EMAIL,
    frontendUrl: FRONTEND_URL,
    loginUrl: LOGIN_URL,
    nodeEnv: process.env.NODE_ENV
  });

  if (!process.env.SMTP_PASSWORD) {
    console.error('[EMAIL ERROR] SMTP_PASSWORD is not set in environment variables');
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });
};

// ============================================
// Email Template Functions
// ============================================
const getExistingUserEmailTemplate = (hoaName: string, agencyName: string, loginUrl: string) => {
  return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #0066cc; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .button { 
            display: inline-block; 
            background-color: #0066cc; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 4px; 
            margin: 20px 0; 
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Head of Agency Appointment</h1>
        </div>
        <div class="content">
            <h2>Dear ${hoaName},</h2>
            
            <p>You have been appointed as the <strong>Head of Agency</strong> for <strong>${agencyName}</strong>.</p>
            
            <p>As the Head of Agency, you now have access to the following capabilities:</p>
            <ul>
                <li>Nominate Focal Persons for your agency</li>
                <li>Monitor agency assessments</li>
                <li>Approve submissions from agency staff</li>
                <li>Access agency-wide reports and analytics</li>
            </ul>
            
            <p>You can access your account using your existing credentials:</p>
            
            <p style="text-align: center;">
                <a href="${loginUrl}" class="button">Login to Your Account</a>
            </p>
            
            <p><strong>Login URL:</strong> ${loginUrl}</p>
            
            <p>If you have any issues accessing your account, please contact the system administrator.</p>
            
            <p>Best regards,<br>
            The AIMS System Team</p>
        </div>
        <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>© ${new Date().getFullYear()} AIMS System. All rights reserved.</p>
        </div>
</body>
</html>
  `;
};

const getNewUserEmailTemplate = (hoaName: string, agencyName: string, email: string, tempPassword: string, loginUrl: string) => {
  return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #0066cc; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .credentials { 
            background-color: #fff3cd; 
            border: 1px solid #ffeaa7; 
            padding: 15px; 
            margin: 20px 0; 
            border-radius: 4px; 
        }
        .button { 
            display: inline-block; 
            background-color: #0066cc; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 4px; 
            margin: 20px 0; 
        }
        .warning { color: #856404; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to AIMS System</h1>
        </div>
        <div class="content">
            <h2>Dear ${hoaName},</h2>
            
            <p>An account has been created for you as the <strong>Head of Agency</strong> for <strong>${agencyName}</strong>.</p>
            
            <p>As the Head of Agency, you have been granted special privileges to manage your agency's assessment process.</p>
            
            <div class="credentials">
                <h3>Your Login Credentials:</h3>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Temporary Password:</strong> ${tempPassword}</p>
                <p class="warning">Please change your password immediately after first login.</p>
            </div>
            
            <p>You can access the system using the link below:</p>
            
            <p style="text-align: center;">
                <a href="${loginUrl}" class="button">Login to Your Account</a>
            </p>
            
            <p><strong>Login URL:</strong> ${loginUrl}</p>
            
            <h3>First Steps:</h3>
            <ol>
                <li>Login using the credentials above</li>
                <li>Change your password immediately</li>
                <li>Complete your profile information</li>
                <li>Nominate Focal Persons for your agency</li>
            </ol>
            
            <p>If you have any issues accessing your account, please contact the system administrator.</p>
            
            <p>Best regards,<br>
            The AIMS System Team</p>
        </div>
        <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>© ${new Date().getFullYear()} AIMS System. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
  `;
};

// ============================================
// Email Sending Function
// ============================================
const sendHoaNotification = async (
  hoa: any, 
  agencyName: string, 
  useExistingUser: boolean, 
  isNewUser: boolean, 
  tempPassword: string | null
): Promise<{
  success: boolean;
  messageId?: string;
  recipient: string;
  error?: string;
}> => {
  try {
    const transporter = createTransporter();
    const loginUrl = LOGIN_URL;
    
    let subject = '';
    let htmlContent = '';
    
    if (useExistingUser && !isNewUser) {
      subject = `Appointment: Head of Agency for ${agencyName}`;
      htmlContent = getExistingUserEmailTemplate(hoa.name, agencyName, loginUrl);
    } else {
      subject = `Welcome: Head of Agency Account for ${agencyName}`;
      htmlContent = getNewUserEmailTemplate(
        hoa.name, 
        agencyName, 
        hoa.email, 
        tempPassword || '', 
        loginUrl
      );
    }
    
    const mailOptions = {
      from: `"AIMS System" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to: hoa.email,
      subject: subject,
      html: htmlContent,
      text: `Dear ${hoa.name},\n\nYou have been appointed as Head of Agency for ${agencyName}. Please login at ${loginUrl} to access your account.\n\nBest regards,\nAIMS System Team`
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] Notification sent to ${hoa.email}: ${info.messageId}`);
    
    return {
      success: true,
      messageId: info.messageId,
      recipient: hoa.email
    };
    
  } catch (error) {
    console.error('[EMAIL] Failed to send notification:', error);
    return {
      success: false,
      recipient: hoa.email,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Helper function to hash password
const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

// Helper function to generate temporary password
function generateTemporaryPassword(): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  
  let password = upper.charAt(Math.floor(Math.random() * upper.length));
  password += lower.charAt(Math.floor(Math.random() * lower.length));
  password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  
  const allChars = upper + lower + numbers;
  for (let i = 0; i < 4; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }
  
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// ============================================
// POST /api/admin/agencies/create-with-hoa
// ============================================
export const createAgencyWithHOA = async (req: Request, res: Response) => {
  const db = getDB();
  const client = await db.connect();
  
  try {
    const { agency, hoa, useExistingUser, sendEmailNotification = true } = req.body;

    // Validation
    if (!agency || !hoa || typeof useExistingUser !== 'boolean') {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid request data' 
      });
    }

    if (!agency.name?.trim() || !agency.sector?.trim() || !agency.contactEmail?.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Agency name, sector, and contact email are required' 
      });
    }

    if (!hoa.name?.trim() || !hoa.email?.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Head of Agency name and email are required' 
      });
    }

    // Start transaction
    await client.query('BEGIN');

    try {
      // Step 1: Check if agency already exists
      const existingAgency = await client.query(
        'SELECT id FROM agencies WHERE LOWER(name) = LOWER($1) OR LOWER(contact_email) = LOWER($2)',
        [agency.name.trim(), agency.contactEmail.trim()]
      );
      
      if (existingAgency.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          success: false, 
          error: 'Agency with this name or contact email already exists' 
        });
      }

      // Step 2: Handle HoA user
      let hoaUserId: string;
      let isNewUser = false;
      let tempPassword: string | null = null;

      if (useExistingUser && hoa.existingUserId) {
        // Case 1: Assign existing user as HoA
        const existingUser = await client.query(
          `SELECT id, role, email, name FROM users 
           WHERE id = $1 AND is_active = true`,
          [hoa.existingUserId]
        );

        if (existingUser.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ 
            success: false, 
            error: 'Selected user not found or inactive' 
          });
        }

        // Check if user is already HoA elsewhere
        const isAlreadyHoA = await client.query(
          'SELECT id FROM agencies WHERE hoa_user_id = $1',
          [hoa.existingUserId]
        );

        if (isAlreadyHoA.rows.length > 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ 
            success: false, 
            error: 'This user is already Head of Agency for another agency' 
          });
        }

        hoaUserId = hoa.existingUserId;

        // Update user's role to agency_head
        await client.query(
          `UPDATE users SET 
            role = 'agency_head', 
            agency_id = NULL,
            updated_at = CURRENT_TIMESTAMP 
           WHERE id = $1`,
          [hoaUserId]
        );

      } else {
        // Case 2: Create new HoA user
        const existingEmail = await client.query(
          'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
          [hoa.email.trim()]
        );

        if (existingEmail.rows.length > 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ 
            success: false, 
            error: 'User with this email already exists' 
          });
        }

        // Generate temporary password
        tempPassword = generateTemporaryPassword();
        
        // Hash the password
        const hashedPassword = await hashPassword(tempPassword);
        
        // Create new user with UUID
        const userId = crypto.randomUUID();
        
        await client.query(
          `INSERT INTO users 
           (id, email, name, role, phone, position, password_hash, is_active, created_at)
           VALUES ($1, $2, $3, 'agency_head', $4, $5, $6, true, CURRENT_TIMESTAMP)`,
          [
            userId,
            hoa.email.trim(),
            hoa.name.trim(),
            hoa.phone?.trim() || null,
            hoa.position?.trim() || null,
            hashedPassword
          ]
        );

        hoaUserId = userId;
        isNewUser = true;
      }

      // Step 3: Create the agency with UUID
      const agencyId = crypto.randomUUID();
      
      await client.query(
        `INSERT INTO agencies 
         (id, name, sector, contact_email, contact_phone, address, website, 
          hoa_user_id, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', CURRENT_TIMESTAMP)`,
        [
          agencyId,
          agency.name.trim(),
          agency.sector.trim(),
          agency.contactEmail.trim(),
          agency.contactPhone?.trim() || null,
          agency.address?.trim() || null,
          agency.website?.trim() || null,
          hoaUserId
        ]
      );

      // Step 4: Update HoA user with agency_id
      await client.query(
        'UPDATE users SET agency_id = $1 WHERE id = $2',
        [agencyId, hoaUserId]
      );

      // Step 5: Create audit log
      try {
        await logAction(
          req, 
          'agency_created_with_hoa', 
          { type: 'agency', id: agencyId }, 
          {
            agency_name: agency.name,
            hoa_name: hoa.name,
            method: useExistingUser ? 'existing_user' : 'new_user',
            is_new_user: isNewUser,
            email_notification_sent: sendEmailNotification
          }
        );
        console.log('[AUDIT] Agency creation logged successfully');
      } catch (auditError) {
        console.error('[AUDIT ERROR] Failed to create audit log:', auditError);
      }

      // Step 6: Handle email notification
      let emailResult = null;
      
      if (sendEmailNotification) {
        try {
          emailResult = await sendHoaNotification(hoa, agency.name, useExistingUser, isNewUser, tempPassword);
          if (emailResult.success) {
            console.log(`[EMAIL] Notification successfully sent to: ${hoa.email}`);
          } else {
            console.warn(`[EMAIL WARNING] Email notification failed:`, emailResult.error);
          }
        } catch (emailError) {
          console.error(`[EMAIL] Failed to send notification:`, emailError);
          emailResult = {
            success: false,
            recipient: hoa.email,
            error: emailError instanceof Error ? emailError.message : 'Unknown email error'
          };
        }
      }

      // Commit transaction
      await client.query('COMMIT');

      // Step 7: Prepare response
      const responseData: any = {
        agencyId,
        agencyName: agency.name,
        hoaUserId,
        hoaName: hoa.name,
        isNewUser,
        emailNotification: sendEmailNotification ? (emailResult?.success ? 'sent' : 'failed') : 'skipped',
        nextSteps: [
          sendEmailNotification && emailResult?.success 
            ? 'HoA has received email notification' 
            : 'Manually notify HoA about their account',
          'HoA can now login to nominate focal persons',
          'Assign prevention officers to assess this agency'
        ]
      };

      if (sendEmailNotification && emailResult) {
        responseData.emailDetails = {
          recipient: emailResult.recipient,
          success: emailResult.success,
          timestamp: new Date().toISOString()
        };
        if (emailResult.messageId) {
          responseData.emailDetails.messageId = emailResult.messageId;
        }
        if (emailResult.error) {
          responseData.emailDetails.error = emailResult.error;
        }
      }

      if ((!sendEmailNotification || !emailResult?.success) && isNewUser && tempPassword) {
        responseData.tempPassword = tempPassword;
        responseData.note = 'Please manually provide these credentials to the HoA';
      }

      res.status(201).json({
        success: true,
        message: 'Agency and Head of Agency created successfully',
        data: responseData
      });

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }

  } catch (err) {
    console.error('Error in createAgencyWithHOA:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create agency with Head of Agency',
      details: process.env.NODE_ENV === 'development' ? (err instanceof Error ? err.message : 'Unknown error') : undefined
    });
  } finally {
    client.release();
  }
};