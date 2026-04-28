// backend/src/controllers/scoringRulesController.ts
import { Request, Response } from 'express';
import { getDB, getAsync, runAsync, allAsync } from '../models/db';

// ============================================
// GET /api/scoring-rules
// ============================================
export const getScoringRules = async (req: Request, res: Response) => {
  try {
    const { indicator_id, include_inactive } = req.query;
    const db = getDB();
    
    let query = 'SELECT sr.*, i.name as indicator_name FROM scoring_rules sr';
    query += ' LEFT JOIN indicators i ON sr.indicator_id = i.id';
    query += ' WHERE 1=1';
    const params: any[] = [];
    let paramCounter = 1;
    
    if (indicator_id) {
      query += ` AND sr.indicator_id = $${paramCounter}`;
      params.push(indicator_id);
      paramCounter++;
    }
    
    if (include_inactive !== 'true') {
      query += ` AND sr.is_active = true`;
    }
    
    query += ' ORDER BY i.display_order, sr.parameter, sr.points DESC';
    
    // FIXED: Changed generic type
    const rows = await allAsync<any>(db, query, params);
    
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Get rules error:', err);
    res.status(500).json({ error: 'Failed to load scoring rules' });
  }
};

// ============================================
// POST /api/scoring-rules
// ============================================
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
    // FIXED: Changed ? to $1 and is_active = 1 to true
    const indicator = await getAsync<any>(
      db, 
      'SELECT id, name FROM indicators WHERE id = $1 AND is_active = true', 
      [indicator_id]
    );
    
    if (!indicator) {
      return res.status(404).json({ error: 'Indicator not found or inactive' });
    }

    // Insert new scoring rule
    // FIXED: Changed ? to $1, $2, etc.
    const result = await runAsync(db, 
      `INSERT INTO scoring_rules 
       (indicator_id, parameter, points, min_value, max_value, condition, description, is_active, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9)
       RETURNING id`,
      [
        indicator_id, 
        parameter || null, 
        points, 
        min_value || null, 
        max_value || null, 
        condition || null, 
        description || null,
        (req as any).user?.email || 'system',
        (req as any).user?.email || 'system'
      ]
    );

    // For PostgreSQL with RETURNING, we can get the ID from the result
    // Since runAsync doesn't return rows, we need to query for the last inserted ID
    let lastId: number | null = null;
    try {
      const lastRule = await getAsync<{ id: number }>(
        db,
        'SELECT id FROM scoring_rules ORDER BY id DESC LIMIT 1',
        []
      );
      lastId = lastRule?.id || null;
    } catch (err) {
      console.warn('Could not retrieve last inserted ID:', err);
    }

    res.json({ 
      success: true, 
      message: 'Scoring rule created',
      id: lastId,
      indicator: indicator.name
    });
  } catch (err) {
    console.error('Create rule error:', err);
    res.status(500).json({ error: 'Failed to create scoring rule' });
  }
};

// ============================================
// PUT /api/scoring-rules/:id
// ============================================
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
    let paramCounter = 1;
    
    if (indicator_id !== undefined) {
      updates.push(`indicator_id = $${paramCounter}`);
      params.push(indicator_id);
      paramCounter++;
    }
    if (parameter !== undefined) {
      updates.push(`parameter = $${paramCounter}`);
      params.push(parameter);
      paramCounter++;
    }
    if (points !== undefined) {
      updates.push(`points = $${paramCounter}`);
      params.push(points);
      paramCounter++;
    }
    if (min_value !== undefined) {
      updates.push(`min_value = $${paramCounter}`);
      params.push(min_value);
      paramCounter++;
    }
    if (max_value !== undefined) {
      updates.push(`max_value = $${paramCounter}`);
      params.push(max_value);
      paramCounter++;
    }
    if (condition !== undefined) {
      updates.push(`condition = $${paramCounter}`);
      params.push(condition);
      paramCounter++;
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCounter}`);
      params.push(description);
      paramCounter++;
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCounter}`);
      params.push(is_active);
      paramCounter++;
    }
    
    updates.push(`updated_by = $${paramCounter}`);
    params.push((req as any).user?.email || 'system');
    paramCounter++;
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    
    params.push(id);
    
    if (updates.length === 2) { // Only updated_by and updated_at
      return res.status(400).json({ error: 'No fields to update' });
    }

    const query = `UPDATE scoring_rules SET ${updates.join(', ')} WHERE id = $${paramCounter}`;
    
    await runAsync(db, query, params);

    res.json({ success: true, message: 'Scoring rule updated' });
  } catch (err) {
    console.error('Update rule error:', err);
    res.status(500).json({ error: 'Failed to update scoring rule' });
  }
};

