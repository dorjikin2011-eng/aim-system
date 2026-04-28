// backend/src/controllers/assessmentController.ts - COMPLETE FIXED VERSION
import { Request, Response } from 'express';
import { getDB, getAsync, allAsync, runAsync } from '../models/db';
import { FormGenerator } from '../utils/FormGenerator';
import { IndicatorConfig } from '../models/IndicatorConfig';
import { FormTemplate } from '../models/FormTemplate';
import crypto from 'crypto';

// ============================================
// Database Row Types
// ============================================
interface AssessmentRow {
  id: string;
  agency_id: string;
  fiscal_year: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SUBMITTED' | 'VALIDATED' | 'DRAFT' | 'SUBMITTED_TO_AGENCY' | 'AWAITING_VALIDATION' | 'FINALIZED';
  overall_score: number | null;
  officer_remarks: string | null;
  assigned_officer_id: string;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  validated_at: string | null;
  validated_by: string | null;
  finalized_at: string | null;
  finalized_by: string | null;
  finalization_notes: string | null;
  unlocked_at: string | null;
  unlocked_by: string | null;
  unlock_reason: string | null;
  indicator_scores: string | null;
}

interface DynamicAssessmentResponseRow {
  id: string;
  assessment_id: string;
  indicator_id: string;
  response_data: string;
  calculated_score: number | null;
  manual_score: number | null;
  final_score: number;
  evidence_files: string | null;
  comments: string | null;
  validated_by: string | null;
  validated_at: string | null;
  is_locked: number;
  locked_at: string | null;
  locked_by: string | null;
  unlocked_at: string | null;
  unlocked_by: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Request Body Types
// ============================================
interface SaveAssessmentBody {
  agency_id: string;
  indicatorId: string;
  score?: number;
  responseData: Record<string, any>;
  last_updated?: string;
  templateId?: string;
}

interface SaveAllAssessmentBody {
  agency_id: string;
  indicator_scores: Record<string, number>;
  response_data?: Record<string, any>;
  status: string;
}

interface SubmitAssessmentBody {
  agency_id: string;
  submitted_at: string;
}

// ============================================
// Utility Functions
// ============================================
function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
}

