// backend/src/controllers/submissionPipelineController.ts
import { Request, Response } from 'express';
import { getDB, getAsync, allAsync } from '../models/db';

// ============================================
// GET /api/reports/pipeline
// Description: Get submission pipeline data for the reports page
// ============================================
export const getSubmissionPipeline = async (req: Request, res: Response) => {
  try {
    const { fiscal_year } = req.query;
    const db = getDB();
    
    // Use provided fiscal year or default to current
    const currentYear = new Date().getFullYear();
    const defaultFy = `${currentYear}–${currentYear + 1}`;
    const targetFiscalYear = fiscal_year || defaultFy;
    
    console.log('📊 Fetching submission pipeline for FY:', targetFiscalYear);
    
    // Define status mappings for the pipeline stages
    const statusMappings = {
      draft: ['DRAFT', 'IN_PROGRESS', 'NOT_STARTED'],
      submitted: ['SUBMITTED_TO_AGENCY', 'SUBMITTED_TO_HOA', 'SUBMITTED_TO_ACC'],
      verified: ['AWAITING_VALIDATION', 'VALIDATED', 'COMPLETED'],
      final: ['FINALIZED']
    };
    
    // Get counts for each stage using assessments table
    const counts: Record<string, number> = { draft: 0, submitted: 0, verified: 0, final: 0 };
    
    for (const [stage, statuses] of Object.entries(statusMappings)) {
      try {
        const placeholders = statuses.map((_, index) => `$${index + 2}`).join(',');
        const query = `
          SELECT COUNT(DISTINCT a.agency_id) as count 
          FROM assessments a
          JOIN agencies ag ON a.agency_id = ag.id
          WHERE ag.status = 'active'
            AND a.fiscal_year = $1
            AND a.status IN (${placeholders})
        `;
        
        const params = [targetFiscalYear, ...statuses];
        const result = await getAsync<{ count: number }>(db, query, params);
        counts[stage] = result?.count || 0;
        console.log(`📊 Stage ${stage}: ${counts[stage]} agencies`);
      } catch (err) {
        console.error(`Error counting ${stage} assessments:`, err);
        counts[stage] = 0;
      }
    }
    
    // Get total active agencies
    const totalAgenciesResult = await getAsync<{ count: number }>(
      db,
      "SELECT COUNT(*) as count FROM agencies WHERE status = 'active'",
      []
    );
    const totalAgencies = totalAgenciesResult?.count || 0;
    
    // Also get agencies with no assessment record
    const noAssessmentResult = await getAsync<{ count: number }>(
      db,
      `SELECT COUNT(*) as count 
       FROM agencies a
       WHERE a.status = 'active'
         AND NOT EXISTS (
           SELECT 1 FROM assessments ass 
           WHERE ass.agency_id = a.id AND ass.fiscal_year = $1
         )`,
      [targetFiscalYear]
    );
    const noAssessmentCount = noAssessmentResult?.count || 0;
    
    // Add no-assessment agencies to draft count
    counts.draft += noAssessmentCount;
    
    const pipelineData = [
      { 
        stage: 'Draft', 
        count: counts.draft,
        percentage: totalAgencies > 0 ? Math.round((counts.draft / totalAgencies) * 100) : 0,
        description: 'Assessment in progress or not started'
      },
      { 
        stage: 'Submitted', 
        count: counts.submitted,
        percentage: totalAgencies > 0 ? Math.round((counts.submitted / totalAgencies) * 100) : 0,
        description: 'Submitted for review'
      },
      { 
        stage: 'Verified', 
        count: counts.verified,
        percentage: totalAgencies > 0 ? Math.round((counts.verified / totalAgencies) * 100) : 0,
        description: 'Verified and awaiting finalization'
      },
      { 
        stage: 'Final', 
        count: counts.final,
        percentage: totalAgencies > 0 ? Math.round((counts.final / totalAgencies) * 100) : 0,
        description: 'Finalized and locked'
      }
    ];
    
    const summary = {
      total_agencies: totalAgencies,
      completion_rate: totalAgencies > 0 ? Math.round((counts.final / totalAgencies) * 100) : 0,
      fiscal_year: targetFiscalYear,
      generated_at: new Date().toISOString()
    };
    
    console.log('📊 Pipeline summary:', summary);
    
    res.json({
      success: true,
      stages: pipelineData,
      summary,
      fiscal_year: targetFiscalYear
    });
    
  } catch (err) {
    console.error('Pipeline error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to load submission pipeline',
      details: err instanceof Error ? err.message : 'Unknown error'
    });
  }
};

