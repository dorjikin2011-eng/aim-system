// backend/src/services/auditService.ts
import { Request } from 'express';
import { pool } from '../models/db'; // <-- your actual export from db.ts
import { v4 as uuidv4 } from 'uuid';

export const logAction = async (
  req: Request,
  action: string,
  target: { type: string; id?: string },
  details?: Record<string, any>
) => {
  try {
    const userId = (req as any).user?.id || (req as any).session?.user?.id || 'anonymous';
    const userEmail = (req as any).user?.email || (req as any).session?.user?.email || 'anonymous';
    const ipAddress = req.ip || req.ips?.[0] || req.socket?.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    const logId = uuidv4();

    await pool.query(
      `INSERT INTO audit_logs
        (id, user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        logId,
        userId,
        action,
        target.type,
        target.id || null,
        JSON.stringify(details || {}),
        ipAddress,
        userAgent,
        new Date().toISOString()
      ]
    );
  } catch (err) {
    console.error('Audit log failed:', err);
  }
};

export const logActionLegacy = async (
  req: Request,
  action: string,
  target: { type: string; id?: string },
  details?: Record<string, any>
) => {
  try {
    const userId = (req as any).user?.id || (req as any).session?.user?.id || 'anonymous';
    const userEmail = (req as any).user?.email || (req as any).session?.user?.email || 'anonymous';
    const ipAddress = req.ip || req.ips?.[0] || req.socket?.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    const logId = uuidv4();

    await pool.query(
      `INSERT INTO audit_logs
        (id, actor_id, actor_email, action, target_type, target_id, details, ip_address, user_agent, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        logId,
        userId,
        userEmail,
        action,
        target.type,
        target.id || null,
        JSON.stringify(details || {}),
        ipAddress,
        userAgent,
        new Date().toISOString()
      ]
    );
  } catch (err) {
    console.error('Audit log failed (legacy):', err);
  }
};

export const getAuditLogs = async (options?: {
  limit?: number;
  offset?: number;
  action?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}) => {
  try {
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (options?.action) {
      query += ` AND action = $${paramIndex++}`;
      params.push(options.action);
    }
    if (options?.userId) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(options.userId);
    }
    if (options?.startDate) {
      query += ` AND created_at >= $${paramIndex++}`;
      params.push(options.startDate.toISOString());
    }
    if (options?.endDate) {
      query += ` AND created_at <= $${paramIndex++}`;
      params.push(options.endDate.toISOString());
    }

    query += ' ORDER BY created_at DESC';

    if (options?.limit) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(options.limit);
      if (options?.offset) {
        query += ` OFFSET $${paramIndex++}`;
        params.push(options.offset);
      }
    }

    const { rows } = await pool.query(query, params);
    return rows;
  } catch (err) {
    console.error('Failed to get audit logs:', err);
    return [];
  }
};

export const getAuditStats = async (days: number = 7) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { rows: actionStats } = await pool.query(
      `SELECT action, COUNT(*) AS count
       FROM audit_logs
       WHERE created_at >= $1
       GROUP BY action
       ORDER BY count DESC`,
      [startDate.toISOString()]
    );

    const { rows: dailyStats } = await pool.query(
      `SELECT DATE(created_at) AS date, COUNT(*) AS count
       FROM audit_logs
       WHERE created_at >= $1
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [startDate.toISOString()]
    );

    const { rows: userStats } = await pool.query(
      `SELECT user_id, COUNT(*) AS count
       FROM audit_logs
       WHERE created_at >= $1
       GROUP BY user_id
       ORDER BY count DESC
       LIMIT 10`,
      [startDate.toISOString()]
    );

    return {
      actionStats,
      dailyStats,
      userStats,
      total: dailyStats.reduce((sum, day) => sum + Number(day.count || 0), 0),
    };
  } catch (err) {
    console.error('Failed to get audit stats:', err);
    return { actionStats: [], dailyStats: [], userStats: [], total: 0 };
  }
};