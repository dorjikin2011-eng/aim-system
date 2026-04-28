// backend/src/controllers/adminStatsController.ts
import { Request, Response } from 'express';
import { getDB, getAsync, allAsync } from '../models/db';

// Define result types
interface AgencyCount {
  count: number;
}

interface UserStats {
  total: number;
  commissioners: number;
  directors: number;
  focal_persons: number;
  prevention_officers: number;
}

interface AssessmentCount {
  count: number;
}

interface ApprovedStats {
  count: number;
  avg_score: number | null;
}

interface RecentConfig {
  id: string;
  version_name: string;
  version_number: string;
  description: string;
  created_by: string;
  created_at: string;
}

// ============================================
// GET /api/admin/stats
// ============================================
export const getAdminStats = async (req: Request, res: Response) => {
  const db = getDB();
  
  try {
    // Get agencies count
    const agenciesResult = await getAsync<AgencyCount>(db, 
      'SELECT COUNT(*) as count FROM agencies'
    );
    const agenciesCount = agenciesResult?.count || 0;
    
    // Get users by role
    // FIXED: Changed is_active = 1 to is_active = true for PostgreSQL
    const usersResult = await getAsync<UserStats>(db, `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN role = 'commissioner' THEN 1 ELSE 0 END) as commissioners,
        SUM(CASE WHEN role = 'director' THEN 1 ELSE 0 END) as directors,
        SUM(CASE WHEN role = 'focal_person' THEN 1 ELSE 0 END) as focal_persons,
        SUM(CASE WHEN role = 'prevention_officer' THEN 1 ELSE 0 END) as prevention_officers
      FROM users
      WHERE is_active = true
    `);
    
    const userStats = {
      total: usersResult?.total || 0,
      commissioners: usersResult?.commissioners || 0,
      directors: usersResult?.directors || 0,
      focal_persons: usersResult?.focal_persons || 0,
      prevention_officers: usersResult?.prevention_officers || 0
    };
    
    // Get active assessments (DRAFT or SUBMITTED_TO_AGENCY)
    const activeAssessmentsResult = await getAsync<AssessmentCount>(db, `
      SELECT COUNT(*) as count 
      FROM assessments 
      WHERE status IN ('DRAFT', 'SUBMITTED_TO_AGENCY')
    `);
    const activeAssessmentsCount = activeAssessmentsResult?.count || 0;
    
    // Get finalized assessments this month
    // FIXED: Replaced SQLite strftime with PostgreSQL EXTRACT and date_trunc
    const finalizedThisMonthResult = await getAsync<ApprovedStats>(db, `
      SELECT 
        COUNT(DISTINCT id) as count,
        AVG(overall_score) as avg_score
      FROM assessments
      WHERE status = 'FINALIZED' 
        AND DATE_TRUNC('month', finalized_at) = DATE_TRUNC('month', CURRENT_DATE)
    `);
    
    const finalizedStats = {
      count: finalizedThisMonthResult?.count || 0,
      avgScore: finalizedThisMonthResult?.avg_score 
        ? parseFloat(parseFloat(String(finalizedThisMonthResult.avg_score)).toFixed(1)) 
        : 0
    };
    
    // Get overdue assessments (>7 days in DRAFT)
    // FIXED: Replaced SQLite datetime('now', '-7 days') with PostgreSQL CURRENT_DATE - INTERVAL '7 days'
    const overdueAssessmentsResult = await getAsync<AssessmentCount>(db, `
      SELECT COUNT(*) as count 
      FROM assessments 
      WHERE status = 'DRAFT' 
        AND created_at < (CURRENT_DATE - INTERVAL '7 days')
    `);
    const overdueAssessmentsCount = overdueAssessmentsResult?.count || 0;
    
    // Get recent configuration versions
    let recentConfigs: RecentConfig[] = [];
    try {
      // FIXED: Changed generic type from RecentConfig[] to RecentConfig
      const configs = await allAsync<RecentConfig>(db, `
        SELECT 
          id, 
          version_name,
          version_number,
          description,
          created_by,
          created_at
        FROM configuration_versions 
        ORDER BY created_at DESC 
        LIMIT 7
      `, []);
      recentConfigs = configs;
    } catch (configErr) {
      console.log('Configuration versions error:', (configErr as Error).message);
      recentConfigs = [];
    }
    
    // Format recent activity
    const recentActivity = recentConfigs.map((config: RecentConfig) => ({
      id: config.id,
      actor: config.created_by || 'System',
      action: config.description || `Updated configuration v${config.version_number}`,
      target: config.version_name || 'Configuration',
      time: config.created_at 
        ? new Date(config.created_at).toLocaleString('en-BT', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
          })
        : 'Unknown time'
    }));
    
    // Send response
    res.json({
      stats: {
        agencies: agenciesCount,
        users: userStats,
        activeDeclarations: activeAssessmentsCount,
        approvedThisMonth: finalizedStats,
        overdueReviews: overdueAssessmentsCount,
        recentAuditLogs: recentConfigs.length
      },
      recentActivity: recentActivity
    });
    
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch stats',
      details: err instanceof Error ? err.message : 'Unknown error'
    });
  }
};

