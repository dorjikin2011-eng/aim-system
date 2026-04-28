// backend/src/controllers/hoaController.ts
import { Request, Response } from 'express';
import { getDB, getAsync, runAsync, allAsync } from '../models/db';

// ============================================
// GET /api/hoa/submissions
// ============================================
export const getHoaSubmissions = async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get agency ID for HoA user
    // FIXED: Changed ? to $1
    const userRow = await getAsync<{ agency_id: string }>(
      db, 
      'SELECT agency_id FROM users WHERE id = $1', 
      [userId]
    );

    if (!userRow || !userRow.agency_id) {
      return res.status(400).json({ error: 'HoA not assigned to an agency' });
    }

    const agencyId = userRow.agency_id;
    const fiscalYear = '2024–25';

    // Get submissions needing HoA action
    // FIXED: Changed ? to $1, $2 and generic type
    const submissions = await allAsync<any>(
      db, 
      `SELECT 
        a.id as assessment_id,
        a.status,
        a.assigned_officer_id as submitted_by_focal,
        a.officer_remarks as remarks_hoa,
        u.name as focal_name,
        u.email as focal_email,
        a.created_at,
        a.updated_at
       FROM assessments a
       LEFT JOIN users u ON a.assigned_officer_id = u.id
       WHERE a.agency_id = $1 
         AND a.fiscal_year = $2
         AND a.status IN ('SUBMITTED_TO_AGENCY', 'AWAITING_VALIDATION')
       ORDER BY a.updated_at DESC`,
      [agencyId, fiscalYear]
    );

    // Get indicator responses for each submission from dynamic_assessment_responses
    // FIXED: Changed ? to $1 and generic type
    const submissionsWithIndicators = await Promise.all(
      submissions.map(async (submission) => {
        const indicators = await allAsync<any>(
          db, 
          `SELECT 
            indicator_id,
            response_data,
            final_score as score,
            evidence_files,
            comments
           FROM dynamic_assessment_responses 
           WHERE assessment_id = $1 
           ORDER BY indicator_id`,
          [submission.assessment_id]
        );

        return {
          ...submission,
          indicators: indicators.map((ind: any) => ({
            ...ind,
            response_data: ind.response_data ? 
              (typeof ind.response_data === 'string' ? JSON.parse(ind.response_data) : ind.response_data) : {}
          }))
        };
      })
    );

    res.json({
      submissions: submissionsWithIndicators
    });
  } catch (err) {
    console.error('HoA submissions error:', err);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
};

// ============================================
// POST /api/hoa/approve
// ============================================
export const approveSubmission = async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const userId = (req as any).user?.id;
    const { assessmentId } = req.body;

    if (!userId || !assessmentId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify user is HoA for this assessment
    // FIXED: Changed ? to $1, $2, $3
    const assessment = await getAsync<any>(
      db, 
      `SELECT a.id, a.agency_id, a.status 
       FROM assessments a
       JOIN users u ON a.agency_id = u.agency_id
       WHERE a.id = $1 AND u.id = $2 AND u.role = 'agency_head'`,
      [assessmentId, userId]
    );

    if (!assessment) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Only allow approval from SUBMITTED_TO_AGENCY status
    if (assessment.status !== 'SUBMITTED_TO_AGENCY') {
      return res.status(400).json({ error: 'Invalid status for approval' });
    }

    // Update assessment status to AWAITING_VALIDATION
    // FIXED: Changed ? to $1, $2
    await runAsync(db, 
      `UPDATE assessments 
       SET status = 'AWAITING_VALIDATION', officer_remarks = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [`Approved by HoA: ${userId}`, assessmentId]
    );

    res.json({ success: true, message: 'Submission approved and sent for validation' });
  } catch (err) {
    console.error('Approve submission error:', err);
    res.status(500).json({ error: 'Failed to approve submission' });
  }
};

// ============================================
// POST /api/hoa/return
// ============================================
export const returnSubmission = async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const userId = (req as any).user?.id;
    const { assessmentId, remarks } = req.body;

    if (!userId || !assessmentId || !remarks) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify user is HoA for this assessment
    // FIXED: Changed ? to $1, $2, $3
    const assessment = await getAsync<any>(
      db, 
      `SELECT a.id, a.agency_id, a.status 
       FROM assessments a
       JOIN users u ON a.agency_id = u.agency_id
       WHERE a.id = $1 AND u.id = $2 AND u.role = 'agency_head'`,
      [assessmentId, userId]
    );

    if (!assessment) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Only allow return from SUBMITTED_TO_AGENCY status
    if (assessment.status !== 'SUBMITTED_TO_AGENCY') {
      return res.status(400).json({ error: 'Invalid status for return' });
    }

    // Update assessment status to DRAFT with remarks
    // FIXED: Changed ? to $1, $2
    await runAsync(db, 
      `UPDATE assessments 
       SET status = 'DRAFT', officer_remarks = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [`Returned by HoA: ${remarks}`, assessmentId]
    );

    res.json({ success: true, message: 'Submission returned to focal person' });
  } catch (err) {
    console.error('Return submission error:', err);
    res.status(500).json({ error: 'Failed to return submission' });
  }
};

