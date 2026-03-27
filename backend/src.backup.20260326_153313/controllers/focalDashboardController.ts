// backend/src/controllers/focalDashboardController.ts
import { Request, Response } from 'express';
import { getDB } from '../models/db';

// GET /api/focal/indicators
export const getFocalIndicators = async (req: Request, res: Response) => {
  try {
    const db = getDB();
  try {
    const userId = req.session?.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get agency ID for focal user
    const userRow = await new Promise<{ agency_id: string } | null>((resolve, reject) => {
      await getAsync(db, 'SELECT agency_id FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row as { agency_id: string } | null);
      });
    });

    if (!userRow || !userRow.agency_id) {
      return res.status(400).json({ error: 'Focal person not assigned to an agency' });
    }

    const agencyId = userRow.agency_id;
    const fiscalYear = '2024–25';

    // Get current assessment
    const assessment = await new Promise<{ id: string; status: string } | null>((resolve, reject) => {
      await getAsync(db, 
        `SELECT id, status FROM assessments 
         WHERE agency_id = ? AND fiscal_year = ?`,
        [agencyId, fiscalYear],
        (err, row) => {
          if (err) reject(err);
          else resolve(row as { id: string; status: string } | null);
        }
      );
    });

    let assessmentId: string; // ✅ Explicit type annotation
    if (!assessment) {
      // Create new assessment
      assessmentId = `ASM_${Date.now()}_${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      await new Promise<void>((resolve, reject) => {
        await runAsync(db, 
          `INSERT INTO assessments (
            id, agency_id, fiscal_year, status, submitted_by_focal
          ) VALUES (?, ?, ?, 'DRAFT', ?)`,
          [assessmentId, agencyId, fiscalYear, userId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    } else {
      assessmentId = assessment.id;
      // Only allow editing if status is DRAFT or RETURNED_BY_HOA
      if (!['DRAFT', 'RETURNED_BY_HOA'].includes(assessment.status)) {
        return res.status(403).json({ 
          error: 'Cannot edit: Assessment is already submitted to HoA or ACC' 
        });
      }
    }

    // Get indicator responses
    const indicators = await new Promise<any[]>((resolve, reject) => {
      await allAsync(db, 
        `SELECT * FROM indicator_responses 
         WHERE assessment_id = ? 
         ORDER BY indicator_number`,
        [assessmentId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // Initialize empty indicators if none exist
    const indicatorMap = new Map<number, any>();
    indicators.forEach(ind => {
      indicatorMap.set(ind.indicator_number, ind);
    });

    const fullIndicators = [];
    for (let i = 1; i <= 5; i++) {
      if (indicatorMap.has(i)) {
        fullIndicators.push(indicatorMap.get(i));
      } else {
        fullIndicators.push({
          id: null,
          assessment_id: assessmentId,
          indicator_number: i,
          score: 0,
          evidence_file_paths: '[]',
          systems: null,
          proactive_measures: null,
          completed_training: null,
          total_employees: null,
          submitted_declarations: null,
          covered_officials: null,
          convictions: null,
          prosecutions: null,
          admin_actions: null,
          weighted_score: null,
          timely_atrs: null,
          total_atrs: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    }

    res.json({
      agencyId,
      assessmentId,
      fiscalYear,
      indicators: fullIndicators
    });
  } catch (err) {
    console.error('Focal indicators error:', err);
    res.status(500).json({ error: 'Failed to fetch indicators' });
  }
};

// POST /api/focal/submit
export const submitToFocalHoA = async (req: Request, res: Response) => {
  try {
    const db = getDB();
  try {
    const userId = req.session?.user?.id;
    const { assessmentId } = req.body;

    if (!userId || !assessmentId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify user owns this assessment
    const assessment = await new Promise<{ id: string } | null>((resolve, reject) => {
      await getAsync(db, 
        `SELECT a.id, a.agency_id, u.id as focal_id 
         FROM assessments a
         JOIN users u ON a.agency_id = u.agency_id
         WHERE a.id = ? AND u.id = ? AND u.role = 'focal_person'`,
        [assessmentId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row as { id: string } | null);
        }
      );
    });

    if (!assessment) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Update assessment status
    await new Promise<void>((resolve, reject) => {
      await runAsync(db, 
        `UPDATE assessments 
         SET status = 'SUBMITTED_TO_HOA', submitted_by_focal = ?
         WHERE id = ?`,
        [userId, assessmentId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ success: true, message: 'Submitted to Head of Agency' });
  } catch (err) {
    console.error('Submit to HoA error:', err);
    res.status(500).json({ error: 'Failed to submit to HoA' });
  }
};

// POST /api/focal/save-indicator
export const saveIndicator = async (req: Request, res: Response) => {
  try {
    const db = getDB();
  try {
    const userId = req.session?.user?.id;
    const { assessmentId, indicatorNumber, systems, proactive_measures, evidence_file_paths } = req.body;

    if (!userId || !assessmentId || indicatorNumber !== 1) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    // Verify user owns this assessment
    const assessment = await new Promise<any>((resolve, reject) => {
      await getAsync(db, 
        `SELECT id FROM assessments 
         WHERE id = ? AND submitted_by_focal = ?`,
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

    // Check if indicator response exists
    const existing = await new Promise<any>((resolve, reject) => {
      await getAsync(db, 
        'SELECT id FROM indicator_responses WHERE assessment_id = ? AND indicator_number = ?',
        [assessmentId, indicatorNumber],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    const now = new Date().toISOString();

    if (existing) {
      // Update existing
      await new Promise<void>((resolve, reject) => {
        await runAsync(db, 
          `UPDATE indicator_responses 
           SET systems = ?, proactive_measures = ?, evidence_file_paths = ?, updated_at = ?
           WHERE id = ?`,
          [systems, proactive_measures, evidence_file_paths, now, existing.id],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    } else {
      // Create new
      const id = `IND_${Date.now()}_${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      await new Promise<void>((resolve, reject) => {
        await runAsync(db, 
          `INSERT INTO indicator_responses (
            id, assessment_id, indicator_number, score, evidence_file_paths, 
            systems, proactive_measures, created_at, updated_at
          ) VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?)`,
          [id, assessmentId, indicatorNumber, evidence_file_paths, systems, proactive_measures, now, now],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    res.json({ success: true, message: 'Indicator 1 saved successfully' });
  } catch (err) {
    console.error('Save indicator error:', err);
    res.status(500).json({ error: 'Failed to save indicator' });
  }
};