// backend/src/controllers/agencyDataController.ts
import { Request, Response } from 'express';
import { getDB, getAsync, runAsync, allAsync } from '../models/db';
import crypto from 'crypto';

// ============================================
// GET /api/agency/data
// ============================================
export const getAgencyData = async (req: Request, res: Response) => {
  try {
    const db = getDB();
    
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get the user's full details from database including agency_id
    const fullUser = await getAsync<any>(
      db,
      'SELECT id, email, name, role, agency_id FROM users WHERE id = ?',
      [user.id]
    );

    if (!fullUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!fullUser.agency_id) {
      return res.status(403).json({ error: 'User does not belong to an agency' });
    }

    const agencyId = fullUser.agency_id;
    const fiscalYear = '2025-26';

    // Get all indicator data for this agency
    const rows = await allAsync<any>(
      db,
      `SELECT * FROM indicator_data 
       WHERE agency_id = ? AND fiscal_year = ?
       ORDER BY indicator_id`,
      [agencyId, fiscalYear]
    );

    // Transform into a consolidated object
    const result: any = {
      agency_id: agencyId,
      fiscal_year: fiscalYear,
      status: 'draft',
      submitted_by: null,
      feedback: null
    };

    // If no data exists, return empty template
    if (rows.length === 0) {
      return res.json({
        ...result,
        complaint_level: null,
        coi_level: null,
        gift_level: null,
        proactive_level: null,
        total_employees: null,
        completed_employees: null,
        total_covered_officials: null,
        officials_submitted_on_time: null,
        conviction_cases: null,
        prosecution_cases: null,
        admin_action_cases: null,
        total_atrs: null,
        atrs_submitted_on_time: null,
        iccs_score: null,
        training_score: null,
        ad_score: null,
        cases_score: null,
        atr_score: null,
        total_score: null
      });
    }

    // Parse each indicator's data
    for (const row of rows) {
      const metadata = JSON.parse(row.metadata || '{}');
      
      switch (row.indicator_id) {
        case 'ind_iccs':
          result.complaint_level = metadata.complaint_level;
          result.coi_level = metadata.coi_level;
          result.gift_level = metadata.gift_level;
          result.proactive_level = metadata.proactive_level;
          result.iccs_score = row.score;
          break;
          
        case 'ind_training':
          result.total_employees = metadata.total_employees;
          result.completed_employees = metadata.completed_employees;
          result.elearning_completion_rate = row.value;
          result.training_score = row.score;
          break;
          
        case 'ind_ad':
          result.total_covered_officials = metadata.total_covered_officials;
          result.officials_submitted_on_time = metadata.officials_submitted_on_time;
          result.ad_compliance_rate = row.value;
          result.ad_score = row.score;
          break;
          
        case 'ind_cases':
          result.conviction_cases = metadata.conviction_cases;
          result.prosecution_cases = metadata.prosecution_cases;
          result.admin_action_cases = metadata.admin_action_cases;
          result.case_severity_points = row.value;
          result.cases_score = row.score;
          break;
          
        case 'ind_atr':
          result.total_atrs = metadata.total_atrs;
          result.atrs_submitted_on_time = metadata.atrs_submitted_on_time;
          result.atr_timeliness_rate = row.value;
          result.atr_score = row.score;
          break;
      }
      
      if (row.status) result.status = row.status;
      if (row.notes) result.feedback = row.notes;
    }

    // Calculate total score
    const totalScore = (result.iccs_score || 0) + 
                      (result.training_score || 0) + 
                      (result.ad_score || 0) + 
                      (result.cases_score || 0) + 
                      (result.atr_score || 0);
    result.total_score = totalScore;

    // Get assignment info
    const assignment = await getAsync<any>(
      db,
      `SELECT prevention_officer_id FROM assignments 
       WHERE agency_id = ? AND status = 'active'
       ORDER BY assigned_at DESC LIMIT 1`,
      [agencyId]
    );
    result.assigned_officer_id = assignment?.prevention_officer_id || null;

    res.json(result);
  } catch (err) {
    console.error('Get agency data error:', err instanceof Error ? err.message : 'Unknown error');
    res.status(500).json({ error: 'Failed to load agency data' });
  }
};