// ============================================
// POST /api/hoa/validate
// ============================================
export const validateFinalScore = async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const userId = (req as any).user?.id;
    const { assessmentId } = req.body;

    if (!userId || !assessmentId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify user is HoA for this assessment
    // FIXED: Changed ? to $1, $2, $3
    const assessment = await getAsync<any>(
      db, 
      `SELECT a.id, a.agency_id, a.status 
       FROM assessments a
       JOIN users u ON a.agency_id = u.agency_id
       WHERE a.id = $1 AND u.id = $2 AND u.role = 'agency_head'`,
      [assessmentId, userId]
    );

    if (!assessment) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Only allow validation from AWAITING_VALIDATION status
    if (assessment.status !== 'AWAITING_VALIDATION') {
      return res.status(400).json({ error: 'Invalid status for validation' });
    }

    // Update assessment status to FINALIZED
    // FIXED: Changed ? to $1, $2
    await runAsync(db, 
      `UPDATE assessments 
       SET status = 'FINALIZED', validated_by = $1, validated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [userId, assessmentId]
    );

    res.json({ success: true, message: 'Final score validated and locked' });
  } catch (err) {
    console.error('Validate score error:', err);
    res.status(500).json({ error: 'Failed to validate final score' });
  }
};

// ============================================
// GET /api/hoa/status
// ============================================
export const getHoaStatus = async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get agency ID for HoA user
    // FIXED: Changed ? to $1
    const userRow = await getAsync<{ agency_id: string }>(
      db, 
      'SELECT agency_id FROM users WHERE id = $1', 
      [userId]
    );

    if (!userRow || !userRow.agency_id) {
      return res.status(400).json({ error: 'HoA not assigned to an agency' });
    }

    const agencyId = userRow.agency_id;
    const fiscalYear = '2024–25';

    // Get current assessment status
    // FIXED: Changed ? to $1, $2
    const assessment = await getAsync<any>(
      db, 
      `SELECT id, status, overall_score, created_at, updated_at 
       FROM assessments 
       WHERE agency_id = $1 AND fiscal_year = $2`,
      [agencyId, fiscalYear]
    );

    if (!assessment) {
      return res.json({
        status: 'NOT_STARTED',
        assessmentId: null,
        overallScore: null
      });
    }

    res.json({
      status: assessment.status,
      assessmentId: assessment.id,
      overallScore: assessment.overall_score,
      createdAt: assessment.created_at,
      updatedAt: assessment.updated_at
    });
  } catch (err) {
    console.error('Get HoA status error:', err);
    res.status(500).json({ error: 'Failed to get status' });
  }
};