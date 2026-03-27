// backend/src/controllers/submissionPipelineController.ts
import { Request, Response } from 'express';
import { getDB, getAsync, allAsync } from '../models/db';

// ============================================
// GET /api/submission-pipeline
// ============================================
export const getSubmissionPipeline = async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const fiscalYear = '2025-26';
    
    // Define status mappings for the pipeline stages
    // The actual status values in the database may be different
    const statusMappings = {
      draft: ['DRAFT', 'IN_PROGRESS', 'NOT_STARTED'],
      submitted: ['SUBMITTED_TO_AGENCY', 'SUBMITTED_TO_HOA', 'SUBMITTED_TO_ACC'],
      verified: ['AWAITING_VALIDATION', 'VALIDATED'],
      final: ['FINALIZED']
    };
    
    // Get counts for each stage using assessments table
    const counts: Record<string, number> = { draft: 0, submitted: 0, verified: 0, final: 0 };
    
    // Query counts from assessments table (more reliable than indicator_data)
    for (const [stage, statuses] of Object.entries(statusMappings)) {
      try {
        // Build query with IN clause for multiple statuses
        const placeholders = statuses.map(() => '?').join(',');
        const query = `
          SELECT COUNT(DISTINCT a.id) as count 
          FROM assessments a
          JOIN agencies ag ON a.agency_id = ag.id
          WHERE ag.status = 'active'
            AND a.fiscal_year = ?
            AND a.status IN (${placeholders})
        `;
        
        const params = [fiscalYear, ...statuses];
        const result = await getAsync<{ count: number }>(db, query, params);
        counts[stage] = result?.count || 0;
      } catch (err) {
        console.error(`Error counting ${stage} assessments:`, err);
        counts[stage] = 0;
      }
    }
    
    // Also get indicator-level counts as backup or for more detailed view
    try {
      const indicatorCounts = await allAsync<any[]>(db, 
        `SELECT 
          id.status,
          COUNT(DISTINCT id.agency_id) as agency_count
         FROM indicator_data id
         JOIN agencies a ON id.agency_id = a.id
         WHERE a.status = 'active'
           AND id.fiscal_year = ?
           AND id.status IN ('draft', 'submitted', 'final')
         GROUP BY id.status`,
        [fiscalYear]
      );
      
      // Use indicator counts if they provide more data (but keep assessment counts as primary)
      console.log('Indicator-level counts for reference:', indicatorCounts);
    } catch (err) {
      console.log('Indicator-level counts not available (this is fine):', err);
    }
    
    // Calculate percentages for the funnel
    const totalAgenciesResult = await getAsync<{ count: number }>(
      db,
      'SELECT COUNT(*) as count FROM agencies WHERE status = "active"',
      []
    );
    const totalAgencies = totalAgenciesResult?.count || 0;
    
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
    
    // Add summary statistics
    const summary = {
      total_agencies: totalAgencies,
      completion_rate: totalAgencies > 0 ? Math.round((counts.final / totalAgencies) * 100) : 0,
      fiscal_year: fiscalYear,
      generated_at: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: pipelineData,
      summary,
      fiscal_year: fiscalYear
    });
  } catch (err) {
    console.error('Pipeline error:', err);
    res.status(500).json({ 
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
    const targetFiscalYear = fiscal_year || '2025-26';
    
    // Get detailed status breakdown
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
         AND a.fiscal_year = ?
       GROUP BY a.status
       ORDER BY 
         CASE a.status
           WHEN 'DRAFT' THEN 1
           WHEN 'IN_PROGRESS' THEN 2
           WHEN 'NOT_STARTED' THEN 3
           WHEN 'SUBMITTED_TO_AGENCY' THEN 4
           WHEN 'SUBMITTED_TO_HOA' THEN 5
           WHEN 'SUBMITTED_TO_ACC' THEN 6
           WHEN 'AWAITING_VALIDATION' THEN 7
           WHEN 'VALIDATED' THEN 8
           WHEN 'FINALIZED' THEN 9
           ELSE 10
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
    res.status(500).json({ error: 'Failed to load status breakdown' });
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
    const targetFiscalYear = fiscal_year || '2025-26';
    
    // Get assessment for specific agency
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
       WHERE a.agency_id = ? AND a.fiscal_year = ?`,
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
    
    // Get submission history (audit logs related to this assessment)
    const history = await allAsync<any[]>(
      db,
      `SELECT 
        action,
        created_at as timestamp,
        user_id as actor,
        details
       FROM audit_logs
       WHERE resource_type = 'assessment'
         AND resource_id = ?
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
    res.status(500).json({ error: 'Failed to load agency pipeline status' });
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
    'FINALIZED': ['Assessment complete', 'No further actions needed']
  };
  return stepsMap[status] || ['Continue with assessment process'];
}