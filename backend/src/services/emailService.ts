// backend/src/services/emailService.ts
import nodemailer from 'nodemailer';

// Create transporter using SMTP configuration from environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || process.env.EMAIL_HOST,
  port: Number(process.env.SMTP_PORT || process.env.EMAIL_PORT) || 587,
  secure: (process.env.SMTP_SECURE || process.env.EMAIL_SECURE) === 'true', // convert string to boolean
  auth: {
    user: process.env.SMTP_USER || process.env.EMAIL_USER,
    pass: process.env.SMTP_PASS || process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false // safe fallback for self-signed certs; set true in production
  },
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000,
  socketTimeout: 10000
});

// Verify SMTP connection on startup
transporter.verify((error) => {
  if (error) {
    console.error('❌ Email transporter verification failed:', error);
  } else {
    console.log('✅ Email transporter is ready to send messages');
    console.log(`📧 Using SMTP: ${process.env.SMTP_HOST || process.env.EMAIL_HOST}:${process.env.SMTP_PORT || process.env.EMAIL_PORT}`);
    console.log(`📨 Sender: ${process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.EMAIL_USER}`);
  }
});

// Interface for email options
interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  cc?: string;
  bcc?: string;
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
    contentType?: string;
  }>;
}

/**
 * Generic email sending function
 */
