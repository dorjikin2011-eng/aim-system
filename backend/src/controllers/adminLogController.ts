// backend/src/controllers/adminLogController.ts
import { Request, Response } from 'express';
import { getDB } from '../models/db';

// GET /api/admin/logs
export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const { action, actor, startDate, endDate } = req.query;
    const db = getDB();

    // ✅ FIXED: Use actual columns that exist in audit_logs table
    let query = `
      SELECT 
        al.id,
        al.user_id,                    -- ✅ CORRECT: user_id exists
        al.action,
        al.resource_type,              -- ✅ CORRECT: resource_type exists
        al.resource_id,                -- ✅ CORRECT: resource_id exists
        al.details,
        al.ip_address,
        al.user_agent,
        al.created_at
      FROM audit_logs al
      WHERE 1=1
    `;
    const params: any[] = [];

    // Filter by action type
    if (action) {
      query += ' AND al.action = ?';
      params.push(action);
    }
    
    // Filter by actor (search in user_id) - ✅ FIXED
    if (actor) {
      query += ' AND al.user_id LIKE ?';
      params.push(`%${actor}%`);
    }
    
    // Filter by start date
    if (startDate) {
      query += ' AND al.created_at >= ?';
      params.push(new Date(startDate as string).toISOString());
    }
    
    // Filter by end date
    if (endDate) {
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      query += ' AND al.created_at <= ?';
      params.push(end.toISOString());
    }

    query += ' ORDER BY al.created_at DESC LIMIT 500';

    const logs = await new Promise<any[]>((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // ✅ FIXED: Format with correct field names
    const formattedLogs = logs.map(log => {
      let details = {};
      try {
        details = log.details ? JSON.parse(log.details) : {};
      } catch {
        details = { raw: log.details };
      }

      return {
        id: log.id,
        actor_id: log.user_id,                    // ✅ Map user_id to actor_id for frontend
        actor_email: log.user_id || 'Unknown',    // ✅ Use user_id as email
        actor_name: log.user_id || 'Unknown',     // ✅ Use user_id as name
        actor_role: 'Unknown',                    // ✅ Not available in table
        action: log.action,
        action_type: log.action,
        target_type: log.resource_type || 'Unknown',
        target_id: log.resource_id || 'Unknown',
        target_name: log.resource_type || 'Unknown',
        details: details,
        created_at: log.created_at,
        ip_address: log.ip_address,
        user_agent: log.user_agent
      };
    });

    res.json({ 
      success: true,
      logs: formattedLogs,
      count: formattedLogs.length
    });
  } catch (err) {
    console.error('Audit log fetch error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch logs',
      message: err instanceof Error ? err.message : 'Unknown error'
    });
  }
};