// ============================================
// GET /api/submission-pipeline/status-breakdown
// ============================================
export const getStatusBreakdown = async (req: Request, res: Response) => {
  try {
    const { fiscal_year } = req.query;
    const db = getDB();
    const currentYear = new Date().getFullYear();
    const defaultFy = `${currentYear}–${currentYear + 1}`;
    const targetFiscalYear = fiscal_year || defaultFy;
    
    const statusBreakdown = await allAsync<any[]>(
      db,
      `SELECT 
        a.status,
        COUNT(DISTINCT a.id) as assessment_count,
        COUNT(DISTINCT a.agency_id) as agency_count,
        AVG(a.overall_score) as avg_score
       FROM assessments a
       JOIN agencies ag ON a.agency_id = ag.id
       WHERE ag.status = 'active'
         AND a.fiscal_year = $1
       GROUP BY a.status
       ORDER BY 
         CASE a.status
           WHEN 'NOT_STARTED' THEN 1
           WHEN 'DRAFT' THEN 2
           WHEN 'IN_PROGRESS' THEN 3
           WHEN 'COMPLETED' THEN 4
           WHEN 'SUBMITTED_TO_AGENCY' THEN 5
           WHEN 'SUBMITTED_TO_HOA' THEN 6
           WHEN 'SUBMITTED_TO_ACC' THEN 7
           WHEN 'AWAITING_VALIDATION' THEN 8
           WHEN 'VALIDATED' THEN 9
           WHEN 'FINALIZED' THEN 10
           ELSE 11
         END`,
      [targetFiscalYear]
    );
    
    res.json({
      success: true,
      data: statusBreakdown,
      fiscal_year: targetFiscalYear
    });
  } catch (err) {
    console.error('Status breakdown error:', err);
    res.status(500).json({ success: false, error: 'Failed to load status breakdown' });
  }
};

// ============================================
// GET /api/submission-pipeline/agency/:agencyId
// ============================================
export const getAgencyPipelineStatus = async (req: Request, res: Response) => {
  try {
    const { agencyId } = req.params;
    const { fiscal_year } = req.query;
    const db = getDB();
    const currentYear = new Date().getFullYear();
    const defaultFy = `${currentYear}–${currentYear + 1}`;
    const targetFiscalYear = fiscal_year || defaultFy;
    
    const assessment = await getAsync<any>(
      db,
      `SELECT 
        a.id,
        a.status,
        a.overall_score,
        a.submitted_at,
        a.validated_at,
        a.finalized_at,
        ag.name as agency_name,
        ag.sector as agency_sector
       FROM assessments a
       JOIN agencies ag ON a.agency_id = ag.id
       WHERE a.agency_id = $1 AND a.fiscal_year = $2`,
      [agencyId, targetFiscalYear]
    );
    
    if (!assessment) {
      return res.json({
        success: true,
        data: {
          status: 'NOT_STARTED',
          agency_id: agencyId,
          fiscal_year: targetFiscalYear,
          message: 'No assessment found for this agency'
        }
      });
    }
    
    const history = await allAsync<any[]>(
      db,
      `SELECT 
        action,
        created_at as timestamp,
        user_id as actor,
        details
       FROM audit_logs
       WHERE resource_type = 'assessment'
         AND resource_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [assessment.id]
    );
    
    res.json({
      success: true,
      data: {
        assessment,
        history,
        current_stage: getStageFromStatus(assessment.status),
        next_steps: getNextSteps(assessment.status)
      }
    });
  } catch (err) {
    console.error('Agency pipeline status error:', err);
    res.status(500).json({ success: false, error: 'Failed to load agency pipeline status' });
  }
};

// ============================================
// Helper functions
// ============================================
function getStageFromStatus(status: string): string {
  const stageMap: Record<string, string> = {
    'DRAFT': 'Draft',
    'IN_PROGRESS': 'Draft',
    'NOT_STARTED': 'Draft',
    'SUBMITTED_TO_AGENCY': 'Submitted',
    'SUBMITTED_TO_HOA': 'Submitted',
    'SUBMITTED_TO_ACC': 'Submitted',
    'AWAITING_VALIDATION': 'Verified',
    'VALIDATED': 'Verified',
    'COMPLETED': 'Verified',
    'FINALIZED': 'Final'
  };
  return stageMap[status] || status;
}

function getNextSteps(status: string): string[] {
  const stepsMap: Record<string, string[]> = {
    'DRAFT': ['Complete all indicator responses', 'Submit for review'],
    'IN_PROGRESS': ['Complete remaining indicators', 'Submit for review'],
    'NOT_STARTED': ['Start the assessment process', 'Complete indicator responses'],
    'SUBMITTED_TO_AGENCY': ['Awaiting Head of Agency review', 'Check for return comments'],
    'SUBMITTED_TO_HOA': ['Awaiting Head of Agency review', 'Check for return comments'],
    'SUBMITTED_TO_ACC': ['Awaiting ACC review', 'Check for validation'],
    'AWAITING_VALIDATION': ['Awaiting final validation', 'Score will be locked after validation'],
    'VALIDATED': ['Assessment ready for finalization', 'Click finalize to lock scores'],
    'COMPLETED': ['Assessment ready for finalization', 'Click finalize to lock scores'],
    'FINALIZED': ['Assessment complete', 'No further actions needed']
  };
  return stepsMap[status] || ['Continue with assessment process'];
}