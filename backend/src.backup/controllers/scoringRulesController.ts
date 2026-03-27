//backend/src/controllers/scoringRulesController.ts
import { Request, Response } from 'express';
import { getDB } from '../models/db';

export const getScoringRules = async (req: Request, res: Response) => {
  try {
    const { indicator_id, include_inactive } = req.query;
    const db = getDB();
    
    let query = 'SELECT sr.*, i.name as indicator_name FROM scoring_rules sr';
    query += ' LEFT JOIN indicators i ON sr.indicator_id = i.id';
    query += ' WHERE 1=1';
    const params: any[] = [];
    
    if (indicator_id) {
      query += ' AND sr.indicator_id = ?';
      params.push(indicator_id);
    }
    
    if (include_inactive !== 'true') {
      query += ' AND sr.is_active = 1';
    }
    
    query += ' ORDER BY i.display_order, sr.parameter, sr.points DESC';
    
    const rows = await new Promise<any[]>((resolve, reject) => {
      db.all(query, params, (err, rows) =>
        err ? reject(err) : resolve(rows || [])
      );
    });
    
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Get rules error:', err);
    res.status(500).json({ error: 'Failed to load scoring rules' });
  }
};

export const createScoringRule = async (req: Request, res: Response) => {
  try {
    const { indicator_id, parameter, points, min_value, max_value, condition, description } = req.body;

    // Validate
    if (!indicator_id) {
      return res.status(400).json({ error: 'Indicator ID is required' });
    }
    if (typeof points !== 'number' || points < 0) {
      return res.status(400).json({ error: 'Points must be a non-negative number' });
    }

    const db = getDB();
    
    // Verify indicator exists and is active
    const indicator = await new Promise<any>((resolve, reject) => {
      db.get('SELECT id, name FROM indicators WHERE id = ? AND is_active = 1', [indicator_id], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
    
    if (!indicator) {
      return res.status(404).json({ error: 'Indicator not found or inactive' });
    }

    const result = await new Promise<{ lastID: number }>((resolve, reject) => {
      db.run(
        `INSERT INTO scoring_rules 
         (indicator_id, parameter, points, min_value, max_value, condition, description, is_active, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [
          indicator_id, 
          parameter || null, 
          points, 
          min_value || null, 
          max_value || null, 
          condition || null, 
          description || null,
          req.user?.email || 'system',
          req.user?.email || 'system'
        ],
        function(err) {
          if (err) return reject(err);
          resolve({ lastID: this.lastID });
        }
      );
    });

    res.json({ 
      success: true, 
      message: 'Scoring rule created',
      id: result.lastID,
      indicator: indicator.name
    });
  } catch (err) {
    console.error('Create rule error:', err);
    res.status(500).json({ error: 'Failed to create scoring rule' });
  }
};

export const updateScoringRule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { indicator_id, parameter, points, min_value, max_value, condition, description, is_active } = req.body;

    // Validate
    if (points !== undefined && (typeof points !== 'number' || points < 0)) {
      return res.status(400).json({ error: 'Points must be a non-negative number' });
    }

    const db = getDB();
    
    // Build dynamic update query
    const updates: string[] = [];
    const params: any[] = [];
    
    if (indicator_id !== undefined) {
      updates.push('indicator_id = ?');
      params.push(indicator_id);
    }
    if (parameter !== undefined) {
      updates.push('parameter = ?');
      params.push(parameter);
    }
    if (points !== undefined) {
      updates.push('points = ?');
      params.push(points);
    }
    if (min_value !== undefined) {
      updates.push('min_value = ?');
      params.push(min_value);
    }
    if (max_value !== undefined) {
      updates.push('max_value = ?');
      params.push(max_value);
    }
    if (condition !== undefined) {
      updates.push('condition = ?');
      params.push(condition);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }
    
    updates.push('updated_by = ?');
    params.push(req.user?.email || 'system');
    updates.push('updated_at = CURRENT_TIMESTAMP');
    
    params.push(id);
    
    if (updates.length === 2) { // Only updated_by and updated_at
      return res.status(400).json({ error: 'No fields to update' });
    }

    const query = `UPDATE scoring_rules SET ${updates.join(', ')} WHERE id = ?`;
    
    await new Promise<void>((resolve, reject) => {
      db.run(query, params, (err) => (err ? reject(err) : resolve()));
    });

    res.json({ success: true, message: 'Scoring rule updated' });
  } catch (err) {
    console.error('Update rule error:', err);
    res.status(500).json({ error: 'Failed to update scoring rule' });
  }
};

export const deleteScoringRule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const db = getDB();
    
    // Check if rule exists
    const rule = await new Promise<any>((resolve, reject) => {
      db.get('SELECT id FROM scoring_rules WHERE id = ?', [id], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
    
    if (!rule) {
      return res.status(404).json({ error: 'Scoring rule not found' });
    }

    await new Promise<void>((resolve, reject) => {
      db.run(
        'DELETE FROM scoring_rules WHERE id = ?',
        [id],
        (err) => (err ? reject(err) : resolve())
      );
    });

    res.json({ success: true, message: 'Scoring rule deleted' });
  } catch (err) {
    console.error('Delete rule error:', err);
    res.status(500).json({ error: 'Failed to delete scoring rule' });
  }
};

export const getIndicatorRules = async (req: Request, res: Response) => {
  try {
    const { indicator_id } = req.params;
    const db = getDB();
    
    const rules = await new Promise<any[]>((resolve, reject) => {
      db.all(
        `SELECT sr.*, i.name as indicator_name, i.code as indicator_code
         FROM scoring_rules sr
         JOIN indicators i ON sr.indicator_id = i.id
         WHERE sr.indicator_id = ? AND sr.is_active = 1
         ORDER BY sr.parameter, sr.points DESC`,
        [indicator_id],
        (err, rows) => (err ? reject(err) : resolve(rows || []))
      );
    });
    
    const indicator = await new Promise<any>((resolve, reject) => {
      db.get(
        'SELECT id, name, code, weight, maxScore, category FROM indicators WHERE id = ?',
        [indicator_id],
        (err, row) => (err ? reject(err) : resolve(row))
      );
    });

    res.json({
      success: true,
      data: {
        indicator,
        rules,
        totalRules: rules.length,
        maxPossibleScore: rules.reduce((sum, rule) => sum + (rule.points || 0), 0)
      }
    });
  } catch (err) {
    console.error('Get indicator rules error:', err);
    res.status(500).json({ error: 'Failed to load indicator rules' });
  }
};