async function logAssessmentAction(
  action: string,
  agencyId: string,
  userId: string,
  details: any
) {
  try {
    const db = getDB();
    await runAsync(
      db,
      `INSERT INTO audit_logs (id, action, user_id, agency_id, details, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        generateId(),
        action,
        userId,
        agencyId,
        JSON.stringify(details),
        new Date().toISOString()
      ]
    );
  } catch (error) {
    console.error('Failed to log assessment action:', error);
  }
}

async function findTemplateForIndicator(indicatorId: string): Promise<string | null> {
  try {
    const db = getDB();
    const templates = await allAsync<any>(
      db,
      `SELECT id FROM form_templates
       WHERE is_active = true
       AND template_type IN ('assessment', 'custom')
       ORDER BY created_at DESC`,
      []
    );

    for (const template of templates) {
      const templateData = await FormTemplate.getById(template.id);
      if (templateData && templateData.indicatorIds?.includes(indicatorId)) {
        return template.id;
      }
    }

    const indicator = await IndicatorConfig.getById(indicatorId);
    if (indicator) {
      const defaultTemplates = await allAsync<any>(
        db,
        `SELECT id FROM form_templates
         WHERE is_active = true
         AND template_type = 'assessment'
         AND (ui_config LIKE $1 OR metadata LIKE $2)
         ORDER BY created_at DESC
         LIMIT 1`,
        [`%${indicator.category}%`, `%${indicator.category}%`]
      );

      if (defaultTemplates.length > 0) {
        return defaultTemplates[0].id;
      }
    }

    return null;
  } catch (error) {
    console.error('Error finding template for indicator:', error);
    return null;
  }
}

async function getAllIndicators(db: any) {
  try {
    const indicators = await allAsync(
      db,
      `SELECT id, code, name FROM indicators LIMIT 10`,
      []
    );
    return indicators;
  } catch (error) {
    return [];
  }
}

// ============================================
// Helper: Calculate score for a SINGLE indicator only
// ============================================
function calculateIndicatorScoreOnly(indicatorId: string, formData: any): number {
  const data = formData || {};
  
  switch(indicatorId) {
    case 'ind_iccs_v3': {
      const levelPoints: Record<number, number> = {0: 0, 1: 4, 2: 6, 3: 8};
      return (levelPoints[Number(data.complaint_level)||0] || 0) +
             (levelPoints[Number(data.coi_level)||0] || 0) +
             (levelPoints[Number(data.gift_level)||0] || 0) +
             (levelPoints[Number(data.proactive_level)||0] || 0);
    }
    case 'ind_training_v3': {
      const total = Number(data.total_employees) || 0;
      const completed = Number(data.completed_employees) || 0;
      if (total === 0) return 0;
      const pct = (completed / total) * 100;
      if (pct >= 85) return 24;
      if (pct >= 70) return 18;
      if (pct >= 50) return 10;
      return 0;
    }
    case 'ind_ad_v3': {
      const total = Number(data.total_covered_officials) || 0;
      const submitted = Number(data.officials_submitted_on_time) || 0;
      if (total === 0) return 0;
      const pct = (submitted / total) * 100;
      if (pct >= 100) return 14;
      if (pct >= 95) return 10;
      if (pct >= 90) return 5;
      return 0;
    }
    case 'ind_coc_v3': {
      const cocPoints: Record<number, number> = {0: 0, 1: 4, 2: 7, 3: 10};
      return cocPoints[Number(data.coc_level)||0] || 0;
    }
    case 'ind_cases_v3': {
      const severity = (Number(data.conviction_cases)||0)*3 + 
                       (Number(data.prosecution_cases)||0)*2 + 
                       (Number(data.admin_action_cases)||0)*1;
      if (severity === 0) return 20;
      if (severity <= 2) return 12;
      if (severity <= 4) return 6;
      return 0;
    }
    default:
      return 0;
  }
}

// ============================================
// Helper: Calculate TOTAL AIMS score (all 5 indicators combined)
// ============================================
function calculateAIMSScore(formData: any): number {
  console.log('🧮 Calculating AIMS score from form data');
  let data = formData;
  
  for (const key in formData) {
    if (typeof formData[key] === 'object' && formData[key] !== null) {
      if (formData[key].complaint_level !== undefined) {
        data = formData[key];
        console.log('📦 Found nested indicator data under key:', key);
        break;
      }
    }
  }

  const complaintLevel = Number(data.complaint_level) || 0;
  const coiLevel = Number(data.coi_level) || 0;
  const giftLevel = Number(data.gift_level) || 0;
  const proactiveLevel = Number(data.proactive_level) || 0;
  const levelPoints: Record<number, number> = {0: 0, 1: 4, 2: 6, 3: 8};
  const iccsScore = (levelPoints[complaintLevel] || 0) +
                    (levelPoints[coiLevel] || 0) +
                    (levelPoints[giftLevel] || 0) +
                    (levelPoints[proactiveLevel] || 0);

  const totalEmployees = Number(data.total_employees) || 0;
  const completedEmployees = Number(data.completed_employees) || 0;
  let trainingScore = 0;
  if (totalEmployees > 0) {
    const trainingPercent = (completedEmployees / totalEmployees) * 100;
    if (trainingPercent >= 85) trainingScore = 24;
    else if (trainingPercent >= 70) trainingScore = 18;
    else if (trainingPercent >= 50) trainingScore = 10;
  }

  const totalOfficials = Number(data.total_covered_officials) || 0;
  const submittedOfficials = Number(data.officials_submitted_on_time) || 0;
  let adScore = 0;
  if (totalOfficials > 0) {
    const adPercent = (submittedOfficials / totalOfficials) * 100;
    if (adPercent >= 100) adScore = 14;
    else if (adPercent >= 95) adScore = 10;
    else if (adPercent >= 90) adScore = 5;
  }

  const cocLevel = Number(data.coc_level) || 0;
  const cocPoints: Record<number, number> = {0: 0, 1: 4, 2: 7, 3: 10};
  const cocScore = cocPoints[cocLevel] || 0;

  const convictions = Number(data.conviction_cases) || 0;
  const prosecutions = Number(data.prosecution_cases) || 0;
  const adminActions = Number(data.admin_action_cases) || 0;
  const severityScore = (convictions * 3) + (prosecutions * 2) + (adminActions * 1);
  let casesScore = 0;
  if (severityScore === 0) casesScore = 20;
  else if (severityScore <= 2) casesScore = 12;
  else if (severityScore <= 4) casesScore = 6;

  const totalScore = iccsScore + trainingScore + adScore + cocScore + casesScore;
  return totalScore;
}

// ============================================
// Get assessment progress for an agency
// ============================================
export async function getAssessmentProgress(req: Request, res: Response) {
  console.log('✅✅✅ getAssessmentProgress HIT!', req.params);
  try {
    const { agencyId } = req.params;
    console.log('Agency ID:', agencyId);
    const db = getDB();
    const currentYear = new Date().getFullYear();
    const fiscalYear = `${currentYear}–${currentYear + 1}`;

    const assessment = await getAsync<AssessmentRow>(
      db,
      `SELECT *, indicator_scores FROM assessments WHERE agency_id = $1 AND fiscal_year = $2`,
      [agencyId, fiscalYear]
    );

    if (!assessment) {
      return res.json({
        success: true,
        assessment: {
          agency_id: agencyId,
          status: 'NOT_STARTED',
          indicator_scores: {},
          overall_score: null,
          last_updated: null,
          submitted_at: null,
          validated_at: null
        }
      });
    }

    const indicatorResponses = await allAsync<DynamicAssessmentResponseRow>(
      db,
      `SELECT * FROM dynamic_assessment_responses WHERE assessment_id = $1`,
      [assessment.id]
    );

    const indicator_scores: Record<string, number> = {};
    const response_data: Record<string, any> = {};

    // First, try to get scores from assessment.indicator_scores column
    if (assessment.indicator_scores) {
      try {
        let savedScores = assessment.indicator_scores;
        if (typeof savedScores === 'string') {
          savedScores = JSON.parse(savedScores);
        }
        Object.assign(indicator_scores, savedScores);
        console.log('📊 Loaded indicator_scores from assessment column:', indicator_scores);
      } catch (e) {
        console.error('Error parsing indicator_scores:', e);
      }
    }

    // Also load response data from dynamic_responses
    if (indicatorResponses && Array.isArray(indicatorResponses)) {
      indicatorResponses.forEach(response => {
        if (response.indicator_id) {
          if (!indicator_scores[response.indicator_id]) {
            indicator_scores[response.indicator_id] = response.final_score;
          }
          if (response.response_data) {
            try {
              response_data[response.indicator_id] = JSON.parse(response.response_data);
            } catch (error) {
              console.error('Error parsing response data:', error);
            }
          }
        }
      });
    }

    res.json({
      success: true,
      assessment: {
        agency_id: assessment.agency_id,
        status: assessment.status,
        indicator_scores,
        response_data,
        overall_score: assessment.overall_score,
        last_updated: assessment.updated_at,
        submitted_at: assessment.submitted_at,
        validated_at: assessment.validated_at,
        validated_by: assessment.validated_by,
        officer_remarks: assessment.officer_remarks,
        fiscal_year: assessment.fiscal_year,
        finalized_at: assessment.finalized_at,
        finalized_by: assessment.finalized_by,
        finalization_notes: assessment.finalization_notes,
        unlocked_at: assessment.unlocked_at,
        unlocked_by: assessment.unlocked_by,
        unlock_reason: assessment.unlock_reason
      }
    });
  } catch (err) {
    console.error('Get assessment progress error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to load assessment progress',
      details: err instanceof Error ? err.message : 'Unknown error'
    });
  }
}

// ============================================
// Save single indicator assessment
// ============================================
export async function saveIndicatorAssessment(req: Request, res: Response) {
  try {
    const { agency_id, indicatorId, score, responseData, last_updated, templateId } = req.body as SaveAssessmentBody;
    
    if (!agency_id || !indicatorId) {
      return res.status(400).json({
        success: false,
        error: 'agency_id and indicatorId are required'
      });
    }

    console.log('🔍 Received save request:', { agency_id, indicatorId, score });

    const indicatorIdMap: Record<string, string> = {
      'aims-assessment': 'ind_iccs_v3',
      'iccs': 'ind_iccs_v3',
      'ind_iccs': 'ind_iccs_v3',
      'training': 'ind_training_v3',
      'ind_training': 'ind_training_v3',
      'capacity': 'ind_training_v3',
      'ad': 'ind_ad_v3',
      'ind_ad': 'ind_ad_v3',
      'asset_declaration': 'ind_ad_v3',
      'cases': 'ind_cases_v3',
      'ind_cases': 'ind_cases_v3',
      'corruption_cases': 'ind_cases_v3',
      'coc': 'ind_coc_v3',
      'ind_coc': 'ind_coc_v3',
      'code_of_conduct': 'ind_coc_v3',
    };

    const dbIndicatorId = indicatorIdMap[indicatorId] || indicatorId;
    console.log('🔍 Mapped indicator ID:', { original: indicatorId, mapped: dbIndicatorId });

    const db = getDB();
    const currentYear = new Date().getFullYear();
    const fiscalYear = `${currentYear}–${currentYear + 1}`;
    const userId = (req as any).user?.id || 'system';

    const indicatorExists = await getAsync<any>(
      db,
      `SELECT id FROM indicators WHERE id = $1`,
      [dbIndicatorId]
    );

    if (!indicatorExists) {
      console.error(`❌ Indicator ${dbIndicatorId} not found in database`);
      return res.status(400).json({
        success: false,
        error: `Indicator not found: ${dbIndicatorId}`,
        availableIndicators: await getAllIndicators(db)
      });
    }

    let indicator: any = null;
    try {
      indicator = await IndicatorConfig.getById(dbIndicatorId);
    } catch (error) {
      console.warn(`Indicator ${dbIndicatorId} not found in IndicatorConfig, using defaults`);
    }
    
    let calculatedScore = score !== undefined ? score : calculateIndicatorScoreOnly(dbIndicatorId, responseData);
    let scoringBreakdown: any[] = [];

    if (responseData && Object.keys(responseData).length > 0) {
      try {
        let effectiveTemplateId: string | null | undefined = templateId;
        if (!effectiveTemplateId) {
          effectiveTemplateId = await findTemplateForIndicator(dbIndicatorId);
        }

        if (effectiveTemplateId) {
          const scoreResult = await FormGenerator.calculateScore(responseData, effectiveTemplateId);
          if (indicator?.code) {
            const indicatorScore = scoreResult.breakdown.find(
              (item: any) => item.code === indicator.code
            );
            if (indicatorScore) {
              calculatedScore = indicatorScore.rawScore;
              scoringBreakdown = scoreResult.breakdown;
            }
          }
        }
      } catch (scoringError) {
        console.error('Error calculating dynamic score:', scoringError);
      }
    }

    const finalScore = calculatedScore;
    console.log('✅ Using final score:', finalScore);

    let assessment = await getAsync<AssessmentRow>(
      db,
      `SELECT * FROM assessments WHERE agency_id = $1 AND fiscal_year = $2`,
      [agency_id, fiscalYear]
    );

    let assessmentId: string;
    let overallStatus: string = 'IN_PROGRESS'; 

    if (!assessment) {
      assessmentId = generateId();
      await runAsync(
        db,
        `INSERT INTO assessments (
          id, agency_id, fiscal_year, status, overall_score,
          assigned_officer_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          assessmentId,
          agency_id,
          fiscalYear,
          overallStatus,
          null,
          userId,
          new Date().toISOString(),
          new Date().toISOString()
        ]
      );
      console.log('✅ Created new assessment:', assessmentId);
    } else {
      assessmentId = assessment.id;
      overallStatus = assessment.status === 'NOT_STARTED' ? 'IN_PROGRESS' : assessment.status;

      if (assessment.status === 'FINALIZED' && !assessment.unlocked_at) {
        return res.status(400).json({
          success: false,
          error: 'Assessment is finalized and locked. Unlock it first to make changes.',
          assessment
        });
      }

      await runAsync(
        db,
        `UPDATE assessments SET updated_at = $1 WHERE id = $2`,
        [new Date().toISOString(), assessmentId]
      );
    }

    const existingResponse = await getAsync<DynamicAssessmentResponseRow>(
      db,
      `SELECT * FROM dynamic_assessment_responses WHERE assessment_id = $1 AND indicator_id = $2`,
      [assessmentId, dbIndicatorId]
    );

    if (!existingResponse) {
      await runAsync(
        db,
        `INSERT INTO dynamic_assessment_responses (
          id, assessment_id, indicator_id, response_data,
          calculated_score, manual_score, final_score,
          evidence_files, comments, created_at, updated_at, is_locked
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          generateId(),
          assessmentId,
          dbIndicatorId,
          JSON.stringify(responseData || {}),
          calculatedScore,
          score !== undefined ? score : null,
          finalScore,
          JSON.stringify([]),
          JSON.stringify({...scoringBreakdown}),
          new Date().toISOString(),
          new Date().toISOString(),
          0
        ]
      );
      console.log('✅ Created new response for indicator:', dbIndicatorId, 'with score:', finalScore);
    } else {
      if (existingResponse.is_locked && !existingResponse.unlocked_at) {
        return res.status(400).json({
          success: false,
          error: 'This indicator response is locked. Unlock the assessment first.',
          response: existingResponse
        });
      }

      await runAsync(
        db,
        `UPDATE dynamic_assessment_responses SET
          response_data = $1,
          calculated_score = $2,
          manual_score = $3,
          final_score = $4,
          comments = $5,
          updated_at = $6,
          is_locked = $7
        WHERE assessment_id = $8 AND indicator_id = $9`,
        [
          JSON.stringify(responseData || {}),
          calculatedScore,
          existingResponse.manual_score || (score !== undefined ? score : null),
          finalScore,
          JSON.stringify({...scoringBreakdown}),
          new Date().toISOString(),
          existingResponse.is_locked || 0,
          assessmentId,
          dbIndicatorId
        ]
      );
      console.log('✅ Updated response for indicator:', dbIndicatorId, 'with score:', finalScore);
    }

    // Recalculate overall score from all indicator responses
    const allResponses = await allAsync<any>(
      db,
      `SELECT final_score FROM dynamic_assessment_responses WHERE assessment_id = $1`,
      [assessmentId]
    );

    const totalScore = allResponses.reduce((sum, res) => sum + (res.final_score || 0), 0);
    const responseCount = allResponses.length;
    const overallScore = totalScore; // SUM not average

    console.log('📊 Overall score calculation:', { totalScore, responseCount, overallScore });

    await runAsync(
      db,
      `UPDATE assessments SET
        overall_score = $1,
        status = $2,
        updated_at = $3
      WHERE id = $4`,
      [
        overallScore,
        overallStatus,
        new Date().toISOString(),
        assessmentId
      ]
    );

    const updatedAssessment = await getAsync<AssessmentRow>(
      db,
      `SELECT * FROM assessments WHERE id = $1`,
      [assessmentId]
    );

    const indicatorDetails = indicator ? {
      id: indicator.id,
      name: indicator.name,
      code: indicator.code,
      category: indicator.category,
      weight: indicator.weight,
      maxScore: indicator.maxScore,
      scoringMethod: indicator.scoringMethod
    } : null;

    res.json({
      success: true,
      assessment: updatedAssessment,
      indicator: indicatorDetails,
      scoring: {
        calculatedScore,
        manualScore: score !== undefined ? score : null,
        finalScore,
        breakdown: scoringBreakdown
      },
      message: 'Assessment saved successfully'
    });
  } catch (err) {
    console.error('❌ Save indicator assessment error:', err);
    if (err instanceof Error && err.message.includes('FOREIGN KEY')) {
      return res.status(400).json({
        success: false,
        error: 'Database constraint error. Please check that the assessment and indicator exist.',
        details: err.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to save assessment',
      details: err instanceof Error ? err.message : 'Unknown error'
    });
  }
}

// ============================================
// ⭐ Save all assessments at once - WITH indicator_scores column
// ============================================
export async function saveAllAssessments(req: Request, res: Response) {
  try {
    console.log('\n=== saveAllAssessments CALLED ===');
    const { agency_id, indicator_scores, response_data, status } = req.body as SaveAllAssessmentBody;
    
    if (!agency_id || !indicator_scores) {
      return res.status(400).json({
        success: false,
        error: 'agency_id and indicator_scores are required'
      });
    }

    console.log('saveAllAssessments called with:', { 
      agency_id, 
      indicator_scores,
      status 
    });

    const db = getDB();
    const currentYear = new Date().getFullYear();
    const fiscalYear = `${currentYear}–${currentYear + 1}`;
    const userId = (req as any).user?.id || 'system';

    const indicatorIdMap: Record<string, string> = {
      'ind_iccs_v3': 'ind_iccs_v3',
      'ind_training_v3': 'ind_training_v3',
      'ind_ad_v3': 'ind_ad_v3',
      'ind_coc_v3': 'ind_coc_v3',
      'ind_cases_v3': 'ind_cases_v3',
    };

    // Get or create assessment record
    let assessment = await getAsync<AssessmentRow>(
      db,
      `SELECT * FROM assessments WHERE agency_id = $1 AND fiscal_year = $2`,
      [agency_id, fiscalYear]
    );

    let assessmentId: string;
    let overallStatus = status || 'IN_PROGRESS';

    // Calculate total score from indicator_scores
    let totalScore = 0;
    for (const [indicatorId, score] of Object.entries(indicator_scores)) {
      totalScore += typeof score === 'number' ? score : Number(score);
    }
    const overallScore = totalScore; // SUM not average

    if (!assessment) {
      assessmentId = generateId();
      await runAsync(
        db,
        `INSERT INTO assessments (
          id, agency_id, fiscal_year, status, overall_score, indicator_scores,
          assigned_officer_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          assessmentId,
          agency_id,
          fiscalYear,
          overallStatus,
          overallScore,
          JSON.stringify(indicator_scores),
          userId,
          new Date().toISOString(),
          new Date().toISOString()
        ]
      );
      console.log('✅ Created new assessment with indicator_scores:', assessmentId);
    } else {
      assessmentId = assessment.id;
      
      if (assessment.status === 'FINALIZED' && !assessment.unlocked_at) {
        return res.status(400).json({
          success: false,
          error: 'Assessment is finalized and locked. Unlock it first to make changes.',
          assessment
        });
      }
      
      await runAsync(
        db,
        `UPDATE assessments SET
          status = $1,
          overall_score = $2,
          indicator_scores = $3,
          updated_at = $4
        WHERE id = $5`,
        [
          overallStatus,
          overallScore,
          JSON.stringify(indicator_scores),
          new Date().toISOString(),
          assessmentId
        ]
      );
      console.log('✅ Updated assessment with indicator_scores:', assessmentId);
    }

        // Also save to dynamic_assessment_responses for backward compatibility
    // Store the complete response_data with all parameter values
    for (const [indicatorId, manualScore] of Object.entries(indicator_scores)) {
      const dbIndicatorId = indicatorIdMap[indicatorId] || indicatorId;
      const finalScore = typeof manualScore === 'number' ? manualScore : 0;
      
      // Build complete response data with all parameter values from flat response_data
      let responseDataItem: Record<string, any> = {};
      
      // Check if response_data exists and extract parameter values
      if (response_data && typeof response_data === 'object') {
        // Flat structure from AgencyAssessmentPage - extract based on indicator
        if (indicatorId === 'ind_iccs_v3') {
          responseDataItem = {
            complaint_level: response_data.complaint_level ?? 0,
            coi_level: response_data.coi_level ?? 0,
            gift_level: response_data.gift_level ?? 0,
            proactive_level: response_data.proactive_level ?? 0
          };
        } else if (indicatorId === 'ind_training_v3') {
          responseDataItem = {
            total_employees: response_data.total_employees ?? 0,
            completed_employees: response_data.completed_employees ?? 0
          };
        } else if (indicatorId === 'ind_ad_v3') {
          responseDataItem = {
            total_covered_officials: response_data.total_covered_officials ?? 0,
            officials_submitted_on_time: response_data.officials_submitted_on_time ?? 0
          };
        } else if (indicatorId === 'ind_coc_v3') {
          responseDataItem = {
            coc_level: response_data.coc_level ?? 0
          };
        } else if (indicatorId === 'ind_cases_v3') {
          responseDataItem = {
            conviction_cases: Number(response_data.conviction_cases) || 0,
            prosecution_cases: Number(response_data.prosecution_cases) || 0,
            admin_action_cases: Number(response_data.admin_action_cases) || 0
          };
        } else {
          // Fallback: use existing nested structure or empty object
          responseDataItem = response_data[indicatorId] || {};
        }
      }
      
      console.log(`📝 Saving response_data for ${indicatorId}:`, JSON.stringify(responseDataItem, null, 2));

      const existingResponse = await getAsync<DynamicAssessmentResponseRow>(
        db,
        `SELECT id, is_locked, unlocked_at FROM dynamic_assessment_responses 
         WHERE assessment_id = $1 AND indicator_id = $2`,
        [assessmentId, dbIndicatorId]
      );

      if (!existingResponse) {
        await runAsync(
          db,
          `INSERT INTO dynamic_assessment_responses (
            id, assessment_id, indicator_id, response_data,
            calculated_score, manual_score, final_score,
            comments, created_at, updated_at, is_locked
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            generateId(),
            assessmentId,
            dbIndicatorId,
            JSON.stringify(responseDataItem),
            finalScore,
            finalScore, // manual_score uses same value
            finalScore,
            JSON.stringify({ method: 'frontend_calculated', timestamp: new Date().toISOString() }),
            new Date().toISOString(),
            new Date().toISOString(),
            0
          ]
        );
        console.log(`✅ Created response for ${indicatorId}`);
      } else {
        await runAsync(
          db,
          `UPDATE dynamic_assessment_responses SET
            response_data = $1,
            calculated_score = $2,
            manual_score = $3,
            final_score = $4,
            updated_at = $5
          WHERE assessment_id = $6 AND indicator_id = $7`,
          [
            JSON.stringify(responseDataItem),
            finalScore,
            finalScore,
            finalScore,
            new Date().toISOString(),
            assessmentId,
            dbIndicatorId
          ]
        );
        console.log(`✅ Updated response for ${indicatorId}`);
      }
    }

    const updatedAssessment = await getAsync<AssessmentRow>(
      db,
      `SELECT * FROM assessments WHERE id = $1`,
      [assessmentId]
    );

    console.log('saveAllAssessments completed:', { overallScore, indicator_scores });

    res.json({
      success: true,
      assessment: updatedAssessment,
      overallScore,
      message: `All assessments saved successfully. Total score: ${overallScore}/100`
    });

  } catch (err) {
    console.error('❌ Save all assessments error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to save assessments',
      details: err instanceof Error ? err.message : 'Unknown error'
    });
  }
};
// ============================================
// Calculate score for specific indicator
// ============================================
export async function calculateIndicatorScore(req: Request, res: Response) {
  try {
    const { indicatorId, responseData, templateId } = req.body;
    
    if (!indicatorId || !responseData) {
      return res.status(400).json({
        success: false,
        error: 'indicatorId and responseData are required'
      });
    }

    const indicator = await IndicatorConfig.getById(indicatorId);
    if (!indicator) {
      return res.status(404).json({
        success: false,
        error: 'Indicator not found'
      });
    }

    let effectiveTemplateId = templateId;
    if (!effectiveTemplateId) {
      effectiveTemplateId = await findTemplateForIndicator(indicatorId);
    }

    if (!effectiveTemplateId) {
      return res.status(404).json({
        success: false,
        error: 'No form template found for this indicator'
      });
    }

    const scoreResult = await FormGenerator.calculateScore(responseData, effectiveTemplateId);

    const indicatorScore = scoreResult.breakdown.find(
      (item: any) => item.code === indicator.code
    );

    if (!indicatorScore) {
      return res.status(404).json({
        success: false,
        error: 'Could not calculate score for this indicator'
      });
    }

    res.json({
      success: true,
      data: {
        indicatorId,
        indicatorName: indicator.name,
        indicatorCode: indicator.code,
        category: indicator.category,
        calculatedScore: indicatorScore.rawScore,
        weightedScore: indicatorScore.weightedScore,
        maxScore: indicator.maxScore,
        scoringMethod: indicator.scoringMethod,
        integrityLevel: scoreResult.integrityLevel,
        parametersAssessed: Object.keys(responseData).length,
        breakdown: indicatorScore,
        fullBreakdown: scoreResult.breakdown,
        message: 'Score calculated using dynamic scoring rules'
      }
    });
  } catch (err) {
    console.error('Calculate score error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate score',
      details: err instanceof Error ? err.message : 'Unknown error'
    });
  }
}

// ============================================
// Submit assessment for validation
// ============================================
export async function submitAssessment(req: Request, res: Response) {
  try {
    const { agency_id, submitted_at } = req.body as SubmitAssessmentBody;
    
    if (!agency_id) {
      return res.status(400).json({
        success: false,
        error: 'agency_id is required'
      });
    }

    const db = getDB();
    const currentYear = new Date().getFullYear();
    const fiscalYear = `${currentYear}–${currentYear + 1}`;

    const assessment = await getAsync<AssessmentRow>(
      db,
      `SELECT * FROM assessments WHERE agency_id = $1 AND fiscal_year = $2`,
      [agency_id, fiscalYear]
    );

    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: 'Assessment not found'
      });
    }

    await runAsync(
      db,
      `UPDATE assessments SET
        status = 'SUBMITTED',
        submitted_at = $1,
        updated_at = $2
      WHERE id = $3`,
      [
        submitted_at || new Date().toISOString(),
        new Date().toISOString(),
        assessment.id
      ]
    );

    const updatedAssessment = await getAsync<AssessmentRow>(
      db,
      `SELECT * FROM assessments WHERE id = $1`,
      [assessment.id]
    );

    res.json({
      success: true,
      assessment: updatedAssessment,
      message: 'Assessment submitted successfully for validation'
    });
  } catch (err) {
    console.error('Submit assessment error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to submit assessment',
      details: err instanceof Error ? err.message : 'Unknown error'
    });
  }
}

// ============================================
// Validate assessment
// ============================================
export async function validateAssessment(req: Request, res: Response) {
  try {
    const { agencyId } = req.params;
    const { validated_by } = req.body;
    
    if (!agencyId) {
      return res.status(400).json({
        success: false,
        error: 'agencyId is required'
      });
    }

    const db = getDB();
    const currentYear = new Date().getFullYear();
    const fiscalYear = `${currentYear}–${currentYear + 1}`;

    const assessment = await getAsync<AssessmentRow>(
      db,
      `SELECT * FROM assessments WHERE agency_id = $1 AND fiscal_year = $2 AND status = 'SUBMITTED'`,
      [agencyId, fiscalYear]
    );

    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: 'Submitted assessment not found'
      });
    }

    await runAsync(
      db,
      `UPDATE assessments SET
        status = 'VALIDATED',
        validated_at = $1,
        validated_by = $2,
        updated_at = $3
      WHERE id = $4`,
      [
        new Date().toISOString(),
        validated_by || 'system',
        new Date().toISOString(),
        assessment.id
      ]
    );

    await runAsync(
      db,
      `UPDATE dynamic_assessment_responses SET
        validated_by = $1,
        validated_at = $2,
        updated_at = $3
      WHERE assessment_id = $4`,
      [
        validated_by || 'system',
        new Date().toISOString(),
        new Date().toISOString(),
        assessment.id
      ]
    );

    const updatedAssessment = await getAsync<AssessmentRow>(
      db,
      `SELECT * FROM assessments WHERE id = $1`,
      [assessment.id]
    );

    res.json({
      success: true,
      assessment: updatedAssessment,
      message: 'Assessment validated successfully'
    });
  } catch (err) {
    console.error('Validate assessment error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to validate assessment',
      details: err instanceof Error ? err.message : 'Unknown error'
    });
  }
}

// ============================================
// ⭐ Finalize assessment (lock scores) - Reads from indicator_scores column
// ============================================
export async function finalizeAssessment(req: Request, res: Response) {
  try {
    const { agencyId } = req.params;
    const { finalized_by, finalization_notes, indicator_scores } = req.body;
    
    if (!agencyId || !finalized_by) {
      return res.status(400).json({
        success: false,
        error: 'agencyId and finalized_by are required'
      });
    }

    const db = getDB();
    const currentYear = new Date().getFullYear();
    const fiscalYear = `${currentYear}–${currentYear + 1}`;

    let assessment = await getAsync<any>(
      db,
      `SELECT *, indicator_scores FROM assessments WHERE agency_id = $1 AND fiscal_year = $2`,
      [agencyId, fiscalYear]
    );

    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: 'Assessment not found'
      });
    }

    if (assessment.status === 'FINALIZED') {
      return res.status(400).json({
        success: false,
        error: 'Assessment is already finalized'
      });
    }

    const now = new Date().toISOString();
// --- UPDATED & FIXED SCORE CALCULATION BLOCK ---
    
    // 1. Prioritize scores from the request body (latest frontend state)
    // 2. Fallback to existing database scores if payload is missing
    let indicatorScores: Record<string, number> = req.body.indicator_scores || {};
    
    if (Object.keys(indicatorScores).length === 0 && assessment.indicator_scores) {
      try {
        let savedScores = assessment.indicator_scores;
        if (typeof savedScores === 'string') {
          savedScores = JSON.parse(savedScores);
        }
        indicatorScores = savedScores;
        console.log('📊 Using fallback scores from database:', indicatorScores);
      } catch (e) {
        console.error('❌ Error parsing database indicator_scores:', e);
      }
    } else {
      console.log('📊 Using latest scores from request payload:', indicatorScores);
    }

    // Calculate the final total score from the resolved indicatorScores object
    let totalScore = 0;
    for (const [indicatorId, score] of Object.entries(indicatorScores)) {
      const numScore = typeof score === 'number' ? score : Number(score);
      totalScore += numScore;
      console.log(`📊 Score Component - ${indicatorId}: ${numScore}`);
    }
    
    console.log('📊 Final calculated total score for finalization:', totalScore);

    // Update assessment with finalized status and clear unlock fields
    await runAsync(
  db,
  `UPDATE assessments SET
    status = 'FINALIZED',
    overall_score = $1,
    indicator_scores = $2,     -- ADD THIS
    finalized_at = $3,
    finalized_by = $4,
    finalization_notes = $5,
    unlocked_at = NULL,
    unlocked_by = NULL,
    unlock_reason = NULL,
    updated_at = $6
  WHERE id = $7`,
  [
    totalScore,
    JSON.stringify(indicatorScores), // ADD THIS
    now,
    finalized_by,
    finalization_notes || 'Assessment finalized',
    now,
    assessment.id
  ]
);

    // Lock dynamic responses if they exist
    try {
      await runAsync(
        db,
        `UPDATE dynamic_assessment_responses SET
          is_locked = true,
          locked_at = $1,
          locked_by = $2,
          updated_at = $3
        WHERE assessment_id = $4`,
        [now, finalized_by, now, assessment.id]
      );
      console.log('✅ Locked dynamic assessment responses');
    } catch (err) {
      console.log('No dynamic responses to lock');
    }

    const updatedAssessment = await getAsync<any>(
      db,
      `SELECT * FROM assessments WHERE id = $1`,
      [assessment.id]
    );

    console.log('✅ Finalization complete:', {
      assessmentId: assessment.id,
      status: updatedAssessment.status,
      overallScore: updatedAssessment.overall_score
    });

    res.json({
      success: true,
      assessment: updatedAssessment,
      message: `Assessment finalized successfully with total score ${totalScore}/100`
    });
  } catch (err) {
    console.error('❌ Finalize assessment error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to finalize assessment',
      details: err instanceof Error ? err.message : 'Unknown error'
    });
  }
}

// ============================================
// Unlock assessment
// ============================================
export async function unlockAssessment(req: Request, res: Response) {
  try {
    const { agencyId } = req.params;
    console.log('🟢 Backend received unlock request for agencyId:', agencyId);
    
    const { unlocked_by, reason } = req.body;
    
    if (!agencyId || !unlocked_by || !reason) {
      return res.status(400).json({
        success: false,
        error: 'agencyId, unlocked_by, and reason are required'
      });
    }

    const db = getDB();
    const currentYear = new Date().getFullYear();
    const fiscalYear = `${currentYear}–${currentYear + 1}`;

    const assessment = await getAsync<any>(
      db,
      `SELECT * FROM assessments WHERE agency_id = $1 AND fiscal_year = $2`,
      [agencyId, fiscalYear]
    );

    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: 'Assessment not found'
      });
    }

    if (assessment.status !== 'FINALIZED') {
      return res.status(400).json({
        success: false,
        error: 'Assessment is not finalized'
      });
    }

    const now = new Date().toISOString();

    await runAsync(
      db,
      `UPDATE assessments SET
        status = 'IN_PROGRESS',
        unlocked_at = $1,
        unlocked_by = $2,
        unlock_reason = $3,
        officer_remarks = $4,
        updated_at = $5
      WHERE id = $6`,
      [
        now,
        unlocked_by,
        reason,
        `Assessment unlocked: ${reason}`,
        now,
        assessment.id
      ]
    );

    await runAsync(
      db,
      `UPDATE dynamic_assessment_responses SET
        is_locked = false,
        unlocked_at = $1,
        unlocked_by = $2,
        updated_at = $3
      WHERE assessment_id = $4`,
      [now, unlocked_by, now, assessment.id]
    );

    const updatedAssessment = await getAsync<any>(
      db,
      `SELECT * FROM assessments WHERE id = $1`,
      [assessment.id]
    );

    res.json({
      success: true,
      assessment: updatedAssessment,
      message: 'Assessment unlocked successfully'
    });
  } catch (err) {
    console.error('❌ Unlock assessment error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to unlock assessment',
      details: err instanceof Error ? err.message : 'Unknown error'
    });
  }
}

// ============================================
// Get full assessment details
// ============================================
export async function getFullAssessment(req: Request, res: Response) {
  try {
    const { agencyId } = req.params;
    const fiscalYear = (req.query.fy as string) || `${new Date().getFullYear()}–${new Date().getFullYear() + 1}`;
    
    const db = getDB();
    
    const assessment = await getAsync<AssessmentRow>(
      db,
      `SELECT *, indicator_scores FROM assessments WHERE agency_id = $1 AND fiscal_year = $2`,
      [agencyId, fiscalYear]
    );

    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: 'Assessment not found'
      });
    }

    const indicatorResponses = await allAsync<DynamicAssessmentResponseRow>(
      db,
      `SELECT * FROM dynamic_assessment_responses WHERE assessment_id = $1 ORDER BY created_at`,
      [assessment.id]
    );

    const parsedResponses = [];
    for (const response of indicatorResponses) {
      const baseResponse = {
        ...response,
        response_data: response.response_data ? JSON.parse(response.response_data) : {},
        evidence_files: response.evidence_files ? JSON.parse(response.evidence_files) : [],
        scoring_breakdown: response.comments ? JSON.parse(response.comments) : null
      };

      try {
        const indicator = await IndicatorConfig.getById(response.indicator_id);
        if (indicator) {
          parsedResponses.push({
            ...baseResponse,
            indicator: {
              id: indicator.id,
              name: indicator.name,
              code: indicator.code,
              category: indicator.category,
              weight: indicator.weight,
              maxScore: indicator.maxScore,
              scoringMethod: indicator.scoringMethod,
              parameters: indicator.parameters
            }
          });
        } else {
          parsedResponses.push(baseResponse);
        }
      } catch (error) {
        console.error(`Error fetching indicator ${response.indicator_id}:`, error);
        parsedResponses.push(baseResponse);
      }
    }

    // Parse indicator_scores safely
    let parsedIndicatorScores = {};
    if (assessment.indicator_scores) {
      try {
        let scores = assessment.indicator_scores;
        if (typeof scores === 'string') {
          scores = JSON.parse(scores);
        }
        parsedIndicatorScores = scores;
      } catch (e) {
        console.error('Error parsing indicator_scores:', e);
      }
    }

    res.json({
      success: true,
      assessment: {
        ...assessment,
        indicator_scores: parsedIndicatorScores,
        dynamic_responses: parsedResponses
      }
    });
  } catch (err) {
    console.error('Get full assessment error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to load assessment',
      details: err instanceof Error ? err.message : 'Unknown error'
    });
  }
}

// ============================================
// Get assessment statistics
// ============================================
export async function getAssessmentStats(req: Request, res: Response) {
  try {
    const { agencyId } = req.params;
    const db = getDB();
    
    const assessments = await allAsync<AssessmentRow>(
      db,
      `SELECT * FROM assessments WHERE agency_id = $1 ORDER BY fiscal_year DESC`,
      [agencyId]
    );

    const dynamicResponses = await allAsync<any>(
      db,
      `SELECT COUNT(*) as count FROM dynamic_assessment_responses dar
       JOIN assessments a ON dar.assessment_id = a.id
       WHERE a.agency_id = $1`,
      [agencyId]
    );

    res.json({
      success: true,
      data: {
        total_assessments: assessments.length,
        dynamic_responses_count: dynamicResponses[0]?.count || 0,
        assessments: assessments.map(assessment => ({
          fiscal_year: assessment.fiscal_year,
          status: assessment.status,
          overall_score: assessment.overall_score,
          finalized_at: assessment.finalized_at,
          finalized_by: assessment.finalized_by,
          last_updated: assessment.updated_at
        }))
      }
    });
  } catch (err) {
    console.error('Get assessment stats error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to load assessment statistics',
      details: err instanceof Error ? err.message : 'Unknown error'
    });
  }
}

// ============================================
// Generate form for assessment
// ============================================
export async function generateAssessmentForm(req: Request, res: Response) {
  try {
    const { templateId, agencyId, indicatorId } = req.query;
    
    if (!templateId && !indicatorId) {
      return res.status(400).json({
        success: false,
        error: 'Either templateId or indicatorId is required'
      });
    }

    let effectiveTemplateId: string | null = null;

    if (templateId) {
      effectiveTemplateId = templateId as string;
    } else if (indicatorId) {
      effectiveTemplateId = await findTemplateForIndicator(indicatorId as string);
      if (!effectiveTemplateId) {
        return res.status(404).json({
          success: false,
          error: 'No form template found for this indicator'
        });
      }
    }

    if (!effectiveTemplateId) {
      return res.status(400).json({
        success: false,
        error: 'Could not determine template ID'
      });
    }

    const form = await FormGenerator.generateForm(effectiveTemplateId);

    let existingResponses: Record<string, any> = {};

    if (agencyId) {
      const db = getDB();
      const currentYear = new Date().getFullYear();
      const fiscalYear = `${currentYear}–${currentYear + 1}`;

      const assessment = await getAsync<AssessmentRow>(
        db,
        `SELECT id FROM assessments WHERE agency_id = $1 AND fiscal_year = $2`,
        [agencyId, fiscalYear]
      );

      if (assessment) {
        const responses = await allAsync<any>(
          db,
          `SELECT indicator_id, response_data FROM dynamic_assessment_responses
           WHERE assessment_id = $1`,
          [assessment.id]
        );

        responses.forEach(response => {
          if (response.response_data) {
            try {
              existingResponses[response.indicator_id] = JSON.parse(response.response_data);
            } catch (error) {
              console.error('Error parsing response data:', error);
            }
          }
        });
      }
    }

    res.json({
      success: true,
      data: {
        form,
        existingResponses,
        metadata: {
          templateId: effectiveTemplateId,
          agencyId,
          indicatorId,
          generatedAt: new Date().toISOString()
        }
      }
    });
  } catch (err) {
    console.error('Generate assessment form error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to generate assessment form',
      details: err instanceof Error ? err.message : 'Unknown error'
    });
  }
}

// ============================================
// Validate form data
// ============================================
export async function validateFormData(req: Request, res: Response) {
  try {
    const { indicatorId, formData } = req.body;
    
    if (!indicatorId || !formData) {
      return res.status(400).json({
        success: false,
        error: 'indicatorId and formData are required'
      });
    }

    const indicator = await IndicatorConfig.getById(indicatorId);
    if (!indicator) {
      return res.status(404).json({
        success: false,
        error: 'Indicator not found'
      });
    }

    const validationResults: Array<{
      parameterCode: string;
      label: string;
      value: any;
      isValid: boolean;
      errors: string[];
      validationRules: any;
    }> = [];

    for (const parameter of indicator.parameters) {
      const value = formData[parameter.code];
      const errors: string[] = [];

      if (parameter.required && (value === undefined || value === null || value === '')) {
        errors.push(`${parameter.label} is required`);
      }

      if (value !== undefined && value !== null && value !== '') {
        switch (parameter.type) {
          case 'number':
            if (typeof value !== 'number') {
              errors.push(`${parameter.label} must be a number`);
            } else {
              if (parameter.validation?.min !== undefined && value < parameter.validation.min) {
                errors.push(`${parameter.label} must be at least ${parameter.validation.min}`);
              }
              if (parameter.validation?.max !== undefined && value > parameter.validation.max) {
                errors.push(`${parameter.label} must be at most ${parameter.validation.max}`);
              }
            }
            break;
          case 'select':
            if (parameter.options && !parameter.options.some((opt: any) => opt.value === value)) {
              errors.push(`${parameter.label} must be one of the available options`);
            }
            break;
          case 'checkbox':
          case 'boolean':
            if (typeof value !== 'boolean') {
              errors.push(`${parameter.label} must be true or false`);
            }
            break;
          case 'date':
            if (isNaN(Date.parse(value))) {
              errors.push(`${parameter.label} must be a valid date`);
            }
            break;
        }
      }

      validationResults.push({
        parameterCode: parameter.code,
        label: parameter.label,
        value,
        isValid: errors.length === 0,
        errors,
        validationRules: parameter.validation || {}
      });
    }

    const overallValid = validationResults.every(result => result.isValid);

    res.json({
      success: true,
      data: {
        indicatorId,
        indicatorName: indicator.name,
        overallValid,
        validationResults,
        parametersAssessed: validationResults.length,
        validParameters: validationResults.filter(r => r.isValid).length,
        invalidParameters: validationResults.filter(r => !r.isValid).length
      }
    });
  } catch (err) {
    console.error('Validate form data error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to validate form data',
      details: err instanceof Error ? err.message : 'Unknown error'
    });
  }
}

// ============================================
// Get agency report data
// ============================================
export async function getAgencyReport(req: Request, res: Response) {
  try {
    const { agencyId } = req.params;
    const db = getDB();
    const currentYear = new Date().getFullYear();
    const fiscalYear = `${currentYear}–${currentYear + 1}`;
    
    console.log('📊 Generating report for agency:', agencyId);

    const agency = await getAsync<any>(
      db,
      `SELECT * FROM agencies WHERE id = $1`,
      [agencyId]
    );

    if (!agency) {
      return res.status(404).json({
        success: false,
        error: 'Agency not found'
      });
    }

    const assessment = await getAsync<any>(
      db,
      `SELECT *, indicator_scores FROM assessments WHERE agency_id = $1 AND fiscal_year = $2`,
      [agencyId, fiscalYear]
    );

    if (!assessment) {
      return res.json({
        success: true,
        data: { 
          agency: {
            id: agency.id,
            name: agency.name,
            sector: agency.sector,
            contact_email: agency.contact_email,
            contact_phone: agency.contact_phone
          },
          assessment: {
            status: 'NOT_STARTED',
            fiscal_year: fiscalYear,
            finalized_at: null,
            finalized_by: null,
            officer_remarks: null
          },
          indicators: [],
          summary: {
            total_score: 0,
            total_max_score: 100,
            percentage: 0,
            integrity_level: 'Not Assessed',
            high_threshold: 80,
            medium_threshold: 50,
            indicators_completed: 0,
            total_indicators: 5
          }
        }
      });
    }

    // Get scores from indicator_scores column
    let indicatorScores: Record<string, number> = {};
    let iccsScore = 0, trainingScore = 0, adScore = 0, cocScore = 0, casesScore = 0;
    
    if (assessment.indicator_scores) {
      try {
        let savedScores = assessment.indicator_scores;
        if (typeof savedScores === 'string') {
          savedScores = JSON.parse(savedScores);
        }
        indicatorScores = savedScores;
        iccsScore = indicatorScores['ind_iccs_v3'] || 0;
        trainingScore = indicatorScores['ind_training_v3'] || 0;
        adScore = indicatorScores['ind_ad_v3'] || 0;
        cocScore = indicatorScores['ind_coc_v3'] || 0;
        casesScore = indicatorScores['ind_cases_v3'] || 0;
        console.log('📊 Loaded scores from indicator_scores:', indicatorScores);
      } catch (e) {
        console.error('Error parsing indicator_scores:', e);
      }
    }

    const totalScore = iccsScore + trainingScore + adScore + cocScore + casesScore;
    const totalMaxScore = 100;
    const percentage = (totalScore / totalMaxScore) * 100;

    const highThreshold = 80;
    const mediumThreshold = 50;

    let integrityLevel = 'Needs Improvement';
    if (percentage >= highThreshold) integrityLevel = 'High Integrity';
    else if (percentage >= mediumThreshold) integrityLevel = 'Medium Integrity';

    const indicators = [
      {
        indicator_id: 'iccs',
        indicator_name: 'Internal Corruption Control Systems (ICCS)',
        indicator_code: 'ICCS',
        category: 'Integrity Promotion',
        score: iccsScore,
        max_score: 32,
        percentage: parseFloat(((iccsScore / 32) * 100).toFixed(1))
      },
      {
        indicator_id: 'training',
        indicator_name: 'Integrity Capacity Building',
        indicator_code: 'TRAINING',
        category: 'Integrity Promotion',
        score: trainingScore,
        max_score: 24,
        percentage: parseFloat(((trainingScore / 24) * 100).toFixed(1))
      },
      {
        indicator_id: 'ad',
        indicator_name: 'Asset Declaration Compliance',
        indicator_code: 'AD',
        category: 'Integrity Promotion',
        score: adScore,
        max_score: 14,
        percentage: parseFloat(((adScore / 14) * 100).toFixed(1))
      },
      {
        indicator_id: 'coc',
        indicator_name: 'Code of Conduct',
        indicator_code: 'COC',
        category: 'Integrity Promotion',
        score: cocScore,
        max_score: 10,
        percentage: parseFloat(((cocScore / 10) * 100).toFixed(1))
      },
      {
        indicator_id: 'cases',
        indicator_name: 'Corruption Case Severity',
        indicator_code: 'CASES',
        category: 'Corruption Accountability',
        score: casesScore,
        max_score: 20,
        percentage: parseFloat(((casesScore / 20) * 100).toFixed(1))
      }
    ];

    res.json({
      success: true,
      data: {
        agency: {
          id: agency.id,
          name: agency.name,
          sector: agency.sector,
          contact_email: agency.contact_email,
          contact_phone: agency.contact_phone
        },
        assessment: {
          id: assessment.id,
          status: assessment.status,
          fiscal_year: assessment.fiscal_year,
          finalized_at: assessment.finalized_at,
          finalized_by: assessment.finalized_by,
          officer_remarks: assessment.officer_remarks,
          overall_score: totalScore
        },
        indicators: indicators,
        summary: {
          total_score: totalScore,
          total_max_score: totalMaxScore,
          percentage: parseFloat(percentage.toFixed(1)),
          integrity_level: integrityLevel,
          high_threshold: highThreshold,
          medium_threshold: mediumThreshold,
          indicators_completed: indicators.filter(i => i.score > 0).length,
          total_indicators: indicators.length
        }
      }
    });
  } catch (error) {
    console.error('❌ Error generating agency report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate agency report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// ============================================
// Get summary report for all agencies
// ============================================
export async function getSummaryReport(req: Request, res: Response) {
  try {
    const { fiscal_year } = req.query;
    const db = getDB();
    const fiscalYearParam = (req.query.fiscal_year || req.query.fy) as string;
const targetFiscalYear = fiscalYearParam || `${new Date().getFullYear()}–${new Date().getFullYear() + 1}`;
    
    console.log('📊 Generating summary report for fiscal year:', targetFiscalYear);

    // Fetch all active agencies
    const agencies = await allAsync<any>(
      db,
      `SELECT id, name, sector, contact_email, contact_phone, status 
       FROM agencies 
       WHERE status = 'active' 
       ORDER BY name`,
      []
    );

    if (!agencies || agencies.length === 0) {
      return res.json({
        success: true,
        data: {
          fiscal_year: targetFiscalYear,
          agencies: [],
          summary: {
            total_agencies: 0,
            total_completed: 0,
            average_score: 0,
            integrity_breakdown: {
              high: 0,
              medium: 0,
              low: 0
            },
            sector_breakdown: {}
          }
        }
      });
    }

    // Fetch assessments for all agencies
    const assessments = await allAsync<any>(
      db,
      `SELECT agency_id, overall_score, status, finalized_at, indicator_scores 
       FROM assessments 
       WHERE fiscal_year = $1 AND status = 'FINALIZED'`,
      [targetFiscalYear]
    );

    // Create a map of scores by agency
    const scoreMap = new Map();
    assessments.forEach(assessment => {
      scoreMap.set(assessment.agency_id, {
        overall_score: assessment.overall_score || 0,
        status: assessment.status,
        finalized_at: assessment.finalized_at,
        indicator_scores: assessment.indicator_scores
      });
    });

    // Get thresholds from system_config
    let highThreshold = 80;
    let mediumThreshold = 50;
    
    try {
      const highConfig = await getAsync<any>(
        db,
        `SELECT config_value FROM system_config WHERE config_key = $1`,
        ['integrity.threshold.high']
      );
      if (highConfig && highConfig.config_value) {
        highThreshold = Number(highConfig.config_value);
      }
      
      const mediumConfig = await getAsync<any>(
        db,
        `SELECT config_value FROM system_config WHERE config_key = $1`,
        ['integrity.threshold.medium']
      );
      if (mediumConfig && mediumConfig.config_value) {
        mediumThreshold = Number(mediumConfig.config_value);
      }
    } catch (error) {
      console.warn('Could not fetch thresholds, using defaults:', error);
    }

    // Build agency data with scores
    const agencyData = [];
    let totalScoreSum = 0;
    let completedCount = 0;
    let highCount = 0, mediumCount = 0, lowCount = 0;
    const sectorStats: Record<string, { count: number; scoreSum: number }> = {};

    for (const agency of agencies) {
      const assessment = scoreMap.get(agency.id);
      const overallScore = assessment?.overall_score || 0;
      const hasAssessment = !!assessment;
      
      if (hasAssessment) {
        completedCount++;
        totalScoreSum += overallScore;
        
        // Count integrity levels
        if (overallScore >= highThreshold) highCount++;
        else if (overallScore >= mediumThreshold) mediumCount++;
        else lowCount++;
      }
      
      // Sector breakdown
      if (!sectorStats[agency.sector]) {
        sectorStats[agency.sector] = { count: 0, scoreSum: 0 };
      }
      sectorStats[agency.sector].count++;
      if (hasAssessment) {
        sectorStats[agency.sector].scoreSum += overallScore;
      }
      
      // Determine integrity level
      let integrityLevel = 'Not Assessed';
      if (hasAssessment) {
        if (overallScore >= highThreshold) integrityLevel = 'High Integrity';
        else if (overallScore >= mediumThreshold) integrityLevel = 'Medium Integrity';
        else integrityLevel = 'Needs Improvement';
      }
      
      agencyData.push({
        agency_id: agency.id,
        agency_name: agency.name,
        sector: agency.sector,
        contact_email: agency.contact_email,
        contact_phone: agency.contact_phone,
        overall_score: overallScore,
        integrity_level: integrityLevel,
        status: assessment?.status || 'NOT_STARTED',
        finalized_at: assessment?.finalized_at || null
      });
    }

    // Calculate sector averages
    const sectorBreakdown = Object.entries(sectorStats).map(([sector, stats]) => ({
      sector,
      agency_count: stats.count,
      assessed_count: stats.scoreSum > 0 ? stats.count : 0,
      average_score: stats.scoreSum > 0 ? parseFloat((stats.scoreSum / stats.count).toFixed(1)) : 0
    }));

    const averageScore = completedCount > 0 ? parseFloat((totalScoreSum / completedCount).toFixed(1)) : 0;

    res.json({
      success: true,
      data: {
        fiscal_year: targetFiscalYear,
        generated_at: new Date().toISOString(),
        thresholds: {
          high: highThreshold,
          medium: mediumThreshold
        },
        agencies: agencyData,
        summary: {
          total_agencies: agencies.length,
          total_assessed: completedCount,
          total_not_assessed: agencies.length - completedCount,
          average_score: averageScore,
          integrity_breakdown: {
            high: highCount,
            medium: mediumCount,
            low: lowCount,
            not_assessed: agencies.length - completedCount
          },
          sector_breakdown: sectorBreakdown
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error generating summary report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate summary report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}