// GET /api/admin/logs/export
export const exportAuditLogs = async (req: Request, res: Response) => {
  try {
    const { action, actor, startDate, endDate } = req.query;
    const db = getDB();

    // ✅ FIXED: Use correct column names
    let query = `
      SELECT 
        al.created_at as "Timestamp",
        al.user_id as "Actor Email",        -- ✅ CORRECT
        al.action as "Action",
        al.resource_type as "Target Type",
        al.resource_id as "Target ID",
        al.details as "Details",
        al.ip_address as "IP Address"
      FROM audit_logs al
      WHERE 1=1
    `;
    const params: any[] = [];

    // Apply filters
    if (action) { 
      query += ' AND al.action = ?';
      params.push(action); 
    }
    
    if (actor) { 
      query += ' AND al.user_id LIKE ?';  // ✅ CORRECT
      params.push(`%${actor}%`);
    }
    
    if (startDate) { 
      query += ' AND al.created_at >= ?';  // ✅ CORRECT
      params.push(new Date(startDate as string).toISOString()); 
    }
    
    if (endDate) { 
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      query += ' AND al.created_at <= ?';  // ✅ CORRECT
      params.push(end.toISOString()); 
    }

    query += ' ORDER BY al.created_at DESC';  // ✅ CORRECT

    const logs = await new Promise<any[]>((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Generate CSV content
    let csvContent = '';
    
    if (logs.length > 0) {
      const headers = Object.keys(logs[0]);
      const csvRows = logs.map(row => 
        headers.map(header => {
          const value = row[header];
          // Handle JSON details
          if (header === 'Details' && value) {
            try {
              const parsed = typeof value === 'string' ? JSON.parse(value) : value;
              return JSON.stringify(parsed);
            } catch {
              return value;
            }
          }
          
          // Escape quotes and wrap in quotes if needed
          const stringValue = String(value || '');
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',')
      );

      csvContent = [
        headers.join(','),
        ...csvRows
      ].join('\n');
    } else {
      // Empty CSV with headers
      csvContent = 'Timestamp,Actor Email,Action,Target Type,Target ID,Details,IP Address';
    }

    // Set response headers for CSV download
    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', `attachment; filename=audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (err) {
    console.error('Audit log export error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Export failed',
      message: err instanceof Error ? err.message : 'Unknown error'
    });
  }
};

// GET /api/admin/logs/stats
export const getAuditLogStats = async (req: Request, res: Response) => {
  try {
    const db = getDB();

    // Get total count
    const totalCount = await new Promise<number>((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM audit_logs', (err, row: any) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    // Get actions by type - ✅ FIXED: Use correct column names
    const actionsByType = await new Promise<any[]>((resolve, reject) => {
      db.all(`
        SELECT action, COUNT(*) as count 
        FROM audit_logs 
        GROUP BY action 
        ORDER BY count DESC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Get top actors - ✅ FIXED: Use user_id
    const topActors = await new Promise<any[]>((resolve, reject) => {
      db.all(`
        SELECT 
          al.user_id as email,
          al.user_id as name,
          COUNT(al.id) as action_count
        FROM audit_logs al
        GROUP BY al.user_id
        ORDER BY action_count DESC
        LIMIT 10
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Get recent activity (last 7 days) - ✅ FIXED: Use created_at
    const recentActivity = await new Promise<any[]>((resolve, reject) => {
      db.all(`
        SELECT 
          DATE(al.created_at) as date,
          COUNT(*) as count
        FROM audit_logs al
        WHERE al.created_at >= DATE('now', '-7 days')
        GROUP BY DATE(al.created_at)
        ORDER BY date DESC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({
      success: true,
      stats: {
        total: totalCount,
        actions: actionsByType,
        top_actors: topActors,
        recent_activity: recentActivity,
        last_updated: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('Audit log stats error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats'
    });
  }
};

// GET /api/admin/logs/:id
export const getAuditLogById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDB();

    const log = await new Promise<any>((resolve, reject) => {
      db.get(`
        SELECT 
          al.*
        FROM audit_logs al
        WHERE al.id = ?
      `, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!log) {
      return res.status(404).json({
        success: false,
        error: 'Audit log not found'
      });
    }

    // Parse details if it's a JSON string
    if (log.details && typeof log.details === 'string') {
      try {
        log.details = JSON.parse(log.details);
      } catch {
        // Keep as string if not valid JSON
      }
    }

    res.json({
      success: true,
      log: {
        id: log.id,
        actor_id: log.user_id,           // ✅ Map user_id to actor_id
        actor_email: log.user_id || 'Unknown',
        actor_name: log.user_id || 'Unknown',
        actor_role: 'Unknown',
        action: log.action,
        action_type: log.action,
        target_type: log.resource_type || 'Unknown',
        target_id: log.resource_id || 'Unknown',
        target_name: log.resource_type || 'Unknown',
        details: log.details,
        created_at: log.created_at,
        ip_address: log.ip_address,
        user_agent: log.user_agent
      }
    });
  } catch (err) {
    console.error('Audit log by ID error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch log'
    });
  }
};