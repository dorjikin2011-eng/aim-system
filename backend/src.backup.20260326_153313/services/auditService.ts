
import { Request } from 'express';
import { getDB } from '../models/db';
import { v4 as uuidv4 } from 'uuid';

export const logAction = async (
  req: Request,
  action: string,
  target: { type: string; id?: string },
  details?: Record<string, any>
) => {
  const db = getDB();
  
  try {
    await new Promise<void>((resolve, reject) => {
      db.run(
        `INSERT INTO audit_logs 
         (id, actor_id, actor_email, action, target_type, target_id, details, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          req.session?.user?.id ?? 'anonymous',
          req.session?.user?.email ?? 'anonymous',
          action,
          target.type,
          target.id || null,
          JSON.stringify(details || {}),
          req.ip || req.ips?.[0] || 'unknown',
          req.get('User-Agent') || 'unknown'
        ],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  } catch (err) {
    console.error('Audit log failed:', err);
    // Never fail the main operation due to audit failure
  }
};