// ============================================
// DELETE /api/scoring-rules/:id
// ============================================
export const deleteScoringRule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const db = getDB();
    
    // Check if rule exists
    // FIXED: Changed ? to $1
    const rule = await getAsync<any>(
      db, 
      'SELECT id FROM scoring_rules WHERE id = $1', 
      [id]
    );
    
    if (!rule) {
      return res.status(404).json({ error: 'Scoring rule not found' });
    }

    // FIXED: Changed ? to $1
    await runAsync(db, 
      'DELETE FROM scoring_rules WHERE id = $1',
      [id]
    );

    res.json({ success: true, message: 'Scoring rule deleted' });
  } catch (err) {
    console.error('Delete rule error:', err);
    res.status(500).json({ error: 'Failed to delete scoring rule' });
  }
};

// ============================================
// GET /api/scoring-rules/indicator/:indicator_id
// ============================================
export const getIndicatorRules = async (req: Request, res: Response) => {
  try {
    const { indicator_id } = req.params;
    const db = getDB();
    
    // FIXED: Changed ? to $1 and generic type
    const rules = await allAsync<any>(
      db, 
      `SELECT sr.*, i.name as indicator_name, i.code as indicator_code
       FROM scoring_rules sr
       JOIN indicators i ON sr.indicator_id = i.id
       WHERE sr.indicator_id = $1 AND sr.is_active = true
       ORDER BY sr.parameter, sr.points DESC`,
      [indicator_id]
    );
    
    // FIXED: Changed ? to $1
    const indicator = await getAsync<any>(
      db, 
      'SELECT id, name, code, weight, max_score as "maxScore", category FROM indicators WHERE id = $1',
      [indicator_id]
    );

    res.json({
      success: true,
      data: {
        indicator: indicator || null,
        rules,
        totalRules: rules.length,
        maxPossibleScore: rules.reduce((sum: number, rule: any) => sum + (rule.points || 0), 0)
      }
    });
  } catch (err) {
    console.error('Get indicator rules error:', err);
    res.status(500).json({ error: 'Failed to load indicator rules' });
  }
};

// ============================================
// POST /api/scoring-rules/calculate
// ============================================
export const calculateScore = async (req: Request, res: Response) => {
  try {
    const { indicator_id, parameter_values } = req.body;
    
    if (!indicator_id || !parameter_values) {
      return res.status(400).json({ error: 'indicator_id and parameter_values are required' });
    }
    
    const db = getDB();
    
    // Get all active rules for this indicator
    // FIXED: Changed ? to $1 and generic type
    const rules = await allAsync<any>(
      db, 
      `SELECT * FROM scoring_rules 
       WHERE indicator_id = $1 AND is_active = true 
       ORDER BY points DESC`,
      [indicator_id]
    );
    
    let totalScore = 0;
    const appliedRules: any[] = [];
    
    // Apply each rule based on parameter values
    for (const rule of rules) {
      let applies = false;
      
      if (rule.parameter) {
        const paramValue = parameter_values[rule.parameter];
        
        if (paramValue !== undefined) {
          // Check condition
          if (rule.condition) {
            // Handle custom condition (could be expression like "> 5")
            try {
              // Simple condition evaluation
              const condition = rule.condition.replace(/\[value\]/g, paramValue);
              // eslint-disable-next-line no-eval
              applies = eval(condition);
            } catch (e) {
              console.error('Error evaluating condition:', e);
              applies = false;
            }
          } else if (rule.min_value !== null && rule.max_value !== null) {
            // Range condition
            applies = paramValue >= rule.min_value && paramValue <= rule.max_value;
          } else if (rule.min_value !== null) {
            applies = paramValue >= rule.min_value;
          } else if (rule.max_value !== null) {
            applies = paramValue <= rule.max_value;
          } else {
            // Exact match condition
            applies = paramValue === rule.parameter;
          }
        }
      } else {
        // No parameter specified - this is a default rule
        applies = true;
      }
      
      if (applies) {
        totalScore += rule.points;
        appliedRules.push({
          rule_id: rule.id,
          parameter: rule.parameter,
          condition: rule.condition,
          min_value: rule.min_value,
          max_value: rule.max_value,
          points: rule.points,
          description: rule.description
        });
        
        // Stop after first matching rule if it's a catch-all
        if (!rule.parameter) {
          break;
        }
      }
    }
    
    // Get indicator max score
    // FIXED: Changed ? to $1
    const indicator = await getAsync<any>(
      db,
      'SELECT max_score FROM indicators WHERE id = $1',
      [indicator_id]
    );
    
    const maxScore = indicator?.max_score || 100;
    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    
    res.json({
      success: true,
      data: {
        indicator_id,
        total_score: totalScore,
        max_score: maxScore,
        percentage: parseFloat(percentage.toFixed(1)),
        applied_rules: appliedRules,
        rules_processed: rules.length,
        rules_applied: appliedRules.length
      }
    });
  } catch (err) {
    console.error('Calculate score error:', err);
    res.status(500).json({ error: 'Failed to calculate score' });
  }
};