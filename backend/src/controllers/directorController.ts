// backend/src/controllers/directorController.ts
import { Request, Response } from 'express';
import { getDB, getAsync, allAsync } from '../models/db';

// ============================================
// GET /api/director/dashboard
// ============================================
export const getDirectorDashboard = async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const fiscalYear = '2024–25'; // TODO: Make dynamic - same as commission

    // 1. Executive Summary Metrics
    // FIXED: Changed ? to $1, $2 and updated table/column references
    const summaryMetrics = await getAsync<any>(db, 
      `SELECT 
        COUNT(DISTINCT ag.id) as total_agencies,
        COUNT(CASE WHEN a.overall_score >= 80 THEN 1 END) as high_integrity,
        COUNT(CASE WHEN a.overall_score >= 60 AND a.overall_score < 80 THEN 1 END) as medium_integrity,
        COUNT(CASE WHEN a.overall_score < 60 THEN 1 END) as low_integrity,
        AVG(a.overall_score) as avg_national_score,
        COUNT(CASE WHEN a.status IN ('DRAFT', 'IN_PROGRESS', 'SUBMITTED_TO_AGENCY', 'SUBMITTED') THEN 1 END) as pending_submissions
       FROM agencies ag
       LEFT JOIN assessments a ON ag.id = a.agency_id AND a.fiscal_year = $1`,
      [fiscalYear]
    );

    const metrics = summaryMetrics || {
      total_agencies: 0,
      high_integrity: 0,
      medium_integrity: 0,
      low_integrity: 0,
      avg_national_score: 0,
      pending_submissions: 0
    };

    // 2. Score Distribution Data
    // FIXED: Changed ? to $1 and generic type
    const scoreDistribution = await allAsync<any>(db, 
      `SELECT 
        CASE 
          WHEN a.overall_score >= 80 THEN 'High Integrity'
          WHEN a.overall_score >= 60 THEN 'Medium Integrity'
          ELSE 'Low Integrity'
        END as integrity_level,
        COUNT(*) as count
       FROM agencies ag
       LEFT JOIN assessments a ON ag.id = a.agency_id AND a.fiscal_year = $1
       WHERE a.overall_score IS NOT NULL
       GROUP BY integrity_level
       ORDER BY 
         CASE integrity_level
           WHEN 'High Integrity' THEN 1
           WHEN 'Medium Integrity' THEN 2
           ELSE 3
         END`,
      [fiscalYear]
    );

    // 3. Sector-wise Performance
    // FIXED: Changed ? to $1 and generic type
    const sectorPerformance = await allAsync<any>(db, 
      `SELECT 
        ag.sector,
        COUNT(*) as agency_count,
        AVG(a.overall_score) as avg_score,
        MIN(a.overall_score) as min_score,
        MAX(a.overall_score) as max_score
       FROM agencies ag
       LEFT JOIN assessments a ON ag.id = a.agency_id AND a.fiscal_year = $1
       WHERE a.overall_score IS NOT NULL
       GROUP BY ag.sector
       ORDER BY avg_score DESC`,
      [fiscalYear]
    );

    // 4. Top and Bottom Agencies
    // FIXED: Changed ? to $1 and generic type
    const topAgencies = await allAsync<any>(db, 
      `SELECT 
        ag.name as agency_name,
        ag.sector,
        a.overall_score as total_score
       FROM agencies ag
       JOIN assessments a ON ag.id = a.agency_id AND a.fiscal_year = $1
       WHERE a.overall_score IS NOT NULL
       ORDER BY a.overall_score DESC
       LIMIT 5`,
      [fiscalYear]
    );

    // FIXED: Changed ? to $1 and generic type
    const bottomAgencies = await allAsync<any>(db, 
      `SELECT 
        ag.name as agency_name,
        ag.sector,
        a.overall_score as total_score
       FROM agencies ag
       JOIN assessments a ON ag.id = a.agency_id AND a.fiscal_year = $1
       WHERE a.overall_score IS NOT NULL
       ORDER BY a.overall_score ASC
       LIMIT 5`,
      [fiscalYear]
    );

    // 5. Key Performance Indicators
    // FIXED: Changed ? to $1 - Using dynamic_assessment_responses for detailed metrics
    const kpis = await getAsync<any>(db, 
      `SELECT 
        AVG(CASE 
          WHEN dar.response_data::jsonb ? 'complaint_level' 
            AND (dar.response_data::jsonb->>'complaint_level')::int >= 2
            AND dar.response_data::jsonb ? 'coi_level'
            AND (dar.response_data::jsonb->>'coi_level')::int >= 2
            AND dar.response_data::jsonb ? 'gift_level'
            AND (dar.response_data::jsonb->>'gift_level')::int >= 2
          THEN 100 ELSE 0 
        END) as iccs_implementation_rate,
        AVG(CASE 
          WHEN dar.response_data::jsonb ? 'training_percentage'
          THEN (dar.response_data::jsonb->>'training_percentage')::float
          ELSE 0
        END) as training_completion_rate,
        AVG(CASE 
          WHEN dar.response_data::jsonb ? 'ad_compliance_rate'
          THEN (dar.response_data::jsonb->>'ad_compliance_rate')::float
          ELSE 0
        END) as ad_compliance_rate,
        AVG(CASE 
          WHEN dar.response_data::jsonb ? 'atr_timeliness_rate'
          THEN (dar.response_data::jsonb->>'atr_timeliness_rate')::float
          ELSE 0
        END) as atr_timeliness_rate
       FROM assessments a
       LEFT JOIN dynamic_assessment_responses dar ON a.id = dar.assessment_id
       WHERE a.fiscal_year = $1`,
      [fiscalYear]
    );

    const kpiData = kpis || {
      iccs_implementation_rate: 0,
      training_completion_rate: 0,
      ad_compliance_rate: 0,
      atr_timeliness_rate: 0
    };

    // 6. Recent Activity (Last 7 days)
    // FIXED: Replaced SQLite datetime with PostgreSQL interval syntax
    const recentActivity = await allAsync<any>(db, 
      `SELECT 
        al.action,
        al.user_id,
        al.agency_id,
        ag.name as agency_name,
        al.created_at as timestamp
       FROM audit_logs al
       LEFT JOIN agencies ag ON al.agency_id = ag.id
       WHERE al.created_at > (CURRENT_DATE - INTERVAL '7 days')
       ORDER BY al.created_at DESC
       LIMIT 10`,
      []
    );

    // 7. Workflow Status Overview
    // FIXED: Changed ? to $1 and generic type
    const workflowStatus = await allAsync<any>(db, 
      `SELECT 
        status,
        COUNT(*) as count
       FROM assessments
       WHERE fiscal_year = $1
       GROUP BY status
       ORDER BY 
         CASE status
           WHEN 'DRAFT' THEN 1
           WHEN 'IN_PROGRESS' THEN 2
           WHEN 'SUBMITTED_TO_AGENCY' THEN 3
           WHEN 'SUBMITTED' THEN 4
           WHEN 'AWAITING_VALIDATION' THEN 5
           WHEN 'VALIDATED' THEN 6
           WHEN 'FINALIZED' THEN 7
           ELSE 8
         END`,
      [fiscalYear]
    );

    res.json({
      summary: {
        totalAgencies: Number(metrics.total_agencies) || 0,
        highIntegrity: Number(metrics.high_integrity) || 0,
        mediumIntegrity: Number(metrics.medium_integrity) || 0,
        lowIntegrity: Number(metrics.low_integrity) || 0,
        avgNationalScore: metrics.avg_national_score ? parseFloat(Number(metrics.avg_national_score).toFixed(1)) : 0,
        pendingSubmissions: Number(metrics.pending_submissions) || 0
      },
      scoreDistribution: scoreDistribution.map((item: any) => ({
        integrityLevel: item.integrity_level,
        count: Number(item.count)
      })),
      sectorPerformance: sectorPerformance.map((item: any) => ({
        sector: item.sector,
        agencyCount: Number(item.agency_count),
        avgScore: item.avg_score ? parseFloat(Number(item.avg_score).toFixed(1)) : 0,
        minScore: item.min_score ? parseFloat(Number(item.min_score).toFixed(1)) : 0,
        maxScore: item.max_score ? parseFloat(Number(item.max_score).toFixed(1)) : 0
      })),
      topAgencies: topAgencies.map((item: any) => ({
        agencyName: item.agency_name,
        sector: item.sector,
        score: item.total_score ? parseFloat(Number(item.total_score).toFixed(1)) : 0
      })),
      bottomAgencies: bottomAgencies.map((item: any) => ({
        agencyName: item.agency_name,
        sector: item.sector,
        score: item.total_score ? parseFloat(Number(item.total_score).toFixed(1)) : 0
      })),
      kpis: {
        iccsImplementationRate: kpiData.iccs_implementation_rate ? parseFloat(Number(kpiData.iccs_implementation_rate).toFixed(1)) : 0,
        trainingCompletionRate: kpiData.training_completion_rate ? parseFloat(Number(kpiData.training_completion_rate).toFixed(1)) : 0,
        adComplianceRate: kpiData.ad_compliance_rate ? parseFloat(Number(kpiData.ad_compliance_rate).toFixed(1)) : 0,
        atrTimelinessRate: kpiData.atr_timeliness_rate ? parseFloat(Number(kpiData.atr_timeliness_rate).toFixed(1)) : 0
      },
      recentActivity: recentActivity.map((item: any) => ({
        action: formatAction(item.action),
        actor: item.user_id || 'System',
        agency: item.agency_name || 'System',
        timestamp: item.timestamp
      })),
      workflowStatus: workflowStatus.map((item: any) => ({
        status: formatStatus(item.status),
        count: Number(item.count),
        rawStatus: item.status
      }))
    });
  } catch (err) {
    console.error('Director dashboard error:', err);
    res.status(500).json({ error: 'Failed to fetch director dashboard data' });
  }
};