// ============================================
// POST /api/agency/data
// ============================================
export const updateAgencyData = async (req: Request, res: Response) => {
  try {
    const db = getDB();
    
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get the user's full details including agency_id
    const fullUser = await getAsync<any>(
      db,
      'SELECT id, email, name, role, agency_id FROM users WHERE id = ?',
      [user.id]
    );

    if (!fullUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!fullUser.agency_id) {
      return res.status(403).json({ error: 'User does not belong to an agency' });
    }

    const agencyId = fullUser.agency_id;
    const fiscalYear = '2025-26';

    const {
      complaint_level = 0,
      coi_level = 0,
      gift_level = 0,
      proactive_level = 0,
      total_employees = 0,
      completed_employees = 0,
      total_covered_officials = 0,
      officials_submitted_on_time = 0,
      conviction_cases = 0,
      prosecution_cases = 0,
      admin_action_cases = 0,
      total_atrs = 0,
      atrs_submitted_on_time = 0,
      status = 'draft',
      feedback
    } = req.body;

    if (!['draft', 'submitted'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Use "draft" or "submitted".' });
    }

    // Calculate derived values and scores
    const elearningCompletionRate = total_employees > 0 
      ? (completed_employees / total_employees) * 100 
      : 0;
      
    const adComplianceRate = total_covered_officials > 0 
      ? (officials_submitted_on_time / total_covered_officials) * 100 
      : 0;
      
    const caseSeverityPoints = (conviction_cases * 3) + (prosecution_cases * 2) + (admin_action_cases * 1);
    
    const atrTimelinessRate = total_atrs > 0 
      ? (atrs_submitted_on_time / total_atrs) * 100 
      : 0;

    // Define level points mapping
    const levelPoints: Record<number, number> = { 0: 0, 1: 4, 2: 6, 3: 8 };

    // Calculate ICCS score
    const iccsScore = (levelPoints[complaint_level] || 0) + 
                      (levelPoints[coi_level] || 0) + 
                      (levelPoints[gift_level] || 0) + 
                      (levelPoints[proactive_level] || 0);

    // Calculate other scores
    const trainingScore = elearningCompletionRate >= 85 ? 24 :
                         elearningCompletionRate >= 70 ? 18 :
                         elearningCompletionRate >= 50 ? 10 : 0;

    const adScore = adComplianceRate >= 100 ? 14 :
                   adComplianceRate >= 95 ? 10 :
                   adComplianceRate >= 90 ? 5 : 0;

    const casesScore = caseSeverityPoints === 0 ? 20 :
                      caseSeverityPoints <= 2 ? 12 :
                      caseSeverityPoints <= 4 ? 6 : 0;

    const atrScore = atrTimelinessRate >= 90 ? 10 :
                    atrTimelinessRate >= 70 ? 7 : 3;

    // Prepare data for each indicator
    const indicatorData = [
      {
        id: 'ind_iccs',
        value: iccsScore,
        score: iccsScore,
        metadata: { complaint_level, coi_level, gift_level, proactive_level }
      },
      {
        id: 'ind_training',
        value: elearningCompletionRate,
        score: trainingScore,
        metadata: { total_employees, completed_employees }
      },
      {
        id: 'ind_ad',
        value: adComplianceRate,
        score: adScore,
        metadata: { total_covered_officials, officials_submitted_on_time }
      },
      {
        id: 'ind_cases',
        value: caseSeverityPoints,
        score: casesScore,
        metadata: { conviction_cases, prosecution_cases, admin_action_cases }
      },
      {
        id: 'ind_atr',
        value: atrTimelinessRate,
        score: atrScore,
        metadata: { total_atrs, atrs_submitted_on_time }
      }
    ];

    // Start transaction
    await runAsync(db, 'BEGIN TRANSACTION');

    try {
      for (const ind of indicatorData) {
        const existing = await getAsync<any>(
          db,
          'SELECT id FROM indicator_data WHERE agency_id = ? AND indicator_id = ? AND fiscal_year = ?',
          [agencyId, ind.id, fiscalYear]
        );

        if (existing) {
          await runAsync(
            db,
            `UPDATE indicator_data SET
              value = ?,
              score = ?,
              status = ?,
              notes = ?,
              metadata = ?,
              updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
              ind.value,
              ind.score,
              status,
              feedback || null,
              JSON.stringify(ind.metadata),
              existing.id
            ]
          );
        } else {
          await runAsync(
            db,
            `INSERT INTO indicator_data (
              id, indicator_id, agency_id, fiscal_year, value, score, 
              status, notes, metadata, collected_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              crypto.randomUUID ? crypto.randomUUID() : `data_${Date.now()}_${ind.id}`,
              ind.id,
              agencyId,
              fiscalYear,
              ind.value,
              ind.score,
              status,
              feedback || null,
              JSON.stringify(ind.metadata),
              fullUser.email
            ]
          );
        }
      }

      if (status === 'submitted') {
        const totalScore = iccsScore + trainingScore + adScore + casesScore + atrScore;
        
        let assessment = await getAsync<any>(
          db,
          'SELECT id FROM assessments WHERE agency_id = ? AND fiscal_year = ?',
          [agencyId, fiscalYear]
        );

        const assignment = await getAsync<any>(
          db,
          `SELECT prevention_officer_id FROM assignments 
           WHERE agency_id = ? AND status = 'active'`,
          [agencyId]
        );

        if (assessment) {
          await runAsync(
            db,
            `UPDATE assessments SET
              status = 'SUBMITTED_TO_AGENCY',
              overall_score = ?,
              submitted_at = ?,
              updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [totalScore, new Date().toISOString(), assessment.id]
          );
        } else {
          await runAsync(
            db,
            `INSERT INTO assessments (
              id, agency_id, fiscal_year, status, overall_score,
              assigned_officer_id, submitted_at
            ) VALUES (?, ?, ?, 'SUBMITTED_TO_AGENCY', ?, ?, ?)`,
            [
              crypto.randomUUID ? crypto.randomUUID() : `ass_${Date.now()}`,
              agencyId,
              fiscalYear,
              totalScore,
              assignment?.prevention_officer_id || null,
              new Date().toISOString()
            ]
          );
        }
      }

      await runAsync(db, 'COMMIT');
    } catch (error) {
      await runAsync(db, 'ROLLBACK');
      throw error;
    }

    res.json({ 
      success: true,
      scores: {
        iccs: iccsScore,
        training: trainingScore,
        ad: adScore,
        cases: casesScore,
        atr: atrScore,
        total: iccsScore + trainingScore + adScore + casesScore + atrScore
      }
    });

  } catch (err) {
    console.error('Update agency data error:', err instanceof Error ? err.message : 'Unknown error');
    res.status(500).json({ error: 'Failed to save agency data' });
  }
};

// ============================================
// GET /api/agency/assigned-officer
// ============================================
export const getAssignedOfficer = async (req: Request, res: Response) => {
  try {
    const db = getDB();
    
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const fullUser = await getAsync<any>(
      db,
      'SELECT id, email, name, role, agency_id FROM users WHERE id = ?',
      [user.id]
    );

    if (!fullUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!fullUser.agency_id) {
      return res.status(403).json({ error: 'User does not belong to an agency' });
    }

    const assignment = await getAsync<any>(
      db,
      `SELECT u.id, u.name, u.email, u.phone, a.assigned_at, a.notes
       FROM assignments a
       JOIN users u ON a.prevention_officer_id = u.id
       WHERE a.agency_id = ? AND a.status = 'active'
       ORDER BY a.assigned_at DESC LIMIT 1`,
      [fullUser.agency_id]
    );

    res.json(assignment || null);
  } catch (err) {
    console.error('Get assigned officer error:', err instanceof Error ? err.message : 'Unknown error');
    res.status(500).json({ error: 'Failed to get assigned officer' });
  }
};