export async function sendEmail({ 
  to, 
  subject, 
  html, 
  cc, 
  bcc, 
  attachments 
}: EmailOptions): Promise<nodemailer.SentMessageInfo> {
  const mailOptions = {
    from: `"ACC AIMS System" <${process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
    cc,
    bcc,
    attachments,
    headers: {
      'X-Priority': '1',
      'X-MSMail-Priority': 'High',
      'Importance': 'high'
    }
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${to}`);
    console.log(`📫 Message ID: ${info.messageId}`);
    return info;
  } catch (error: any) {
    console.error('❌ Error sending email:', error);
    if (error.response) console.error('📧 SMTP Response:', error.response);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

/**
 * Send password reset email with temporary password
 */
export async function sendPasswordResetEmail(email: string, tempPassword: string): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ACC AIMS - Password Reset Instructions</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9fafb; }
            .container { max-width: 600px; margin: 0 auto; padding: 0; background-color: white; }
            .header { background: linear-gradient(135deg, #1e3a8a, #2563eb); color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; font-weight: bold; }
            .header p { margin: 5px 0 0; opacity: 0.9; font-size: 14px; }
            .content { padding: 30px; }
            .password-box { background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px dashed #d1d5db; }
            .password { font-family: 'Courier New', monospace; font-size: 20px; font-weight: bold; text-align: center; letter-spacing: 1px; color: #1f2937; }
            .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 15px 0; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center; }
            .logo { font-size: 20px; font-weight: bold; margin-bottom: 10px; }
            @media (max-width: 600px) {
                .content { padding: 20px; }
                .header { padding: 20px; }
                .password { font-size: 18px; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">ACC - AIMS</div>
                <h1>Agency Integrity Maturity System</h1>
                <p>Password Reset Instructions</p>
            </div>
            
            <div class="content">
                <p>Hello,</p>
                
                <p>Your AIMS account password has been reset by a system administrator.</p>
                
                <div class="password-box">
                    <p style="margin: 0 0 10px; font-size: 14px; color: #4b5563;">Please use this temporary password to log in:</p>
                    <div class="password">${tempPassword}</div>
                </div>
                
                <div class="warning">
                    <p style="margin: 0; font-weight: 600; color: #92400e;">Important Security Notice:</p>
                    <p style="margin: 10px 0 0; color: #92400e;">
                        • This is a temporary password<br>
                        • You must change your password immediately after logging in<br>
                        • Do not share this password with anyone
                    </p>
                </div>
                
                <p>If you did not request this password reset, please contact your system administrator immediately.</p>
                
                <p style="margin-top: 30px;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" class="button">
                        Login to AIMS
                    </a>
                </p>
            </div>
            
            <div class="footer">
                <p>This is an automated message from the Anti-Corruption Commission AIMS system.</p>
                <p>Please do not reply to this email. For assistance, contact your system administrator.</p>
                <p>© ${new Date().getFullYear()} Anti-Corruption Commission. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: 'ACC AIMS - Password Reset Instructions',
    html
  });
}

/**
 * Send password reset link email
 */
export async function sendResetLinkEmail(email: string, resetLink: string): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ACC AIMS - Password Reset Request</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9fafb; }
            .container { max-width: 600px; margin: 0 auto; padding: 0; background-color: white; }
            .header { background: linear-gradient(135deg, #1e3a8a, #2563eb); color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; font-weight: bold; }
            .header p { margin: 5px 0 0; opacity: 0.9; font-size: 14px; }
            .content { padding: 30px; }
            .button-container { text-align: center; margin: 30px 0; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2); }
            .button:hover { background: #1d4ed8; box-shadow: 0 6px 8px rgba(37, 99, 235, 0.3); }
            .link-box { background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #e5e7eb; word-break: break-all; }
            .warning { background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .info { background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center; }
            .logo { font-size: 20px; font-weight: bold; margin-bottom: 10px; }
            .instructions { background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #fbbf24; }
            @media (max-width: 600px) {
                .content { padding: 20px; }
                .header { padding: 20px; }
                .button { padding: 12px 24px; font-size: 14px; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">ACC - AIMS</div>
                <h1>Agency Integrity Maturity System</h1>
                <p>Password Reset Request</p>
            </div>
            
            <div class="content">
                <p>Hello,</p>
                
                <p>You have requested to reset your password for the ACC AIMS system.</p>
                
                <div class="info">
                    <p style="margin: 0; font-weight: 600; color: #1e40af;">Click the button below to reset your password:</p>
                    <p style="margin: 10px 0 0; color: #1e40af;">This link will expire in <strong>1 hour</strong>.</p>
                </div>
                
                <div class="button-container">
                    <a href="${resetLink}" class="button" style="color: white; text-decoration: none;">
                        Reset Password
                    </a>
                </div>
                
                <div class="instructions">
                    <p style="margin: 0; font-weight: 600; color: #92400e;">If the button doesn't work:</p>
                    <p style="margin: 10px 0 0; color: #92400e;">Copy and paste the following link into your browser:</p>
                </div>
                
                <div class="link-box">
                    <p style="margin: 0; font-family: 'Courier New', monospace; font-size: 12px; color: #4b5563;">
                        ${resetLink}
                    </p>
                </div>
                
                <div class="warning">
                    <p style="margin: 0; font-weight: 600; color: #7f1d1d;">Security Notice:</p>
                    <p style="margin: 10px 0 0; color: #7f1d1d;">
                        • This link is valid for 1 hour only<br>
                        • Do not share this link with anyone<br>
                        • If you didn't request this password reset, please ignore this email and contact your system administrator immediately
                    </p>
                </div>
                
                <p>After resetting your password, you can login to the AIMS system with your new credentials.</p>
                
                <p>Need help? Contact your system administrator or the ACC IT support team.</p>
            </div>
            
            <div class="footer">
                <p>This is an automated message from the ACC AIMS System.</p>
                <p>Anti-Corruption Commission | Government Agency</p>
                <p>© ${new Date().getFullYear()} Anti-Corruption Commission. All rights reserved.</p>
                <p style="font-size: 10px; margin-top: 10px; color: #9ca3af;">
                    This email was sent to ${email}. If you believe you received this in error, please disregard.
                </p>
            </div>
        </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: 'ACC AIMS - Password Reset Request',
    html
  });
}

/**
 * Send welcome email to new users
 */
export async function sendWelcomeEmail(email: string, name: string, temporaryPassword: string): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ACC AIMS</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9fafb; }
            .container { max-width: 600px; margin: 0 auto; padding: 0; background-color: white; }
            .header { background: linear-gradient(135deg, #059669, #10b981); color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; font-weight: bold; }
            .content { padding: 30px; }
            .credentials { background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px dashed #d1d5db; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to ACC AIMS</h1>
                <p>Your account has been created</p>
            </div>
            
            <div class="content">
                <p>Hello ${name},</p>
                
                <p>Welcome to the Anti-Corruption Commission's Agency Integrity Maturity System (AIMS).</p>
                
                <div class="credentials">
                    <p><strong>Your login credentials:</strong></p>
                    <p>Email: ${email}</p>
                    <p>Temporary Password: ${temporaryPassword}</p>
                </div>
                
                <p>Please login and change your password immediately.</p>
                
                <p><a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" style="color: #2563eb;">Login to AIMS</a></p>
            </div>
            
            <div class="footer">
                <p>ACC AIMS System</p>
            </div>
        </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: 'Welcome to ACC AIMS',
    html
  });
}

/**
 * Send account lockout notification
 */
export async function sendAccountLockedEmail(email: string): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ACC AIMS Account Security Alert</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9fafb; }
            .container { max-width: 600px; margin: 0 auto; padding: 0; background-color: white; }
            .header { background: linear-gradient(135deg, #dc2626, #ef4444); color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; font-weight: bold; }
            .content { padding: 30px; }
            .warning { background-color: #fee2e2; border: 2px solid #dc2626; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Security Alert</h1>
                <p>Account Locked</p>
            </div>
            
            <div class="content">
                <p>Hello,</p>
                
                <div class="warning">
                    <p><strong>Your ACC AIMS account has been locked due to multiple failed login attempts.</strong></p>
                </div>
                
                <p>For security reasons, your account has been temporarily locked. This is a protective measure against unauthorized access attempts.</p>
                
                <p><strong>What to do next:</strong></p>
                <ol>
                    <li>Wait 30 minutes for the lock to automatically expire, OR</li>
                    <li>Contact your system administrator to unlock your account</li>
                    <li>If you've forgotten your password, use the "Forgot Password" feature</li>
                </ol>
                
                <p>If this was you attempting to login, please ensure you're using the correct credentials.</p>
                
                <p>If this was not you, please contact your system administrator immediately.</p>
            </div>
            
            <div class="footer">
                <p>ACC AIMS Security System</p>
            </div>
        </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: 'ACC AIMS - Account Security Alert',
    html
  });
}

/**
 * Test email function for debugging
 */
export async function sendTestEmail(to: string): Promise<nodemailer.SentMessageInfo> {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ACC AIMS Test Email</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .success { color: #059669; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>ACC AIMS Email Test</h1>
            <p>This is a test email from the ACC AIMS system.</p>
            <p class="success">✅ Email system is working correctly!</p>
            <p>Timestamp: ${new Date().toLocaleString()}</p>
            <p>SMTP Server: ${process.env.EMAIL_HOST}:${process.env.EMAIL_PORT}</p>
            <p>Sender: ${process.env.EMAIL_FROM || process.env.EMAIL_USER}</p>
        </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to,
    subject: 'ACC AIMS - Test Email',
    html
  });
}

// Export transporter for direct use if needed
export { transporter };

// Default export for convenience
export default {
  sendEmail,
  sendPasswordResetEmail,
  sendResetLinkEmail,
  sendWelcomeEmail,
  sendAccountLockedEmail,
  sendTestEmail,
  transporter
};