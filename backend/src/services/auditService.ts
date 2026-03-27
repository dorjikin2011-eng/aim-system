// backend/src/services/auditService.ts
import { Request } from 'express';
import { getDB, runAsync, allAsync } from '../models/db';
import { v4 as uuidv4 } from 'uuid';

export const logAction = async (
  req: Request,
  action: string,
  target: { type: string; id?: string },
  details?: Record<string, any>
) => {
  try {
    const db = getDB();
    
    // Get user info from session or request
    const userId = (req as any).user?.id || (req as any).session?.user?.id || 'anonymous';
    const userEmail = (req as any).user?.email || (req as any).session?.user?.email || 'anonymous';
    
    // Get IP address
    const ipAddress = req.ip || req.ips?.[0] || req.socket?.remoteAddress || 'unknown';
    
    // Get User Agent
    const userAgent = req.get('User-Agent') || 'unknown';
    
    // Generate unique ID
    const logId = uuidv4();
    
    // Use runAsync instead of db.run directly
    await runAsync(
      db,
      `INSERT INTO audit_logs 
       (id, user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    // Never fail the main operation due to audit failure
  }
};

// Alternative: Legacy function for backward compatibility with old column names
export const logActionLegacy = async (
  req: Request,
  action: string,
  target: { type: string; id?: string },
  details?: Record<string, any>
) => {
  try {
    const db = getDB();
    
    const userId = (req as any).user?.id || (req as any).session?.user?.id || 'anonymous';
    const userEmail = (req as any).user?.email || (req as any).session?.user?.email || 'anonymous';
    const ipAddress = req.ip || req.ips?.[0] || req.socket?.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    const logId = uuidv4();
    
    // Use runAsync with legacy column names (actor_id, actor_email)
    await runAsync(
      db,
      `INSERT INTO audit_logs 
       (id, actor_id, actor_email, action, target_type, target_id, details, ip_address, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

// Function to get audit logs
export const getAuditLogs = async (options?: {
  limit?: number;
  offset?: number;
  action?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}) => {
  try {
    const db = getDB();
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params: any[] = [];
    
    if (options?.action) {
      query += ' AND action = ?';
      params.push(options.action);
    }
    
    if (options?.userId) {
      query += ' AND user_id = ?';
      params.push(options.userId);
    }
    
    if (options?.startDate) {
      query += ' AND created_at >= ?';
      params.push(options.startDate.toISOString());
    }
    
    if (options?.endDate) {
      query += ' AND created_at <= ?';
      params.push(options.endDate.toISOString());
    }
    
    query += ' ORDER BY created_at DESC';
    
    if (options?.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
      
      if (options?.offset) {
        query += ' OFFSET ?';
        params.push(options.offset);
      }
    }
    
    const logs = await allAsync<any[]>(db, query, params);
    return logs;
  } catch (err) {
    console.error('Failed to get audit logs:', err);
    return [];
  }
};

// Function to get audit log statistics
export const getAuditStats = async (days: number = 7) => {
  try {
    const db = getDB();
    
    // Get count by action
    const actionStats = await allAsync<any[]>(
      db,
      `SELECT action, COUNT(*) as count 
       FROM audit_logs 
       WHERE created_at >= datetime('now', ?)
       GROUP BY action 
       ORDER BY count DESC`,
      [`-${days} days`]
    );
    
    // Get count by day
    const dailyStats = await allAsync<any[]>(
      db,
      `SELECT DATE(created_at) as date, COUNT(*) as count 
       FROM audit_logs 
       WHERE created_at >= datetime('now', ?)
       GROUP BY DATE(created_at) 
       ORDER BY date DESC`,
      [`-${days} days`]
    );
    
    // Get top users by activity
    const userStats = await allAsync<any[]>(
      db,
      `SELECT user_id, COUNT(*) as count 
       FROM audit_logs 
       WHERE created_at >= datetime('now', ?)
       GROUP BY user_id 
       ORDER BY count DESC 
       LIMIT 10`,
      [`-${days} days`]
    );
    
    return {
      actionStats,
      dailyStats,
      userStats,
      total: dailyStats.reduce((sum, day) => sum + day.count, 0)
    };
  } catch (err) {
    console.error('Failed to get audit stats:', err);
    return { actionStats: [], dailyStats: [], userStats: [], total: 0 };
  }
};