// ============================================
// Helper functions
// ============================================
function formatAction(action: string): string {
  const map: Record<string, string> = {
    'create_user': 'Created user',
    'update_user': 'Updated user',
    'delete_user': 'Deleted user',
    'reset_password': 'Reset password',
    'create_agency': 'Created agency',
    'submit_assessment': 'Submitted assessment',
    'finalize_assessment': 'Finalized assessment',
    'approve_focal_nomination': 'Approved focal nomination',
    'reject_focal_nomination': 'Rejected focal nomination',
    'assign_agency': 'Assigned agency',
    'unassign_agency': 'Unassigned agency',
    'login': 'User logged in',
    'logout': 'User logged out'
  };
  return map[action] || action.replace(/_/g, ' ');
}

function formatStatus(status: string): string {
  const map: Record<string, string> = {
    'DRAFT': 'Draft',
    'SUBMITTED_TO_HOA': 'Submitted to HoA',
    'RETURNED_BY_HOA': 'Returned by HoA',
    'SUBMITTED_TO_ACC': 'Submitted to ACC',
    'UNDER_REVIEW_BY_ACC': 'Under Review by ACC',
    'AWAITING_VALIDATION': 'Awaiting Validation',
    'FINALIZED': 'Finalized',
    'SUBMITTED_TO_AGENCY': 'Submitted to Agency',
    'SUBMITTED': 'Submitted',
    'IN_PROGRESS': 'In Progress',
    'NOT_STARTED': 'Not Started',
    'VALIDATED': 'Validated'
  };
  return map[status] || status;
}