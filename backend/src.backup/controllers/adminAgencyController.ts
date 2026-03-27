//backend/src/controllers/adminAgencyController.ts
import { Request, Response } from 'express';
import { getDB } from '../models/db';
import { logAction } from '../services/auditService';
import nodemailer from 'nodemailer';

// ADD THIS NEW FUNCTION AT THE TOP OF THE FILE
export const getAgencyById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDB();

    const agency = await new Promise<any>((resolve, reject) => {
      db.get(`
        SELECT 
          id, name, sector, agency_type, status,
          hoa_name, hoa_email, hoa_phone,
          focal_person_name, focal_person_email, focal_person_phone,
          contact_person, contact_email, contact_phone,
          address, created_at, updated_at
        FROM agencies
        WHERE id = ?
      `, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

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
    
    const users = await new Promise<any[]>((resolve, reject) => {
      db.all(
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
          AND u.is_active = 1  -- FIXED: Changed from status = 'active' to is_active = 1
          AND u.id NOT IN (
            SELECT hoa_user_id FROM agencies WHERE hoa_user_id IS NOT NULL
          )
        ORDER BY u.name`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
    
    res.json({
      success: true,
      users: users.map(user => ({
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
// Email Service Configuration with Debugging
// ============================================
const createTransporter = () => {
  // Log SMTP configuration for debugging
  console.log('[EMAIL DEBUG] SMTP Configuration:', {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE,
    user: process.env.SMTP_USER ? '****' + process.env.SMTP_USER.slice(-4) : 'Not set',
    hasPassword: !!process.env.SMTP_PASSWORD,
    fromEmail: process.env.SMTP_FROM_EMAIL,
    frontendUrl: process.env.FRONTEND_URL,
    nodeEnv: process.env.NODE_ENV
  });

  if (!process.env.SMTP_PASSWORD) {
    console.error('[EMAIL ERROR] SMTP_PASSWORD is not set in environment variables');
    console.error('[EMAIL ERROR] For Google Workspace, you need an App Password');
    console.error('[EMAIL ERROR] Generate one at: https://myaccount.google.com/apppasswords');
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
// Email Sending Function with Consistent Response
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
    const loginUrl = process.env.FRONTEND_URL || 'https://your-system-url.com/login';
    
    let subject = '';
    let htmlContent = '';
    
    if (useExistingUser && !isNewUser) {
      // Existing user being promoted to HoA
      subject = `Appointment: Head of Agency for ${agencyName}`;
      htmlContent = getExistingUserEmailTemplate(hoa.name, agencyName, loginUrl);
    } else {
      // New user created as HoA
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

// ============================================
// POST /api/admin/agencies/create-with-hoa
// Create Agency with Head of Agency (Wizard)
// ============================================
export const createAgencyWithHOA = async (req: Request, res: Response) => {
  let transactionCompleted = false;
  
  try {
    // Default to TRUE for real-world testing
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

    const db = getDB();
    
    // Use transaction for atomic operations
    await new Promise<void>((resolve, reject) => {
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    try {
      // Step 1: Check if agency already exists
      const existingAgency = await new Promise<any>((resolve, reject) => {
        db.get(
          'SELECT id FROM agencies WHERE LOWER(name) = LOWER(?) OR LOWER(contact_email) = LOWER(?)',
          [agency.name.trim(), agency.contactEmail.trim()],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });
      
      if (existingAgency) {
        await new Promise<void>((resolve, reject) => {
          db.run('ROLLBACK', (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        transactionCompleted = true;
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
        const existingUser = await new Promise<any>((resolve, reject) => {
          db.get(
            `SELECT id, role, email, name FROM users 
             WHERE id = ? AND is_active = 1`,
            [hoa.existingUserId],
            (err, row) => {
              if (err) reject(err);
              else resolve(row);
            }
          );
        });

        if (!existingUser) {
          await new Promise<void>((resolve, reject) => {
            db.run('ROLLBACK', (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
          transactionCompleted = true;
          return res.status(400).json({ 
            success: false, 
            error: 'Selected user not found or inactive' 
          });
        }

        // Check if user is already HoA elsewhere
        const isAlreadyHoA = await new Promise<any>((resolve, reject) => {
          db.get(
            'SELECT id FROM agencies WHERE hoa_user_id = ?',
            [hoa.existingUserId],
            (err, row) => {
              if (err) reject(err);
              else resolve(row);
            }
          );
        });

        if (isAlreadyHoA) {
          await new Promise<void>((resolve, reject) => {
            db.run('ROLLBACK', (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
          transactionCompleted = true;
          return res.status(400).json({ 
            success: false, 
            error: 'This user is already Head of Agency for another agency' 
          });
        }

        hoaUserId = hoa.existingUserId;

        // Update user's role to agency_head and clear agency_id
        await new Promise<void>((resolve, reject) => {
          db.run(
            `UPDATE users SET 
              role = 'agency_head', 
              agency_id = NULL,
              updated_at = CURRENT_TIMESTAMP 
             WHERE id = ?`,
            [hoaUserId],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });

      } else {
        // Case 2: Create new HoA user
        // Check if email already exists
        const existingEmail = await new Promise<any>((resolve, reject) => {
          db.get(
            'SELECT id FROM users WHERE LOWER(email) = LOWER(?)',
            [hoa.email.trim()],
            (err, row) => {
              if (err) reject(err);
              else resolve(row);
            }
          );
        });

        if (existingEmail) {
          await new Promise<void>((resolve, reject) => {
            db.run('ROLLBACK', (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
          transactionCompleted = true;
          return res.status(400).json({ 
            success: false, 
            error: 'User with this email already exists' 
          });
        }

        // Generate temporary password
        tempPassword = generateTemporaryPassword();
        
        // Create new user (In production, hash the password)
        const userId = `USR_${Date.now()}_${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        
        // TEMPORARY: Store plain text for testing
        // In production: const passwordHash = await hashPassword(tempPassword);
        const passwordHash = tempPassword;
        
        await new Promise<void>((resolve, reject) => {
          db.run(
            `INSERT INTO users 
             (id, email, name, role, phone, position, password_hash, is_active, created_at)
             VALUES (?, ?, ?, 'agency_head', ?, ?, ?, 1, CURRENT_TIMESTAMP)`,
            [
              userId,
              hoa.email.trim(),
              hoa.name.trim(),
              hoa.phone?.trim() || null,
              hoa.position?.trim() || null,
              passwordHash
            ],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });

        hoaUserId = userId;
        isNewUser = true;
      }

      // Step 3: Create the agency
      const agencyId = `AGY_${Date.now()}_${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      
      await new Promise<void>((resolve, reject) => {
        db.run(
          `INSERT INTO agencies 
           (id, name, sector, contact_email, contact_phone, address, website, 
            hoa_user_id, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)`,
          [
            agencyId,
            agency.name.trim(),
            agency.sector.trim(),
            agency.contactEmail.trim(),
            agency.contactPhone?.trim() || null,
            agency.address?.trim() || null,
            agency.website?.trim() || null,
            hoaUserId
          ],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      // Step 4: Update HoA user with agency_id
      await new Promise<void>((resolve, reject) => {
        db.run(
          'UPDATE users SET agency_id = ? WHERE id = ?',
          [agencyId, hoaUserId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      // Step 5: Create audit log (with proper error handling)
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
        // Don't fail the whole operation if audit log fails
      }

      // Step 6: Handle email notification
      let emailResult: {
        success: boolean;
        messageId?: string;
        recipient: string;
        error?: string;
      } | null = null;
      
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
      await new Promise<void>((resolve, reject) => {
        db.run('COMMIT', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      transactionCompleted = true;

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

      // Include email details in response
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

      // Include temporary password in response if it wasn't emailed or email failed
      if ((!sendEmailNotification || !emailResult?.success) && isNewUser && tempPassword) {
        responseData.tempPassword = tempPassword;
        responseData.note = 'Please manually provide these credentials to the HoA';
      }

      const response = {
        success: true,
        message: 'Agency and Head of Agency created successfully',
        data: responseData
      };

      res.status(201).json(response);

    } catch (err) {
      // Rollback on any error
      if (!transactionCompleted) {
        await new Promise<void>((resolve, reject) => {
          db.run('ROLLBACK', (err) => {
            if (err) console.error('Rollback error:', err);
            resolve();
          });
        });
      }
      throw err;
    }

  } catch (err) {
    console.error('Error in createAgencyWithHOA:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create agency with Head of Agency',
      details: process.env.NODE_ENV === 'development' ? (err instanceof Error ? err.message : 'Unknown error') : undefined
    });
  }
};

// Helper function to generate temporary password
function generateTemporaryPassword(): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  
  // Ensure at least one of each type
  let password = upper.charAt(Math.floor(Math.random() * upper.length));
  password += lower.charAt(Math.floor(Math.random() * lower.length));
  password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  
  // Fill the rest with random characters
  const allChars = upper + lower + numbers;
  for (let i = 0; i < 4; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// GET /api/admin/agencies - SIMPLIFIED (no asset_declarations)
export const getAgencies = async (req: Request, res: Response) => {
  try {
    const db = getDB();
    
    // We explicitly select all columns to ensure new fields like hoa_name, 
    // focal_person_name, etc., are included in the response.
    const agencies = await new Promise<any[]>((resolve, reject) => {
      db.all(
        `SELECT 
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
          a.hoa_user_id,
          a.created_at, 
          a.updated_at,
          COUNT(u.id) as user_count
         FROM agencies a
         LEFT JOIN users u ON u.agency_id = a.id
         GROUP BY a.id
         ORDER BY a.name`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // Return the agencies array wrapped in an object as expected by the frontend
    res.json({ 
      success: true,
      agencies 
    });
  } catch (err) {
    console.error('Agency list error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch agencies' 
    });
  }
};

// POST /api/admin/agencies
export const createAgency = async (req: Request, res: Response) => {
  const { name, sector } = req.body;

  if (!name?.trim() || !sector?.trim()) {
    return res.status(400).json({ error: 'Name and sector are required' });
  }

  try {
    const db = getDB();
    
    // Check duplicate
    const existing = await new Promise<any>((resolve, reject) => {
      db.get('SELECT id FROM agencies WHERE LOWER(name) = LOWER(?)', [name.trim()], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existing) {
      return res.status(409).json({ error: 'Agency with this name already exists' });
    }

    const id = `AGY_${Date.now()}_${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    const now = new Date().toISOString();

    await new Promise<void>((resolve, reject) => {
      db.run(
        `INSERT INTO agencies (id, name, sector, created_at) VALUES (?, ?, ?, ?)`,
        [id, name.trim(), sector.trim(), now],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // 🔒 Audit log with error handling
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

// PUT /api/admin/agencies/:id
export const updateAgency = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { 
    name, 
    sector, 
    agency_type,
    status,
    address,
    website,
    // These come from the frontend payload mapping
    contactEmail, 
    contactPhone, 
    contactPerson,
    // HoA and Focal Person details
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

    // 1. Get current agency data to check for existence and changes
    const current = await new Promise<any>((resolve, reject) => {
      db.get('SELECT * FROM agencies WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!current) {
      return res.status(404).json({ error: 'Agency not found' });
    }

    const now = new Date().toISOString();

    // 2. Update the agencies table
    // We include all the fields that the frontend form provides
    await new Promise<void>((resolve, reject) => {
      db.run(
        `UPDATE agencies SET 
          name = ?, 
          sector = ?, 
          agency_type = ?,
          status = ?, 
          address = ?, 
          website = ?, 
          contact_email = ?, 
          contact_phone = ?, 
          contact_person = ?,
          hoa_name = ?,
          hoa_email = ?,
          hoa_phone = ?,
          focal_person_name = ?,
          focal_person_email = ?,
          focal_person_phone = ?,
          hoa_user_id = ?, 
          updated_at = ?
         WHERE id = ?`,
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
        ],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // 3. Audit log
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

    // 4. Return the updated agency
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

// DELETE /api/admin/agencies/:id - SIMPLIFIED (no asset_declarations check)
export const deleteAgency = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const db = getDB();

    // Check if used - only check for users now
    const usage = await new Promise<any>((resolve, reject) => {
      db.get(
        `SELECT COUNT(*) as users FROM users WHERE agency_id = ?`,
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (usage.users > 0) {
      return res.status(400).json({ 
        error: `Cannot delete: ${usage.users} users depend on this agency` 
      });
    }

    // Get name for audit
    const agency = await new Promise<any>((resolve, reject) => {
      db.get('SELECT name, sector FROM agencies WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!agency) {
      return res.status(404).json({ error: 'Agency not found' });
    }

    await new Promise<void>((resolve, reject) => {
      db.run('DELETE FROM agencies WHERE id = ?', [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // 🔒 Audit log with error handling
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