// backend/src/controllers/assessmentController.ts - COMPLETE FIXED VERSION
import { Request, Response } from 'express';
import { getDB, getAsync, allAsync, runAsync } from '../models/db';
import { FormGenerator } from '../utils/FormGenerator';
import { IndicatorConfig } from '../models/IndicatorConfig';
import { FormTemplate } from '../models/FormTemplate';
import crypto from 'crypto';

// Database row types
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

// Types for request body
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

// Generate simple UUID-like string
function generateId(): string {
  return [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
}

// Helper function for audit logging
async function logAssessmentAction(
  action: string,
  agencyId: string,
  userId: string,
  details: any
) {
  try {
    const db = getDB();
  try {
    await runAsync(
      db,
      `INSERT INTO audit_logs (id, action, user_id, agency_id, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?)`,
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

// Helper function to find template for an indicator
async function findTemplateForIndicator(indicatorId: string): Promise<string | null> {
  try {
    const db = getDB();
  try {
    // First, try to find templates by indicatorIds array
    const templates = await allAsync<any>(
      db,
      `SELECT id FROM form_templates
      WHERE is_active = 1
      AND template_type IN ('assessment', 'custom')
      ORDER BY created_at DESC`
    );

    // Check each template for the indicator
    for (const template of templates) {
      const templateData = await FormTemplate.getById(template.id);
      if (templateData && templateData.indicatorIds.includes(indicatorId)) {
        return template.id;
      }
    }

    // If no template found, try to find a default template for the indicator's category
    const indicator = await IndicatorConfig.getById(indicatorId);
    if (indicator) {
      const defaultTemplates = await allAsync<any>(
        db,
        `SELECT id FROM form_templates
        WHERE is_active = 1
        AND template_type = 'assessment'
        AND (ui_config LIKE ? OR metadata LIKE ?)
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

// Helper function to get all indicators
async function getAllIndicators(db: any) {
  try {
    const indicators = await allAsync<any>(
      db,
      `SELECT id, code, name FROM indicators LIMIT 10`
    );
    return indicators;
  } catch (error) {
    return [];
  }
}

// Helper function to calculate AIMS score from form data
function calculateAIMSScore(formData: any): number {
  console.log('🧮 Calculating AIMS score from form data');
  
  // Extract the nested indicator data if it exists
  let data = formData;
  
  // Check if data is nested under an indicator ID
  for (const key in formData) {
    if (typeof formData[key] === 'object' && formData[key] !== null) {
      if (formData[key].complaint_level !== undefined) {
        data = formData[key];
        console.log('📦 Found nested indicator data under key:', key);
        break;
      }
    }
  }
  
  // If we couldn't find nested data, try using formData directly
  if (data === formData) {
    console.log('📦 Using top-level form data');
  }
  
  // ICCS Score (32 points)
  const complaintLevel = Number(data.complaint_level) || 0;
  const coiLevel = Number(data.coi_level) || 0;
  const giftLevel = Number(data.gift_level) || 0;
  
  const iccsScore = (complaintLevel * 4) + (coiLevel * 4) + (giftLevel * 4);
  console.log('📊 ICCS Score:', { complaintLevel, coiLevel, giftLevel, iccsScore });
  
  // Training Score (24 points)
  const totalEmployees = Number(data.total_employees) || 0;
  const completedEmployees = Number(data.completed_employees) || 0;
  let trainingScore = 0;
  
  if (totalEmployees > 0) {
    const trainingPercent = (completedEmployees / totalEmployees) * 100;
    if (trainingPercent >= 85) trainingScore = 24;
    else if (trainingPercent >= 70) trainingScore = 18;
    else if (trainingPercent >= 50) trainingScore = 10;
    console.log('📊 Training Score:', { totalEmployees, completedEmployees, trainingPercent, trainingScore });
  }
  
  // AD Score (14 points)
  const totalOfficials = Number(data.total_covered_officials) || 0;
  const submittedOfficials = Number(data.officials_submitted_on_time) || 0;
  let adScore = 0;
  
  if (totalOfficials > 0) {
    const adPercent = (submittedOfficials / totalOfficials) * 100;
    if (adPercent >= 100) adScore = 14;
    else if (adPercent >= 95) adScore = 10;
    else if (adPercent >= 90) adScore = 5;
    console.log('📊 AD Score:', { totalOfficials, submittedOfficials, adPercent, adScore });
  }
  
  // CoC Score (10 points)
  const cocLevel = Number(data.coc_level) || 0;
  const cocPoints: Record<number, number> = {0: 0, 1: 4, 2: 7, 3: 10};
  const cocScore = cocPoints[cocLevel] || 0;
  console.log('📊 CoC Score:', { cocLevel, cocScore });
  
  // Cases Score (20 points)
  const convictions = Number(data.conviction_cases) || 0;
  const prosecutions = Number(data.prosecution_cases) || 0;
  const adminActions = Number(data.admin_action_cases) || 0;
  const severityScore = (convictions * 3) + (prosecutions * 2) + (adminActions * 1);
  
  let casesScore = 0;
  if (severityScore === 0) casesScore = 20;
  else if (severityScore <= 2) casesScore = 12;
  else if (severityScore <= 4) casesScore = 6;
  
  console.log('📊 Cases Score:', { convictions, prosecutions, adminActions, severityScore, casesScore });
  
  const totalScore = iccsScore + trainingScore + adScore + cocScore + casesScore;
  console.log('📊 TOTAL AIMS SCORE:', totalScore);
  
  return totalScore;
}

// Get assessment progress for an agency
export async function getAssessmentProgress(req: Request, res: Response) {
  console.log('✅✅✅ getAssessmentProgress HIT!', req.params);
  try {
    const { agencyId } = req.params;
    console.log('Agency ID:', agencyId);
    const db = getDB();
  try {

    // Get assessment for current fiscal year
    const currentYear = new Date().getFullYear();
    const fiscalYear = `${currentYear}–${currentYear + 1}`;

    const assessment = await getAsync<AssessmentRow>(
      db,
      `SELECT * FROM assessments WHERE agency_id = ? AND fiscal_year = ?`,
      [agencyId, fiscalYear]
    );

    if (!assessment) {
      // Return default assessment if none exists
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

    // Get all dynamic assessment responses for this assessment
    const indicatorResponses = await allAsync<DynamicAssessmentResponseRow>(
      db,
      `SELECT * FROM dynamic_assessment_responses WHERE assessment_id = ?`,
      [assessment.id]
    );

    // Convert to indicator_scores object
    const indicator_scores: Record<string, number> = {};
    const response_data: Record<string, any> = {};

    indicatorResponses.forEach(response => {
      if (response.indicator_id) {
        indicator_scores[response.indicator_id] = response.final_score;
        // Parse response data if exists
        if (response.response_data) {
          try {
            response_data[response.indicator_id] = JSON.parse(response.response_data);
          } catch (error) {
            console.error('Error parsing response data:', error);
          }
        }
      }
    });

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

// Save single indicator assessment WITH DYNAMIC SCORING - FIXED INDICATOR MAPPING
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

    // Map frontend indicator IDs to actual database IDs
    const indicatorIdMap: Record<string, string> = {
      'aims-assessment': 'ind_1770114038668_i6jrig8sz', // ICCS
      'iccs': 'ind_1770114038668_i6jrig8sz',
      'ind_iccs': 'ind_1770114038668_i6jrig8sz',
      'training': 'ind_1770114038672_noe0zgtjx',
      'ind_training': 'ind_1770114038672_noe0zgtjx',
      'capacity': 'ind_1770114038672_noe0zgtjx',
      'ad': 'ind_1770114038673_zuella44q',
      'ind_ad': 'ind_1770114038673_zuella44q',
      'asset_declaration': 'ind_1770114038673_zuella44q',
      'cases': 'ind_1770114038674_x4z2r2vjh',
      'ind_cases': 'ind_1770114038674_x4z2r2vjh',
      'corruption_cases': 'ind_1770114038674_x4z2r2vjh',
      'coc': 'ind_coc',
      'ind_coc': 'ind_coc',
      'code_of_conduct': 'ind_coc',
    };

    // Use the mapped ID or fall back to the original
    const dbIndicatorId = indicatorIdMap[indicatorId] || indicatorId;
    console.log('🔍 Mapped indicator ID:', { original: indicatorId, mapped: dbIndicatorId });

    const db = getDB();
  try {
    const currentYear = new Date().getFullYear();
    const fiscalYear = `${currentYear}–${currentYear + 1}`;
    const userId = (req as any).user?.id || 'system';

    // Check if the mapped indicator exists
    const indicatorExists = await getAsync<any>(
      db,
      `SELECT id FROM indicators WHERE id = ?`,
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

    // Try to get indicator configuration
    let indicator: any = null;
    try {
      indicator = await IndicatorConfig.getById(dbIndicatorId);
    } catch (error) {
      console.warn(`Indicator ${dbIndicatorId} not found in IndicatorConfig, using defaults`);
    }

    // Calculate score using FormGenerator if responseData is provided
    let calculatedScore = score || 0;
    let scoringBreakdown: any[] = [];

    // Calculate AIMS score from the form data
    const aimsTotalScore = calculateAIMSScore(responseData);
    console.log('🎯 Calculated AIMS total score:', aimsTotalScore);

    if (responseData && Object.keys(responseData).length > 0) {
      try {
        // Find or use provided template
        let effectiveTemplateId: string | null | undefined = templateId;
        if (!effectiveTemplateId) {
          effectiveTemplateId = await findTemplateForIndicator(dbIndicatorId);
        }

        if (effectiveTemplateId) {
          // Use FormGenerator for dynamic scoring
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
        // Fall back to manual score if dynamic scoring fails
      }
    }

    // Use the calculated AIMS score as the final score for this indicator
    const finalScore = aimsTotalScore > 0 ? aimsTotalScore : calculatedScore;
    console.log('✅ Using final score:', finalScore);

    // Check if assessment exists
    let assessment = await getAsync<AssessmentRow>(
      db,
      `SELECT * FROM assessments WHERE agency_id = ? AND fiscal_year = ?`,
      [agency_id, fiscalYear]
    );

    let assessmentId: string;
    let overallStatus: string = 'IN_PROGRESS';

    if (!assessment) {
      // Create new assessment
      assessmentId = generateId();
      await runAsync(
        db,
        `INSERT INTO assessments (
          id, agency_id, fiscal_year, status, overall_score,
          assigned_officer_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
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

      // Check if assessment is finalized and locked
      if (assessment.status === 'FINALIZED' && !assessment.unlocked_at) {
        return res.status(400).json({
          success: false,
          error: 'Assessment is finalized and locked. Unlock it first to make changes.',
          assessment
        });
      }

      // Update assessment timestamp
      await runAsync(
        db,
        `UPDATE assessments SET updated_at = ? WHERE id = ?`,
        [new Date().toISOString(), assessmentId]
      );
    }

    // Check if dynamic assessment response exists
    const existingResponse = await getAsync<DynamicAssessmentResponseRow>(
      db,
      `SELECT * FROM dynamic_assessment_responses WHERE assessment_id = ? AND indicator_id = ?`,
      [assessmentId, dbIndicatorId]
    );

    if (!existingResponse) {
      // Create new dynamic assessment response with calculated score
      await runAsync(
        db,
        `INSERT INTO dynamic_assessment_responses (
          id, assessment_id, indicator_id, response_data,
          calculated_score, manual_score, final_score,
          evidence_files, comments, created_at, updated_at, is_locked
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          generateId(),
          assessmentId,
          dbIndicatorId,
          JSON.stringify(responseData || {}),
          calculatedScore,
          score || null,
          finalScore,
          JSON.stringify([]),
          JSON.stringify({...scoringBreakdown, aimsTotal: aimsTotalScore}),
          new Date().toISOString(),
          new Date().toISOString(),
          0
        ]
      );
      console.log('✅ Created new response for indicator:', dbIndicatorId, 'with score:', finalScore);
    } else {
      // Check if response is locked
      if (existingResponse.is_locked && !existingResponse.unlocked_at) {
        return res.status(400).json({
          success: false,
          error: 'This indicator response is locked. Unlock the assessment first.',
          response: existingResponse
        });
      }

      // Update existing dynamic assessment response
      await runAsync(
        db,
        `UPDATE dynamic_assessment_responses SET
          response_data = ?,
          calculated_score = ?,
          manual_score = ?,
          final_score = ?,
          comments = ?,
          updated_at = ?,
          is_locked = ?
        WHERE assessment_id = ? AND indicator_id = ?`,
        [
          JSON.stringify(responseData || {}),
          calculatedScore,
          existingResponse.manual_score || score || null,
          finalScore,
          JSON.stringify({...scoringBreakdown, aimsTotal: aimsTotalScore}),
          new Date().toISOString(),
          existingResponse.is_locked || 0,
          assessmentId,
          dbIndicatorId
        ]
      );
      console.log('✅ Updated response for indicator:', dbIndicatorId, 'with score:', finalScore);
    }

    // Calculate overall score from all responses
    const allResponses = await allAsync<any>(
      db,
      `SELECT final_score FROM dynamic_assessment_responses WHERE assessment_id = ?`,
      [assessmentId]
    );

    const totalScore = allResponses.reduce((sum, res) => sum + (res.final_score || 0), 0);
    const responseCount = allResponses.length;
    const overallScore = responseCount > 0 ? totalScore / responseCount : 0;

    console.log('📊 Overall score calculation:', { totalScore, responseCount, overallScore });

    // Update assessment overall score and status
    await runAsync(
      db,
      `UPDATE assessments SET
        overall_score = ?,
        status = ?,
        updated_at = ?
      WHERE id = ?`,
      [
        overallScore,
        overallStatus,
        new Date().toISOString(),
        assessmentId
      ]
    );

    // Get updated assessment
    const updatedAssessment = await getAsync<AssessmentRow>(
      db,
      `SELECT * FROM assessments WHERE id = ?`,
      [assessmentId]
    );

    // Get indicator details for response (if available)
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
        manualScore: score || null,
        finalScore,
        aimsTotal: aimsTotalScore,
        breakdown: scoringBreakdown
      },
      message: 'Assessment saved successfully'
    });
  } catch (err) {
    console.error('❌ Save indicator assessment error:', err);
    console.error('❌ Error stack:', err instanceof Error ? err.stack : 'No stack trace');
    
    // Check for foreign key constraint error
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

// Save all assessments at once WITH DYNAMIC SCORING
export async function saveAllAssessments(req: Request, res: Response) {
  try {
    const { agency_id, indicator_scores, response_data, status } = req.body as SaveAllAssessmentBody;

    if (!agency_id || !indicator_scores) {
      return res.status(400).json({
        success: false,
        error: 'agency_id and indicator_scores are required'
      });
    }

    console.log('saveAllAssessments called with:', { agency_id, indicatorCount: Object.keys(indicator_scores).length, status });

    const db = getDB();
  try {
    const currentYear = new Date().getFullYear();
    const fiscalYear = `${currentYear}–${currentYear + 1}`;
    const userId = (req as any).user?.id || 'system';

    // Map frontend indicator IDs to actual database IDs
    const indicatorIdMap: Record<string, string> = {
      'aims-assessment': 'ind_1770114038668_i6jrig8sz',
      'iccs': 'ind_1770114038668_i6jrig8sz',
      'training': 'ind_1770114038672_noe0zgtjx',
      'ad': 'ind_1770114038673_zuella44q',
      'cases': 'ind_1770114038674_x4z2r2vjh',
      'coc': 'ind_coc',
    };

    // Check if assessment exists
    let assessment = await getAsync<AssessmentRow>(
      db,
      `SELECT * FROM assessments WHERE agency_id = ? AND fiscal_year = ?`,
      [agency_id, fiscalYear]
    );

    let assessmentId: string;
    let overallStatus = status || 'IN_PROGRESS';

    if (!assessment) {
      // Create new assessment
      assessmentId = generateId();
      await runAsync(
        db,
        `INSERT INTO assessments (
          id, agency_id, fiscal_year, status, overall_score,
          assigned_officer_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
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
      console.log('Created new assessment:', assessmentId);
    } else {
      assessmentId = assessment.id;
      // Check if assessment is finalized and locked
      if (assessment.status === 'FINALIZED' && !assessment.unlocked_at) {
        return res.status(400).json({
          success: false,
          error: 'Assessment is finalized and locked. Unlock it first to make changes.',
          assessment
        });
      }
      // Update assessment status
      await runAsync(
        db,
        `UPDATE assessments SET
          status = ?,
          updated_at = ?
        WHERE id = ?`,
        [
          overallStatus,
          new Date().toISOString(),
          assessmentId
        ]
      );
      console.log('Updated existing assessment:', assessmentId);
    }

    // Save/update each indicator in dynamic_assessment_responses
    let totalScore: number = 0;
    let indicatorCount: number = 0;
    const scoringResults: Record<string, any> = {};

    for (const [indicatorId, manualScore] of Object.entries(indicator_scores)) {
      const dbIndicatorId = indicatorIdMap[indicatorId] || indicatorId;
      const responseData = response_data?.[indicatorId] || {};
      
      // Calculate AIMS score if this is the main assessment
      let finalScore = manualScore;
      if (indicatorId === 'aims-assessment' || indicatorId === 'iccs') {
        finalScore = calculateAIMSScore(responseData);
        console.log(`🎯 Calculated AIMS score for ${indicatorId}:`, finalScore);
      }
      
      totalScore += finalScore;
      indicatorCount++;

      // Check if dynamic assessment response exists
      const existingResponse = await getAsync<DynamicAssessmentResponseRow>(
        db,
        `SELECT id, is_locked, unlocked_at FROM dynamic_assessment_responses WHERE assessment_id = ? AND indicator_id = ?`,
        [assessmentId, dbIndicatorId]
      );

      if (!existingResponse) {
        // Create new dynamic assessment response
        await runAsync(
          db,
          `INSERT INTO dynamic_assessment_responses (
            id, assessment_id, indicator_id, response_data,
            calculated_score, manual_score, final_score,
            comments, created_at, updated_at, is_locked
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            generateId(),
            assessmentId,
            dbIndicatorId,
            JSON.stringify(responseData),
            finalScore,
            manualScore,
            finalScore,
            JSON.stringify({ method: 'calculated' }),
            new Date().toISOString(),
            new Date().toISOString(),
            0
          ]
        );
      } else {
        // Update existing dynamic assessment response
        await runAsync(
          db,
          `UPDATE dynamic_assessment_responses SET
            response_data = ?,
            calculated_score = ?,
            manual_score = ?,
            final_score = ?,
            comments = ?,
            updated_at = ?,
            is_locked = ?
          WHERE assessment_id = ? AND indicator_id = ?`,
          [
            JSON.stringify(responseData),
            finalScore,
            manualScore,
            finalScore,
            JSON.stringify({ method: 'calculated' }),
            new Date().toISOString(),
            existingResponse.is_locked || 0,
            assessmentId,
            dbIndicatorId
          ]
        );
      }
      
      scoringResults[indicatorId] = { finalScore };
    }

    // Calculate overall score
    const overallScore = indicatorCount > 0 ? totalScore / indicatorCount : 0;

    // Update assessment overall score
    await runAsync(
      db,
      `UPDATE assessments SET
        overall_score = ?,
        updated_at = ?
      WHERE id = ?`,
      [
        overallScore,
        new Date().toISOString(),
        assessmentId
      ]
    );

    // Get updated assessment
    const updatedAssessment = await getAsync<AssessmentRow>(
      db,
      `SELECT * FROM assessments WHERE id = ?`,
      [assessmentId]
    );

    console.log('saveAllAssessments completed successfully:', {
      assessmentId,
      overallScore,
      indicatorCount,
      scoringResults
    });

    res.json({
      success: true,
      assessment: updatedAssessment,
      scoringResults,
      overallScore,
      message: `All assessments saved successfully.`
    });
  } catch (err) {
    console.error('Save all assessments error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to save assessments',
      details: err instanceof Error ? err.message : 'Unknown error'
    });
  }
}

// Calculate score for specific indicator using DYNAMIC FORM GENERATOR
export async function calculateIndicatorScore(req: Request, res: Response) {
  try {
    const { indicatorId, responseData, templateId } = req.body;

    if (!indicatorId || !responseData) {
      return res.status(400).json({
        success: false,
        error: 'indicatorId and responseData are required'
      });
    }

    // Get indicator configuration
    const indicator = await IndicatorConfig.getById(indicatorId);
    if (!indicator) {
      return res.status(404).json({
        success: false,
        error: 'Indicator not found'
      });
    }

    // Find template if not provided
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

    // Use FormGenerator for dynamic scoring
    const scoreResult = await FormGenerator.calculateScore(responseData, effectiveTemplateId);

    // Find this indicator's score in the breakdown
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

// Submit assessment for validation
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
  try {
    const currentYear = new Date().getFullYear();
    const fiscalYear = `${currentYear}–${currentYear + 1}`;

    // Check if assessment exists
    const assessment = await getAsync<AssessmentRow>(
      db,
      `SELECT * FROM assessments WHERE agency_id = ? AND fiscal_year = ?`,
      [agency_id, fiscalYear]
    );

    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: 'Assessment not found'
      });
    }

    // Update assessment status and submission time
    await runAsync(
      db,
      `UPDATE assessments SET
        status = 'SUBMITTED',
        submitted_at = ?,
        updated_at = ?
      WHERE id = ?`,
      [
        submitted_at || new Date().toISOString(),
        new Date().toISOString(),
        assessment.id
      ]
    );

    // Get updated assessment
    const updatedAssessment = await getAsync<AssessmentRow>(
      db,
      `SELECT * FROM assessments WHERE id = ?`,
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

// Validate assessment
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
  try {
    const currentYear = new Date().getFullYear();
    const fiscalYear = `${currentYear}–${currentYear + 1}`;

    // Check if assessment exists and is submitted
    const assessment = await getAsync<AssessmentRow>(
      db,
      `SELECT * FROM assessments WHERE agency_id = ? AND fiscal_year = ? AND status = 'SUBMITTED'`,
      [agencyId, fiscalYear]
    );

    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: 'Submitted assessment not found'
      });
    }

    // Update assessment status to validated
    await runAsync(
      db,
      `UPDATE assessments SET
        status = 'VALIDATED',
        validated_at = ?,
        validated_by = ?,
        updated_at = ?
      WHERE id = ?`,
      [
        new Date().toISOString(),
        validated_by || 'system',
        new Date().toISOString(),
        assessment.id
      ]
    );

    // Also validate all individual indicator responses
    await runAsync(
      db,
      `UPDATE dynamic_assessment_responses SET
        validated_by = ?,
        validated_at = ?,
        updated_at = ?
      WHERE assessment_id = ?`,
      [
        validated_by || 'system',
        new Date().toISOString(),
        new Date().toISOString(),
        assessment.id
      ]
    );

    // Get updated assessment
    const updatedAssessment = await getAsync<AssessmentRow>(
      db,
      `SELECT * FROM assessments WHERE id = ?`,
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

// Finalize assessment (lock scores)
export async function finalizeAssessment(req: Request, res: Response) {
  try {
    const { agencyId } = req.params;
    const { finalized_by, finalization_notes } = req.body;

    if (!agencyId || !finalized_by) {
      return res.status(400).json({
        success: false,
        error: 'agencyId and finalized_by are required'
      });
    }

    const db = getDB();
  try {
    const currentYear = new Date().getFullYear();
    const fiscalYear = `${currentYear}–${currentYear + 1}`;

    // Get current assessment
    let assessment = await getAsync<any>(
      db,
      `SELECT * FROM assessments WHERE agency_id = ? AND fiscal_year = ?`,
      [agencyId, fiscalYear]
    );

    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: 'Assessment not found'
      });
    }

    // Check if already finalized
    if (assessment.status === 'FINALIZED') {
      return res.status(400).json({
        success: false,
        error: 'Assessment is already finalized'
      });
    }

    const now = new Date().toISOString();

    // FIRST: Get all indicator responses for this assessment
    const indicatorResponses = await allAsync<any>(
      db,
      `SELECT * FROM dynamic_assessment_responses WHERE assessment_id = ?`,
      [assessment.id]
    );

    console.log(`📊 Found ${indicatorResponses.length} indicator responses to finalize`);

    // SECOND: Calculate overall score from responses
    let totalScore = 0;
    let responseCount = 0;
    
    for (const response of indicatorResponses) {
      // If final_score is 0, try to calculate it from response_data
      if (response.final_score === 0 || response.final_score === null) {
        try {
          const responseData = JSON.parse(response.response_data);
          const calculatedScore = calculateAIMSScore(responseData);
          
          // Update the response with calculated score
          await runAsync(
            db,
            `UPDATE dynamic_assessment_responses SET
              final_score = ?,
              updated_at = ?
            WHERE id = ?`,
            [calculatedScore, now, response.id]
          );
          
          totalScore += calculatedScore;
          console.log(`📊 Recalculated score for ${response.indicator_id}: ${calculatedScore}`);
        } catch (e) {
          console.error('Error parsing response data:', e);
          totalScore += 0;
        }
      } else {
        totalScore += response.final_score;
      }
      responseCount++;
    }

    const overallScore = responseCount > 0 ? totalScore / responseCount : 0;
    console.log('📊 Final overall score:', { totalScore, responseCount, overallScore });

    // THIRD: Lock all indicator responses
    if (indicatorResponses.length > 0) {
      await runAsync(
        db,
        `UPDATE dynamic_assessment_responses SET
          is_locked = 1,
          locked_at = ?,
          locked_by = ?,
          updated_at = ?
        WHERE assessment_id = ?`,
        [now, finalized_by, now, assessment.id]
      );
      console.log('✅ Locked all indicator responses');
    }

    // FOURTH: Update assessment status to FINALIZED with scores
    await runAsync(
      db,
      `UPDATE assessments SET
        status = 'FINALIZED',
        overall_score = ?,
        officer_remarks = ?,
        finalized_at = ?,
        finalized_by = ?,
        finalization_notes = ?,
        updated_at = ?
      WHERE id = ?`,
      [
        overallScore,
        finalization_notes || 'Assessment finalized',
        now,
        finalized_by,
        finalization_notes || 'Assessment finalized',
        now,
        assessment.id
      ]
    );

    // FIFTH: Get updated assessment
    const updatedAssessment = await getAsync<any>(
      db,
      `SELECT * FROM assessments WHERE id = ?`,
      [assessment.id]
    );

    const lockedCount = await getAsync<{ count: number }>(
      db,
      `SELECT COUNT(*) as count FROM dynamic_assessment_responses WHERE assessment_id = ? AND is_locked = 1`,
      [assessment.id]
    );

    console.log('✅ Finalization complete:', {
      assessmentId: assessment.id,
      status: updatedAssessment.status,
      overallScore: updatedAssessment.overall_score,
      lockedResponses: lockedCount?.count || 0
    });

    res.json({
      success: true,
      assessment: updatedAssessment,
      message: `Assessment finalized successfully with ${lockedCount?.count || 0} locked indicators`
    });

  } catch (err) {
    console.error('❌ Finalize assessment error:', err);
    console.error('❌ Error stack:', err instanceof Error ? err.stack : 'No stack trace');
    res.status(500).json({
      success: false,
      error: 'Failed to finalize assessment',
      details: err instanceof Error ? err.message : 'Unknown error'
    });
  }
}

// Unlock assessment
export async function unlockAssessment(req: Request, res: Response) {
  try {
    const { agencyId } = req.params;
    console.log('🟢 Backend received unlock request for agencyId:', agencyId);
    console.log('🟢 Backend request body:', req.body);
    const { unlocked_by, reason } = req.body;

    if (!agencyId || !unlocked_by || !reason) {
      return res.status(400).json({
        success: false,
        error: 'agencyId, unlocked_by, and reason are required'
      });
    }

    const db = getDB();
  try {
    const currentYear = new Date().getFullYear();
    const fiscalYear = `${currentYear}–${currentYear + 1}`;

    // Get current assessment
    const assessment = await getAsync<any>(
      db,
      `SELECT * FROM assessments WHERE agency_id = ? AND fiscal_year = ?`,
      [agencyId, fiscalYear]
    );

    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: 'Assessment not found'
      });
    }

    // Check if assessment is finalized
    if (assessment.status !== 'FINALIZED') {
      return res.status(400).json({
        success: false,
        error: 'Assessment is not finalized'
      });
    }

    const now = new Date().toISOString();

    // Update assessment status back to IN_PROGRESS and record unlock details
    await runAsync(
      db,
      `UPDATE assessments SET
        status = 'IN_PROGRESS',
        unlocked_at = ?,
        unlocked_by = ?,
        unlock_reason = ?,
        officer_remarks = ?,
        updated_at = ?
      WHERE id = ?`,
      [
        now,
        unlocked_by,
        reason,
        `Assessment unlocked: ${reason}`,
        now,
        assessment.id
      ]
    );

    // Also unlock all indicator responses
    await runAsync(
      db,
      `UPDATE dynamic_assessment_responses SET
        is_locked = 0,
        unlocked_at = ?,
        unlocked_by = ?,
        updated_at = ?
      WHERE assessment_id = ?`,
      [now, unlocked_by, now, assessment.id]
    );

    // Get updated assessment
    const updatedAssessment = await getAsync<any>(
      db,
      `SELECT * FROM assessments WHERE id = ?`,
      [assessment.id]
    );

    res.json({
      success: true,
      assessment: updatedAssessment,
      message: 'Assessment unlocked successfully'
    });
  } catch (err) {
    console.error('❌ Unlock assessment error:', err);
    console.error('❌ Error stack:', err instanceof Error ? err.stack : 'No stack trace');
    res.status(500).json({
      success: false,
      error: 'Failed to unlock assessment',
      details: err instanceof Error ? err.message : 'Unknown error'
    });
  }
}

// Get full assessment details (with all dynamic indicator responses)
export async function getFullAssessment(req: Request, res: Response) {
  try {
    const { agencyId } = req.params;
    const fiscalYear = (req.query.fy as string) || `${new Date().getFullYear()}–${new Date().getFullYear() + 1}`;

    const db = getDB();
  try {
    const assessment = await getAsync<AssessmentRow>(
      db,
      `SELECT * FROM assessments WHERE agency_id = ? AND fiscal_year = ?`,
      [agencyId, fiscalYear]
    );

    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: 'Assessment not found'
      });
    }

    // Get all dynamic assessment responses
    const indicatorResponses = await allAsync<DynamicAssessmentResponseRow>(
      db,
      `SELECT * FROM dynamic_assessment_responses WHERE assessment_id = ? ORDER BY created_at`,
      [assessment.id]
    );

    // Parse response data and enhance with indicator information
    const parsedResponses = await Promise.all(
      indicatorResponses.map(async (response) => {
        const baseResponse = {
          ...response,
          response_data: response.response_data ? JSON.parse(response.response_data) : {},
          evidence_files: response.evidence_files ? JSON.parse(response.evidence_files) : [],
          scoring_breakdown: response.comments ? JSON.parse(response.comments) : null
        };

        // Get indicator details
        try {
          const indicator = await IndicatorConfig.getById(response.indicator_id);
          if (indicator) {
            return {
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
            };
          }
        } catch (error) {
          console.error(`Error fetching indicator ${response.indicator_id}:`, error);
        }

        return baseResponse;
      })
    );

    res.json({
      success: true,
      assessment: {
        ...assessment,
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

// Get assessment statistics
export async function getAssessmentStats(req: Request, res: Response) {
  try {
    const { agencyId } = req.params;
    const db = getDB();
  try {

    // Get all assessments for this agency
    const assessments = await allAsync<AssessmentRow>(
      db,
      `SELECT * FROM assessments WHERE agency_id = ? ORDER BY fiscal_year DESC`,
      [agencyId]
    );

    // Get dynamic responses count
    const dynamicResponses = await allAsync<{ count: number }>(
      db,
      `SELECT COUNT(*) as count FROM dynamic_assessment_responses dar
      JOIN assessments a ON dar.assessment_id = a.id
      WHERE a.agency_id = ?`,
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

// Generate form for assessment using FormGenerator
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

    // Generate form using FormGenerator
    const form = await FormGenerator.generateForm(effectiveTemplateId);

    // If agencyId is provided, fetch any existing responses
    let existingResponses: Record<string, any> = {};

    if (agencyId) {
      const db = getDB();
  try {
      const currentYear = new Date().getFullYear();
      const fiscalYear = `${currentYear}–${currentYear + 1}`;

      const assessment = await getAsync<AssessmentRow>(
        db,
        `SELECT id FROM assessments WHERE agency_id = ? AND fiscal_year = ?`,
        [agencyId, fiscalYear]
      );

      if (assessment) {
        const responses = await allAsync<DynamicAssessmentResponseRow>(
          db,
          `SELECT indicator_id, response_data FROM dynamic_assessment_responses
          WHERE assessment_id = ?`,
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

// Validate form data against indicator parameters
export async function validateFormData(req: Request, res: Response) {
  try {
    const { indicatorId, formData } = req.body;

    if (!indicatorId || !formData) {
      return res.status(400).json({
        success: false,
        error: 'indicatorId and formData are required'
      });
    }

    // Get indicator configuration
    const indicator = await IndicatorConfig.getById(indicatorId);
    if (!indicator) {
      return res.status(404).json({
        success: false,
        error: 'Indicator not found'
      });
    }

    // Validate each parameter
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

      // Check required
      if (parameter.required && (value === undefined || value === null || value === '')) {
        errors.push(`${parameter.label} is required`);
      }

      // Type-specific validation
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
            if (parameter.options && !parameter.options.some(opt => opt.value === value)) {
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

// Get agency report data - FIXED VERSION with proper typing
export async function getAgencyReport(req: Request, res: Response) {
  try {
    const { agencyId } = req.params;
    const db = getDB();
  try {
    const currentYear = new Date().getFullYear();
    const fiscalYear = `${currentYear}–${currentYear + 1}`;

    console.log('📊 Generating report for agency:', agencyId, 'fiscal year:', fiscalYear);

    // Get agency details
    const agency = await getAsync<any>(
      db,
      `SELECT * FROM agencies WHERE id = ?`,
      [agencyId]
    );

    if (!agency) {
      return res.status(404).json({
        success: false,
        error: 'Agency not found'
      });
    }

    // Get assessment data
    const assessment = await getAsync<any>(
      db,
      `SELECT * FROM assessments WHERE agency_id = ? AND fiscal_year = ?`,
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

    // Get the response data
    const responses = await allAsync<any>(
      db,
      `SELECT * FROM dynamic_assessment_responses WHERE assessment_id = ?`,
      [assessment.id]
    );

    console.log('📊 Found responses:', responses.length);

    // Default values for all indicators
    let iccsScore = 0;
    let trainingScore = 0;
    let adScore = 0;
    let cocScore = 0;
    let casesScore = 0;

    if (responses.length > 0) {
      try {
        const responseData = JSON.parse(responses[0].response_data);
        console.log('📊 Parsed response data');
        
        // Extract the nested indicator data
        let indicatorData: any = responseData;
        
        // Look for nested data
        for (const key in responseData) {
          if (typeof responseData[key] === 'object' && responseData[key] !== null) {
            const nested = responseData[key] as any;
            if (nested.complaint_level !== undefined || 
                nested.total_employees !== undefined ||
                nested.coc_level !== undefined) {
              indicatorData = nested;
              console.log('📊 Found nested indicator data under key:', key);
              break;
            }
          }
        }

        // ICCS Score (32 points)
        const complaintLevel = Number(indicatorData?.complaint_level) || 0;
        const coiLevel = Number(indicatorData?.coi_level) || 0;
        const giftLevel = Number(indicatorData?.gift_level) || 0;
        iccsScore = (complaintLevel * 4) + (coiLevel * 4) + (giftLevel * 4);
        
        // Training Score (24 points)
        const totalEmployees = Number(indicatorData?.total_employees) || 0;
        const completedEmployees = Number(indicatorData?.completed_employees) || 0;
        if (totalEmployees > 0) {
          const trainingPercent = (completedEmployees / totalEmployees) * 100;
          if (trainingPercent >= 85) trainingScore = 24;
          else if (trainingPercent >= 70) trainingScore = 18;
          else if (trainingPercent >= 50) trainingScore = 10;
        }
        
        // AD Score (14 points)
        const totalOfficials = Number(indicatorData?.total_covered_officials) || 0;
        const submittedOfficials = Number(indicatorData?.officials_submitted_on_time) || 0;
        if (totalOfficials > 0) {
          const adPercent = (submittedOfficials / totalOfficials) * 100;
          if (adPercent >= 100) adScore = 14;
          else if (adPercent >= 95) adScore = 10;
          else if (adPercent >= 90) adScore = 5;
        }
        
        // CoC Score (10 points)
        const cocLevel = Number(indicatorData?.coc_level) || 0;
        const cocPoints: Record<number, number> = {0: 0, 1: 4, 2: 7, 3: 10};
        cocScore = cocPoints[cocLevel] || 0;
        
        // Cases Score (20 points)
        const convictions = Number(indicatorData?.conviction_cases) || 0;
        const prosecutions = Number(indicatorData?.prosecution_cases) || 0;
        const adminActions = Number(indicatorData?.admin_action_cases) || 0;
        const severityScore = (convictions * 3) + (prosecutions * 2) + (adminActions * 1);
        
        if (severityScore === 0) casesScore = 20;
        else if (severityScore <= 2) casesScore = 12;
        else if (severityScore <= 4) casesScore = 6;

      } catch (e) {
        console.error('Error parsing response data:', e);
      }
    }

    const totalScore = iccsScore + trainingScore + adScore + cocScore + casesScore;
    const totalMaxScore = 32 + 24 + 14 + 10 + 20; // 100 points total
    const percentage = (totalScore / totalMaxScore) * 100;

    console.log('📊 Indicator breakdown:', {
      iccs: { score: iccsScore, max: 32, percent: totalMaxScore > 0 ? (iccsScore/32)*100 : 0 },
      training: { score: trainingScore, max: 24, percent: totalMaxScore > 0 ? (trainingScore/24)*100 : 0 },
      ad: { score: adScore, max: 14, percent: totalMaxScore > 0 ? (adScore/14)*100 : 0 },
      coc: { score: cocScore, max: 10, percent: totalMaxScore > 0 ? (cocScore/10)*100 : 0 },
      cases: { score: casesScore, max: 20, percent: totalMaxScore > 0 ? (casesScore/20)*100 : 0 },
      total: { score: totalScore, max: totalMaxScore, percent: percentage }
    });

    // Get integrity thresholds
    const thresholds = await getAsync<any>(
      db,
      `SELECT 
        MAX(CASE WHEN config_key = 'integrity.threshold.high' THEN config_value END) as high_threshold,
        MAX(CASE WHEN config_key = 'integrity.threshold.medium' THEN config_value END) as medium_threshold
       FROM system_config`
    );

    const highThreshold = thresholds?.high_threshold ? Number(thresholds.high_threshold) : 80;
    const mediumThreshold = thresholds?.medium_threshold ? Number(thresholds.medium_threshold) : 50;
    
    let integrityLevel = 'Needs Improvement';
    if (percentage >= highThreshold) integrityLevel = 'High Integrity';
    else if (percentage >= mediumThreshold) integrityLevel = 'Medium Integrity';

    // Build indicators array with proper individual scores
    const indicators = [
      {
        indicator_id: 'iccs',
        indicator_name: 'Internal Corruption Control Systems (ICCS)',
        indicator_code: 'ICCS',
        category: 'Compliance',
        score: iccsScore,
        max_score: 32,
        percentage: parseFloat(((iccsScore / 32) * 100).toFixed(1))
      },
      {
        indicator_id: 'training',
        indicator_name: 'Integrity Capacity Building',
        indicator_code: 'TRAINING',
        category: 'Capacity',
        score: trainingScore,
        max_score: 24,
        percentage: parseFloat(((trainingScore / 24) * 100).toFixed(1))
      },
      {
        indicator_id: 'ad',
        indicator_name: 'Asset Declaration Compliance',
        indicator_code: 'AD',
        category: 'Compliance',
        score: adScore,
        max_score: 14,
        percentage: parseFloat(((adScore / 14) * 100).toFixed(1))
      },
      {
        indicator_id: 'coc',
        indicator_name: 'Code of Conduct',
        indicator_code: 'COC',
        category: 'Ethics',
        score: cocScore,
        max_score: 10,
        percentage: parseFloat(((cocScore / 10) * 100).toFixed(1))
      },
      {
        indicator_id: 'cases',
        indicator_name: 'Corruption Case Severity',
        indicator_code: 'CASES',
        category: 'Enforcement',
        score: casesScore,
        max_score: 20,
        percentage: parseFloat(((casesScore / 20) * 100).toFixed(1))
      }
    ];

    const response = {
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
    };

    console.log('📊 Report summary:', {
      totalScore,
      percentage,
      integrityLevel,
      indicatorsCompleted: response.data.summary.indicators_completed
    });

    res.json(response);
  } catch (error) {
    console.error('❌ Error generating agency report:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({
      success: false,
      error: 'Failed to generate agency report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}