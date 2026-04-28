// backend/src/controllers/focalDashboardController.ts
import { Request, Response } from 'express';
import { getDB, getAsync, runAsync, allAsync } from '../models/db';
import crypto from 'crypto';

// Helper function to generate UUID
function generateUUID(): string {
  return crypto.randomUUID();
}

// ============================================
// GET /api/focal/indicators
// ============================================
export const getFocalIndicators = async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get agency ID for focal user
    // FIXED: Changed ? to $1
    const userRow = await getAsync<{ agency_id: string }>(
      db, 
      'SELECT agency_id FROM users WHERE id = $1', 
      [userId]
    );

    if (!userRow || !userRow.agency_id) {
      return res.status(400).json({ error: 'Focal person not assigned to an agency' });
    }

    const agencyId = userRow.agency_id;
    const fiscalYear = '2024–25';

    // Get current assessment
    // FIXED: Changed ? to $1, $2
    let assessment = await getAsync<{ id: string; status: string }>(
      db, 
      `SELECT id, status FROM assessments 
       WHERE agency_id = $1 AND fiscal_year = $2`,
      [agencyId, fiscalYear]
    );

    let assessmentId: string;
    
    if (!assessment) {
      // Create new assessment with UUID
      assessmentId = generateUUID();
      await runAsync(db, 
        `INSERT INTO assessments (
          id, agency_id, fiscal_year, status, assigned_officer_id
        ) VALUES ($1, $2, $3, 'DRAFT', $4)`,
        [assessmentId, agencyId, fiscalYear, userId]
      );
    } else {
      assessmentId = assessment.id;
      // Only allow editing if status is DRAFT or RETURNED_BY_HOA
      if (!['DRAFT', 'RETURNED_BY_HOA'].includes(assessment.status)) {
        return res.status(403).json({ 
          error: 'Cannot edit: Assessment is already submitted to HoA or ACC' 
        });
      }
    }

    // Get indicator responses from dynamic_assessment_responses table
    // FIXED: Changed ? to $1 and generic type
    const indicators = await allAsync<any>(
      db, 
      `SELECT 
        indicator_id,
        response_data,
        final_score as score,
        evidence_files,
        comments,
        created_at,
        updated_at
       FROM dynamic_assessment_responses 
       WHERE assessment_id = $1 
       ORDER BY indicator_id`,
      [assessmentId]
    );

    // Define indicator IDs for the 5 main indicators
    const indicatorIds = ['ind_iccs', 'ind_training', 'ind_ad', 'ind_cases', 'ind_atr'];
    
    // Initialize empty indicators if none exist
    const fullIndicators = [];
    
    for (const indicatorId of indicatorIds) {
      const existing = indicators.find((ind: any) => ind.indicator_id === indicatorId);
      
      if (existing) {
        // Parse response data
        let responseData = {};
        try {
          responseData = existing.response_data ? JSON.parse(existing.response_data) : {};
        } catch (e) {
          console.error('Error parsing response data:', e);
        }
        
        fullIndicators.push({
          id: existing.id,
          assessment_id: assessmentId,
          indicator_id: indicatorId,
          score: existing.score || 0,
          evidence_files: existing.evidence_files || '[]',
          response_data: responseData,
          created_at: existing.created_at,
          updated_at: existing.updated_at
        });
      } else {
        fullIndicators.push({
          id: null,
          assessment_id: assessmentId,
          indicator_id: indicatorId,
          score: 0,
          evidence_files: '[]',
          response_data: {},
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

// ============================================
// POST /api/focal/submit
// ============================================
export const submitToFocalHoA = async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const userId = (req as any).user?.id;
    const { assessmentId } = req.body;

    if (!userId || !assessmentId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify user owns this assessment
    // FIXED: Changed ? to $1, $2, $3
    const assessment = await getAsync<any>(
      db, 
      `SELECT a.id, a.agency_id 
       FROM assessments a
       JOIN users u ON a.agency_id = u.agency_id
       WHERE a.id = $1 AND u.id = $2 AND u.role = 'focal_person'`,
      [assessmentId, userId]
    );

    if (!assessment) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Update assessment status
    // FIXED: Changed ? to $1
    await runAsync(db, 
      `UPDATE assessments 
       SET status = 'SUBMITTED_TO_AGENCY', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [assessmentId]
    );

    res.json({ success: true, message: 'Submitted to Head of Agency' });
  } catch (err) {
    console.error('Submit to HoA error:', err);
    res.status(500).json({ error: 'Failed to submit to HoA' });
  }
};

// ============================================
// POST /api/focal/save-indicator
// ============================================
export const saveIndicator = async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const userId = (req as any).user?.id;
    const { assessmentId, indicatorId, responseData, evidence_files } = req.body;

    if (!userId || !assessmentId || !indicatorId) {
      return res.status(400).json({ error: 'Invalid request: missing required fields' });
    }

    // Verify user owns this assessment
    // FIXED: Changed ? to $1, $2, $3
    const assessment = await getAsync<any>(
      db, 
      `SELECT a.id, a.status, a.agency_id
       FROM assessments a
       JOIN users u ON a.agency_id = u.agency_id
       WHERE a.id = $1 AND u.id = $2 AND u.role = 'focal_person'`,
      [assessmentId, userId]
    );

    if (!assessment) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check if assessment can be edited
    if (!['DRAFT', 'RETURNED_BY_HOA'].includes(assessment.status)) {
      return res.status(403).json({ 
        error: 'Cannot edit: Assessment is already submitted' 
      });
    }

    // Check if dynamic assessment response exists
    // FIXED: Changed ? to $1, $2
    const existing = await getAsync<any>(
      db, 
      'SELECT id FROM dynamic_assessment_responses WHERE assessment_id = $1 AND indicator_id = $2',
      [assessmentId, indicatorId]
    );

    const now = new Date().toISOString();

    if (existing) {
      // Update existing
      // FIXED: Changed ? to $1, $2, $3, $4, $5
      await runAsync(db, 
        `UPDATE dynamic_assessment_responses 
         SET response_data = $1, evidence_files = $2, updated_at = $3
         WHERE assessment_id = $4 AND indicator_id = $5`,
        [JSON.stringify(responseData || {}), JSON.stringify(evidence_files || []), now, assessmentId, indicatorId]
      );
    } else {
      // Create new with UUID
      const id = generateUUID();
      await runAsync(db, 
        `INSERT INTO dynamic_assessment_responses (
          id, assessment_id, indicator_id, response_data, evidence_files, 
          final_score, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, 0, $6, $7)`,
        [id, assessmentId, indicatorId, JSON.stringify(responseData || {}), JSON.stringify(evidence_files || []), now, now]
      );
    }

    res.json({ success: true, message: 'Indicator saved successfully' });
  } catch (err) {
    console.error('Save indicator error:', err);
    res.status(500).json({ error: 'Failed to save indicator' });
  }
};

// ============================================
// GET /api/focal/status
// ============================================
export const getFocalStatus = async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get agency ID for focal user
    // FIXED: Changed ? to $1
    const userRow = await getAsync<{ agency_id: string }>(
      db, 
      'SELECT agency_id FROM users WHERE id = $1', 
      [userId]
    );

    if (!userRow || !userRow.agency_id) {
      return res.status(400).json({ error: 'Focal person not assigned to an agency' });
    }

    const agencyId = userRow.agency_id;
    const fiscalYear = '2024–25';

    // Get current assessment
    // FIXED: Changed ? to $1, $2
    const assessment = await getAsync<{ id: string; status: string; overall_score: number | null }>(
      db, 
      `SELECT id, status, overall_score FROM assessments 
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
      overallScore: assessment.overall_score
    });
  } catch (err) {
    console.error('Get focal status error:', err);
    res.status(500).json({ error: 'Failed to get status' });
  }
};