// backend/src/controllers/focalNominationController.ts
import { Request, Response } from 'express';
import { getDB, getAsync, runAsync, allAsync } from '../models/db';
import { logAction } from '../services/auditService';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

// ============================================
// GET /api/hoa/nominations - Get nominations by HoA
// ============================================
export const getHoaNominations = async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const hoaId = (req as any).user?.id;
    
    if (!hoaId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const nominations = await allAsync<any[]>(db, 
      `SELECT 
        fn.id,
        fn.nominee_email,
        fn.nominee_name,
        fn.nominee_position,
        fn.status,
        fn.comments,
        fn.created_at,
        fn.updated_at,
        a.name as agency_name
       FROM focal_nominations fn
       JOIN agencies a ON fn.agency_id = a.id
       WHERE fn.nominated_by = ?
       ORDER BY fn.created_at DESC`,
      [hoaId]
    );

    res.json({ nominations });
  } catch (err) {
    console.error('Get HoA nominations error:', err);
    res.status(500).json({ error: 'Failed to fetch nominations' });
  }
};

// ============================================
// POST /api/hoa/nominate-focal - HoA nominates focal person
// ============================================
export const nominateFocal = async (req: Request, res: Response) => {
  const { nomineeEmail, nomineeName, nomineePosition } = req.body;
  const hoaId = (req as any).user?.id;
  
  if (!hoaId || !nomineeEmail || !nomineeName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const db = getDB();

    // Get agency ID for HoA
    const agencyRow = await getAsync<any>(
      db, 
      'SELECT agency_id FROM users WHERE id = ?', 
      [hoaId]
    );

    if (!agencyRow || !agencyRow.agency_id) {
      return res.status(400).json({ error: 'HoA not assigned to an agency' });
    }

    const agencyId = agencyRow.agency_id;

    // Check if nomination already exists
    const existing = await getAsync<any>(
      db, 
      'SELECT id FROM focal_nominations WHERE nominee_email = ? AND agency_id = ? AND status = "pending"',
      [nomineeEmail, agencyId]
    );

    if (existing) {
      return res.status(409).json({ error: 'Pending nomination already exists for this email' });
    }

    // Create nomination
    const id = `NOM_${Date.now()}_${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    const now = new Date().toISOString();

    await runAsync(db, 
      `INSERT INTO focal_nominations (
        id, agency_id, nominated_by, nominee_email, nominee_name, nominee_position, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [id, agencyId, hoaId, nomineeEmail, nomineeName, nomineePosition, now, now]
    );

    // Audit log
    await logAction(req, 'nominate_focal', { type: 'focal_nomination', id }, { 
      nomineeEmail, 
      nomineeName, 
      agencyId 
    });

    res.status(201).json({ 
      nomination: { 
        id, 
        nomineeEmail, 
        nomineeName, 
        nomineePosition, 
        status: 'pending',
        createdAt: now
      } 
    });
  } catch (err) {
    console.error('Nominate focal error:', err);
    res.status(500).json({ error: 'Failed to nominate focal person' });
  }
};

// ============================================
// GET /api/admin/focal-nominations - Get all pending nominations for ACC
// ============================================
export const getPendingNominations = async (req: Request, res: Response) => {
  try {
    const db = getDB();

    const nominations = await allAsync<any[]>(db, 
      `SELECT 
        fn.id,
        fn.nominee_email,
        fn.nominee_name,
        fn.nominee_position,
        fn.status,
        fn.comments,
        fn.created_at,
        fn.updated_at,
        a.name as agency_name,
        u.name as hoa_name,
        u.email as hoa_email
       FROM focal_nominations fn
       JOIN agencies a ON fn.agency_id = a.id
       JOIN users u ON fn.nominated_by = u.id
       WHERE fn.status = 'pending'
       ORDER BY fn.created_at ASC`,
      []
    );

    res.json({ nominations });
  } catch (err) {
    console.error('Get pending nominations error:', err);
    res.status(500).json({ error: 'Failed to fetch nominations' });
  }
};

