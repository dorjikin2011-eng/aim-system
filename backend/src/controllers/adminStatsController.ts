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
    const usersResult = await getAsync<UserStats>(db, `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN role = 'commissioner' THEN 1 ELSE 0 END) as commissioners,
        SUM(CASE WHEN role = 'director' THEN 1 ELSE 0 END) as directors,
        SUM(CASE WHEN role = 'focal_person' THEN 1 ELSE 0 END) as focal_persons,
        SUM(CASE WHEN role = 'prevention_officer' THEN 1 ELSE 0 END) as prevention_officers
      FROM users
      WHERE is_active = 1
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
    const finalizedThisMonthResult = await getAsync<ApprovedStats>(db, `
      SELECT 
        COUNT(DISTINCT id) as count,
        AVG(overall_score) as avg_score
      FROM assessments
      WHERE status = 'FINALIZED' 
        AND strftime('%Y-%m', finalized_at) = strftime('%Y-%m', 'now')
    `);
    
    const finalizedStats = {
      count: finalizedThisMonthResult?.count || 0,
      avgScore: finalizedThisMonthResult?.avg_score 
        ? parseFloat(parseFloat(String(finalizedThisMonthResult.avg_score)).toFixed(1)) 
        : 0
    };
    
    // Get overdue assessments (>7 days in DRAFT)
    const overdueAssessmentsResult = await getAsync<AssessmentCount>(db, `
      SELECT COUNT(*) as count 
      FROM assessments 
      WHERE status = 'DRAFT' 
        AND created_at < datetime('now', '-7 days')
    `);
    const overdueAssessmentsCount = overdueAssessmentsResult?.count || 0;
    
    // Get recent configuration versions
    let recentConfigs: RecentConfig[] = [];
    try {
      recentConfigs = await allAsync<RecentConfig[]>(db, `
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