// ============================================
// GET /api/admin/assigned-agencies
// Description: Get all assigned agencies with assessment status for admin dashboard
// Query params: officerId (optional filter)
// ============================================
export const getAssignedAgenciesWithStatus = async (req: Request, res: Response) => {
  try {
    const { officerId } = req.query;
    const db = getDB();
    
    // Get current fiscal year
    const currentYear = new Date().getFullYear();
    const fiscalYear = `${currentYear}–${currentYear + 1}`;
    
    let query = `
      SELECT 
        a.id as agency_id,
        a.name as agency_name,
        a.sector,
        a.status as agency_status,
        u.id as officer_id,
        u.name as officer_name,
        u.email as officer_email,
        COALESCE(ass.status, 'NOT_STARTED') as assessment_status,
        COALESCE(ass.overall_score, 0) as overall_score,
        ass.updated_at as last_updated,
        ass.fiscal_year,
        CASE 
          WHEN ass.status = 'FINALIZED' THEN 100
          WHEN ass.status = 'COMPLETED' THEN 100
          WHEN ass.status = 'IN_PROGRESS' THEN 50
          WHEN ass.status = 'DRAFT' THEN 25
          ELSE 0
        END as progress
      FROM assignments a_assign
      INNER JOIN agencies a ON a_assign.agency_id = a.id
      INNER JOIN users u ON a_assign.prevention_officer_id = u.id::text
      LEFT JOIN assessments ass ON a.id = ass.agency_id AND ass.fiscal_year = $1
      WHERE a_assign.status = 'active'
        AND u.is_active = true
        AND u.role = 'prevention_officer'
    `;
    
    const queryParams: any[] = [fiscalYear];
    
    // Add officer filter if provided
    if (officerId && officerId !== 'all') {
      query += ` AND u.id::text = $2`;
      queryParams.push(officerId);
    }
    
    query += ` ORDER BY a.name`;
    
    const assignedAgencies = await allAsync<any>(db, query, queryParams);
    
    // Get all prevention officers for filter dropdown
    const officers = await allAsync<any>(db, `
      SELECT 
        u.id,
        u.name,
        u.email,
        COUNT(a_assign.id) as assignment_count
      FROM users u
      LEFT JOIN assignments a_assign ON u.id::text = a_assign.prevention_officer_id AND a_assign.status = 'active'
      WHERE u.role = 'prevention_officer' 
        AND u.is_active = true
      GROUP BY u.id, u.name, u.email
      ORDER BY u.name
    `);
    
    // Calculate stats
    const totalAgenciesResult = await getAsync<any>(db, `
      SELECT COUNT(*) as count FROM agencies WHERE status = 'active'
    `);
    const totalAgencies = totalAgenciesResult?.count || 0;
    
    const assignedAgenciesCount = assignedAgencies.length;
    
    const finalizedCount = assignedAgencies.filter(a => a.assessment_status === 'FINALIZED').length;
    
    const pendingCount = assignedAgencies.filter(a => 
      a.assessment_status === 'NOT_STARTED' || 
      a.assessment_status === 'DRAFT' || 
      a.assessment_status === 'IN_PROGRESS'
    ).length;
    
    const activeOfficersResult = await getAsync<any>(db, `
      SELECT COUNT(DISTINCT prevention_officer_id) as count 
      FROM assignments 
      WHERE status = 'active'
    `);
    const activeOfficers = activeOfficersResult?.count || 0;
    
    const avgWorkload = activeOfficers > 0 ? (assignedAgenciesCount / activeOfficers).toFixed(1) : 0;
    
    res.json({
      success: true,
      data: {
        assignedAgencies: assignedAgencies.map(agency => ({
          agency_id: agency.agency_id,
          agency_name: agency.agency_name,
          sector: agency.sector,
          officer_id: agency.officer_id,
          officer_name: agency.officer_name,
          officer_email: agency.officer_email,
          assessment_status: agency.assessment_status,
          overall_score: agency.overall_score,
          progress: agency.progress,
          last_updated: agency.last_updated,
          fiscal_year: agency.fiscal_year || fiscalYear
        })),
        officers: officers.map(o => ({
          id: o.id,
          name: o.name,
          email: o.email,
          assignment_count: o.assignment_count || 0
        })),
        stats: {
          total_agencies: totalAgencies,
          assigned_agencies: assignedAgenciesCount,
          finalized_assessments: finalizedCount,
          pending_assessments: pendingCount,
          active_officers: activeOfficers,
          avg_workload: parseFloat(avgWorkload as string)
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching assigned agencies with status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch assigned agencies data' 
    });
  }
};