// ============================================
// POST /api/admin/focal-nominations/:id/approve - ACC approves nomination
// ============================================
export const approveNomination = async (req: Request, res: Response) => {
  const { id } = req.params;
  const accUserId = (req as any).user?.id;
  const { sendEmail = true } = req.body;

  if (!accUserId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const db = getDB();

    // Get nomination details
    const nomination = await getAsync<any>(
      db, 
      `SELECT 
        fn.*,
        a.name as agency_name
       FROM focal_nominations fn
       JOIN agencies a ON fn.agency_id = a.id
       WHERE fn.id = ? AND fn.status = 'pending'`,
      [id]
    );

    if (!nomination) {
      return res.status(404).json({ error: 'Nomination not found or already processed' });
    }

    // Generate temporary password
    const tempPassword = sendEmail ? randomBytes(8).toString('hex') : 'password';
    const hash = await bcrypt.hash(tempPassword, 10);

    // Create user account
    const userId = `USR_${Date.now()}_${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    const now = new Date().toISOString();

    await runAsync(db, 
      `INSERT INTO users (
        id, email, name, password_hash, role, agency_id, department, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'focal_person', ?, ?, 1, ?, ?)`,
      [userId, nomination.nominee_email, nomination.nominee_name, hash, 
       nomination.agency_id, nomination.nominee_position, now, now]
    );

    // Update nomination status
    await runAsync(db, 
      `UPDATE focal_nominations 
       SET status = 'approved', approved_by = ?, comments = ?, updated_at = ?
       WHERE id = ?`,
      [accUserId, `Approved by ACC user ${accUserId}`, now, id]
    );

    // Send email if requested
    if (sendEmail) {
      console.log(`📧 Would send email to ${nomination.nominee_email} with temp password: ${tempPassword}`);
      // TODO: Implement actual email sending with nodemailer
    }

    // Audit log
    await logAction(req, 'approve_focal_nomination', { type: 'focal_nomination', id }, { 
      userId, 
      nomineeEmail: nomination.nominee_email,
      agencyId: nomination.agency_id
    });

    res.json({ success: true, message: 'Focal person approved and account created' });
  } catch (err) {
    console.error('Approve nomination error:', err);
    res.status(500).json({ error: 'Failed to approve nomination' });
  }
};

// ============================================
// POST /api/admin/focal-nominations/:id/reject - ACC rejects nomination
// ============================================
export const rejectNomination = async (req: Request, res: Response) => {
  const { id } = req.params;
  const accUserId = (req as any).user?.id;
  const { comments } = req.body;

  if (!accUserId || !comments) {
    return res.status(400).json({ error: 'Comments required for rejection' });
  }

  try {
    const db = getDB();
    const now = new Date().toISOString();

    // Update nomination status
    const result = await runAsync(db, 
      `UPDATE focal_nominations 
       SET status = 'rejected', approved_by = ?, comments = ?, updated_at = ?
       WHERE id = ? AND status = 'pending'`,
      [accUserId, comments, now, id]
    );

    // Check if any row was updated
    // Note: runAsync returns different structures for SQLite vs PostgreSQL
    // We'll check by trying to get the nomination to verify it was updated
    const updatedNomination = await getAsync<any>(
      db,
      'SELECT status FROM focal_nominations WHERE id = ?',
      [id]
    );

    if (!updatedNomination || updatedNomination.status !== 'rejected') {
      return res.status(404).json({ error: 'Nomination not found or already processed' });
    }

    // Audit log
    await logAction(req, 'reject_focal_nomination', { type: 'focal_nomination', id }, { 
      comments,
      accUserId
    });

    res.json({ success: true, message: 'Nomination rejected' });
  } catch (err) {
    console.error('Reject nomination error:', err);
    res.status(500).json({ error: 'Failed to reject nomination' });
  }
};