import { Request, Response } from 'express';
import { getDB } from '../models/db';

// GET /api/hoa/submissions
export const getHoaSubmissions = async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const userId = req.session?.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get agency ID for HoA user
    const userRow = await new Promise<{ agency_id: string } | null>((resolve, reject) => {
      db.get('SELECT agency_id FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row as { agency_id: string } | null);
      });
    });

    if (!userRow || !userRow.agency_id) {
      return res.status(400).json({ error: 'HoA not assigned to an agency' });
    }

    const agencyId = userRow.agency_id;
    const fiscalYear = '2024–25';

    // Get submissions needing HoA action
    const submissions = await new Promise<any[]>((resolve, reject) => {
      db.all(
        `SELECT 
          a.id as assessment_id,
          a.status,
          a.submitted_by_focal,
          a.remarks_hoa,
          u.name as focal_name,
          u.email as focal_email,
          a.created_at,
          a.updated_at
         FROM assessments a
         LEFT JOIN users u ON a.submitted_by_focal = u.id
         WHERE a.agency_id = ? 
           AND a.fiscal_year = ?
           AND a.status IN ('SUBMITTED_TO_HOA', 'AWAITING_VALIDATION')
         ORDER BY a.updated_at DESC`,
        [agencyId, fiscalYear],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // Get indicator responses for each submission
    const submissionsWithIndicators = await Promise.all(
      submissions.map(async (submission) => {
        const indicators = await new Promise<any[]>((resolve, reject) => {
          db.all(
            `SELECT * FROM indicator_responses 
             WHERE assessment_id = ? 
             ORDER BY indicator_number`,
            [submission.assessment_id],
            (err, rows) => {
              if (err) reject(err);
              else resolve(rows);
            }
          );
        });

        return {
          ...submission,
          indicators
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

// POST /api/hoa/approve
export const approveSubmission = async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const userId = req.session?.user?.id;
    const { assessmentId } = req.body;

    if (!userId || !assessmentId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify user is HoA for this assessment
    const assessment = await new Promise<any>((resolve, reject) => {
      db.get(
        `SELECT a.id, a.agency_id, a.status 
         FROM assessments a
         JOIN users u ON a.agency_id = u.agency_id
         WHERE a.id = ? AND u.id = ? AND u.role = 'agency_head'`,
        [assessmentId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!assessment) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Only allow approval from SUBMITTED_TO_HOA status
    if (assessment.status !== 'SUBMITTED_TO_HOA') {
      return res.status(400).json({ error: 'Invalid status for approval' });
    }

    // Update assessment status
    await new Promise<void>((resolve, reject) => {
      db.run(
        `UPDATE assessments 
         SET status = 'SUBMITTED_TO_ACC', reviewed_by_hoa = ?
         WHERE id = ?`,
        [userId, assessmentId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ success: true, message: 'Submission approved and sent to ACC' });
  } catch (err) {
    console.error('Approve submission error:', err);
    res.status(500).json({ error: 'Failed to approve submission' });
  }
};

// POST /api/hoa/return
export const returnSubmission = async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const userId = req.session?.user?.id;
    const { assessmentId, remarks } = req.body;

    if (!userId || !assessmentId || !remarks) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify user is HoA for this assessment
    const assessment = await new Promise<any>((resolve, reject) => {
      db.get(
        `SELECT a.id, a.agency_id, a.status 
         FROM assessments a
         JOIN users u ON a.agency_id = u.agency_id
         WHERE a.id = ? AND u.id = ? AND u.role = 'agency_head'`,
        [assessmentId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!assessment) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Only allow return from SUBMITTED_TO_HOA status
    if (assessment.status !== 'SUBMITTED_TO_HOA') {
      return res.status(400).json({ error: 'Invalid status for return' });
    }

    // Update assessment status
    await new Promise<void>((resolve, reject) => {
      db.run(
        `UPDATE assessments 
         SET status = 'RETURNED_BY_HOA', reviewed_by_hoa = ?, remarks_hoa = ?
         WHERE id = ?`,
        [userId, remarks, assessmentId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ success: true, message: 'Submission returned to focal person' });
  } catch (err) {
    console.error('Return submission error:', err);
    res.status(500).json({ error: 'Failed to return submission' });
  }
};

// POST /api/hoa/validate
export const validateFinalScore = async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const userId = req.session?.user?.id;
    const { assessmentId } = req.body;

    if (!userId || !assessmentId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify user is HoA for this assessment
    const assessment = await new Promise<any>((resolve, reject) => {
      db.get(
        `SELECT a.id, a.agency_id, a.status 
         FROM assessments a
         JOIN users u ON a.agency_id = u.agency_id
         WHERE a.id = ? AND u.id = ? AND u.role = 'agency_head'`,
        [assessmentId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!assessment) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Only allow validation from AWAITING_VALIDATION status
    if (assessment.status !== 'AWAITING_VALIDATION') {
      return res.status(400).json({ error: 'Invalid status for validation' });
    }

    // Update assessment status to FINALIZED
    await new Promise<void>((resolve, reject) => {
      db.run(
        `UPDATE assessments 
         SET status = 'FINALIZED', reviewed_by_hoa = ?
         WHERE id = ?`,
        [userId, assessmentId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ success: true, message: 'Final score validated and locked' });
  } catch (err) {
    console.error('Validate score error:', err);
    res.status(500).json({ error: 'Failed to validate final score' });
  }
};
