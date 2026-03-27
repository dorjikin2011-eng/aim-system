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
    const summaryMetrics = await getAsync<any>(db, 
      `SELECT 
        COUNT(DISTINCT a.id) as total_agencies,
        COUNT(CASE WHEN ir.total_score >= 80 THEN 1 END) as high_integrity,
        COUNT(CASE WHEN ir.total_score >= 60 AND ir.total_score < 80 THEN 1 END) as medium_integrity,
        COUNT(CASE WHEN ir.total_score < 60 THEN 1 END) as low_integrity,
        AVG(ir.total_score) as avg_national_score,
        COUNT(CASE WHEN a.status IN ('DRAFT', 'SUBMITTED_TO_HOA', 'SUBMITTED_TO_ACC') THEN 1 END) as pending_submissions
       FROM agencies ag
       LEFT JOIN assessments a ON ag.id = a.agency_id AND a.fiscal_year = ?
       LEFT JOIN indicator_data ir ON ag.id = ir.agency_id AND ir.fiscal_year = ?`,
      [fiscalYear, fiscalYear]
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
    const scoreDistribution = await allAsync<any[]>(db, 
      `SELECT 
        CASE 
          WHEN ir.total_score >= 80 THEN 'High Integrity'
          WHEN ir.total_score >= 60 THEN 'Medium Integrity'
          ELSE 'Low Integrity'
        END as integrity_level,
        COUNT(*) as count
       FROM agencies ag
       LEFT JOIN indicator_data ir ON ag.id = ir.agency_id AND ir.fiscal_year = ?
       WHERE ir.total_score IS NOT NULL
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
    const sectorPerformance = await allAsync<any[]>(db, 
      `SELECT 
        ag.sector,
        COUNT(*) as agency_count,
        AVG(ir.total_score) as avg_score,
        MIN(ir.total_score) as min_score,
        MAX(ir.total_score) as max_score
       FROM agencies ag
       LEFT JOIN indicator_data ir ON ag.id = ir.agency_id AND ir.fiscal_year = ?
       WHERE ir.total_score IS NOT NULL
       GROUP BY ag.sector
       ORDER BY avg_score DESC`,
      [fiscalYear]
    );

    // 4. Top and Bottom Agencies
    const topAgencies = await allAsync<any[]>(db, 
      `SELECT 
        ag.name as agency_name,
        ag.sector,
        ir.total_score
       FROM agencies ag
       JOIN indicator_data ir ON ag.id = ir.agency_id AND ir.fiscal_year = ?
       ORDER BY ir.total_score DESC
       LIMIT 5`,
      [fiscalYear]
    );

    const bottomAgencies = await allAsync<any[]>(db, 
      `SELECT 
        ag.name as agency_name,
        ag.sector,
        ir.total_score
       FROM agencies ag
       JOIN indicator_data ir ON ag.id = ir.agency_id AND ir.fiscal_year = ?
       WHERE ir.total_score IS NOT NULL
       ORDER BY ir.total_score ASC
       LIMIT 5`,
      [fiscalYear]
    );

    // 5. Key Performance Indicators
    const kpis = await getAsync<any>(db, 
      `SELECT 
        AVG(CASE 
          WHEN complaint_mechanism_func = 1 AND conflict_interest_func = 1 AND gift_register_func = 1 
          THEN 1 ELSE 0 
        END) * 100 as iccs_implementation_rate,
        AVG(elearning_completion_rate) as training_completion_rate,
        AVG(ad_compliance_rate) as ad_compliance_rate,
        AVG(atr_timeliness_rate) as atr_timeliness_rate
       FROM indicator_data
       WHERE fiscal_year = ?`,
      [fiscalYear]
    );

    const kpiData = kpis || {
      iccs_implementation_rate: 0,
      training_completion_rate: 0,
      ad_compliance_rate: 0,
      atr_timeliness_rate: 0
    };

    // 6. Recent Activity (Last 7 days)
    const recentActivity = await allAsync<any[]>(db, 
      `SELECT 
        al.action,
        al.user_id,
        al.agency_id,
        ag.name as agency_name,
        al.created_at as timestamp
       FROM audit_logs al
       LEFT JOIN agencies ag ON al.agency_id = ag.id
       WHERE al.created_at > datetime('now', '-7 days')
       ORDER BY al.created_at DESC
       LIMIT 10`,
      []
    );

    // 7. Workflow Status Overview
    const workflowStatus = await allAsync<any[]>(db, 
      `SELECT 
        status,
        COUNT(*) as count
       FROM assessments
       WHERE fiscal_year = ?
       GROUP BY status
       ORDER BY 
         CASE status
           WHEN 'DRAFT' THEN 1
           WHEN 'SUBMITTED_TO_HOA' THEN 2
           WHEN 'RETURNED_BY_HOA' THEN 3
           WHEN 'SUBMITTED_TO_ACC' THEN 4
           WHEN 'UNDER_REVIEW_BY_ACC' THEN 5
           WHEN 'AWAITING_VALIDATION' THEN 6
           WHEN 'FINALIZED' THEN 7
           ELSE 8
         END`,
      [fiscalYear]
    );

    res.json({
      summary: {
        totalAgencies: metrics.total_agencies || 0,
        highIntegrity: metrics.high_integrity || 0,
        mediumIntegrity: metrics.medium_integrity || 0,
        lowIntegrity: metrics.low_integrity || 0,
        avgNationalScore: metrics.avg_national_score ? parseFloat(metrics.avg_national_score.toFixed(1)) : 0,
        pendingSubmissions: metrics.pending_submissions || 0
      },
      scoreDistribution: scoreDistribution.map(item => ({
        integrityLevel: item.integrity_level,
        count: item.count
      })),
      sectorPerformance: sectorPerformance.map(item => ({
        sector: item.sector,
        agencyCount: item.agency_count,
        avgScore: item.avg_score ? parseFloat(item.avg_score.toFixed(1)) : 0,
        minScore: item.min_score ? parseFloat(item.min_score.toFixed(1)) : 0,
        maxScore: item.max_score ? parseFloat(item.max_score.toFixed(1)) : 0
      })),
      topAgencies: topAgencies.map(item => ({
        agencyName: item.agency_name,
        sector: item.sector,
        score: item.total_score ? parseFloat(item.total_score.toFixed(1)) : 0
      })),
      bottomAgencies: bottomAgencies.map(item => ({
        agencyName: item.agency_name,
        sector: item.sector,
        score: item.total_score ? parseFloat(item.total_score.toFixed(1)) : 0
      })),
      kpis: {
        iccsImplementationRate: kpiData.iccs_implementation_rate ? parseFloat(kpiData.iccs_implementation_rate.toFixed(1)) : 0,
        trainingCompletionRate: kpiData.training_completion_rate ? parseFloat(kpiData.training_completion_rate.toFixed(1)) : 0,
        adComplianceRate: kpiData.ad_compliance_rate ? parseFloat(kpiData.ad_compliance_rate.toFixed(1)) : 0,
        atrTimelinessRate: kpiData.atr_timeliness_rate ? parseFloat(kpiData.atr_timeliness_rate.toFixed(1)) : 0
      },
      recentActivity: recentActivity.map(item => ({
        action: formatAction(item.action),
        actor: item.user_id || 'System',
        agency: item.agency_name || 'System',
        timestamp: item.timestamp
      })),
      workflowStatus: workflowStatus.map(item => ({
        status: formatStatus(item.status),
        count: item.count,
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
    'IN_PROGRESS': 'In Progress',
    'NOT_STARTED': 'Not Started'
  };
  return map[status] || status;
}