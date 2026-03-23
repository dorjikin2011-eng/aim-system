// backend/src/controllers/adminStatsController.ts
import { Request, Response } from 'express';
import { getDB } from '../models/db';

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

export const getAdminStats = async (req: Request, res: Response) => {
  const db = getDB();
  
  try {
    // Agencies
    const agencies = await new Promise<AgencyCount>((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM agencies', (err: Error | null, row: any) => {
        if (err) reject(err);
        else resolve(row as AgencyCount);
      });
    });
    
    // Users by role
    const users = await new Promise<UserStats>((resolve, reject) => {
      db.get(`SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN role = 'commissioner' THEN 1 ELSE 0 END) as commissioners,
        SUM(CASE WHEN role = 'director' THEN 1 ELSE 0 END) as directors,
        SUM(CASE WHEN role = 'focal_person' THEN 1 ELSE 0 END) as focal_persons,
        SUM(CASE WHEN role = 'prevention_officer' THEN 1 ELSE 0 END) as prevention_officers
        FROM users`, (err: Error | null, row: any) => {
        if (err) reject(err);
        else resolve(row as UserStats);
      });
    });
    
    // Active assessments (DRAFT or SUBMITTED_TO_AGENCY)
    const activeAssessments = await new Promise<AssessmentCount>((resolve, reject) => {
      db.get(`SELECT COUNT(*) as count 
        FROM assessments 
        WHERE status IN ('DRAFT', 'SUBMITTED_TO_AGENCY')`, (err: Error | null, row: any) => {
        if (err) reject(err);
        else resolve(row as AssessmentCount);
      });
    });
    
    // Calculate score from assessment_scores (using only existing columns)
    const finalizedThisMonth = await new Promise<ApprovedStats>((resolve, reject) => {
      db.get(`SELECT 
        COUNT(DISTINCT a.id) as count,
        AVG(total_score) as avg_score
        FROM assessments a
        LEFT JOIN (
          SELECT 
            assessment_id, 
            SUM(calculated_value) as total_score
          FROM assessment_scores
          GROUP BY assessment_id
        ) ir ON a.id = ir.assessment_id
        WHERE a.status = 'FINALIZED' 
          AND strftime('%Y-%m', a.updated_at) = strftime('%Y-%m', 'now')`, 
        (err: Error | null, row: any) => {
        if (err) reject(err);
        else resolve(row as ApprovedStats);
      });
    });
    
    // Overdue assessments (>7 days in DRAFT)
    const overdueAssessments = await new Promise<AssessmentCount>((resolve, reject) => {
      db.get(`SELECT COUNT(*) as count 
        FROM assessments 
        WHERE status = 'DRAFT' 
          AND created_at < datetime('now', '-7 days')`, 
        (err: Error | null, row: any) => {
        if (err) reject(err);
        else resolve(row as AssessmentCount);
      });
    });
    
    // ✅ FIXED: Use configuration_versions table with correct columns
    const recentConfigs = await new Promise<any[]>((resolve, reject) => {
      db.all(`SELECT 
          id, 
          version_name,
          version_number,
          description,
          created_by,
          created_at
        FROM configuration_versions 
        ORDER BY created_at DESC 
        LIMIT 7`, 
        (err: Error | null, rows: any[]) => {
        if (err) {
          console.log('Configuration versions error:', err.message);
          resolve([]);
        } else {
          resolve(rows);
        }
      });
    });

    res.json({
      stats: {
        agencies: agencies.count,
        users: {
          total: users.total,
          commissioners: users.commissioners || 0,
          directors: users.directors || 0,
          focal_persons: users.focal_persons || 0,
          prevention_officers: users.prevention_officers || 0
        },
        activeDeclarations: activeAssessments.count,
        approvedThisMonth: {
          count: finalizedThisMonth.count,
          avgScore: finalizedThisMonth.avg_score ? parseFloat(finalizedThisMonth.avg_score.toFixed(1)) : 0
        },
        overdueReviews: overdueAssessments.count,
        recentAuditLogs: recentConfigs.length // Use config changes count
      },
      recentActivity: recentConfigs.map((config: any) => ({
        id: config.id.toString(),
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
      }))
    });
  } catch (err: any) {
    console.error('Stats error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch stats',
      details: err.message 
    });
  }
};