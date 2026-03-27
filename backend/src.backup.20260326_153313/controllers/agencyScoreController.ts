
// backend/src/controllers/agencyScoreController.ts
import { Request, Response } from 'express';
import { getDB } from '../models/db';

export const getAgencyScores = async (req: Request, res: Response) => {
  try {
    const { fiscal_year } = req.query;
    const db = getDB();
  try {
    
    // Get current active fiscal year or use provided one
    const targetFiscalYear = fiscal_year || '2025-26';
    
    // Get all active indicators first to understand the scoring structure
    const indicators = await new Promise<any[]>((resolve, reject) => {
      await allAsync(db, 
        `SELECT id, weight, category FROM indicators WHERE is_active = 1 ORDER BY display_order`,
        (err, rows) => (err ? reject(err) : resolve(rows))
      );
    });
    
    const rows = await new Promise<any[]>((resolve, reject) => {
      await allAsync(db, 
        `SELECT a.id, a.name, 
                COALESCE(SUM(id.score), 0) as total_score,
                COALESCE(SUM(i.weight), 0) as max_possible_score,
                COUNT(DISTINCT id.indicator_id) as indicators_assessed,
                COUNT(DISTINCT i.id) as total_indicators
         FROM agencies a
         LEFT JOIN indicator_data id ON a.id = id.agency_id 
           AND id.fiscal_year = ? 
           AND id.status = 'final'
         LEFT JOIN indicators i ON i.id = id.indicator_id AND i.is_active = 1
         WHERE a.status = 'active'
         GROUP BY a.id, a.name
         ORDER BY total_score DESC`,
        [targetFiscalYear],
        (err, rows) => (err ? reject(err) : resolve(rows))
      );
    });

    const scores = rows.map(row => ({
      id: row.id,
      name: row.name,
      score: parseFloat(row.total_score) || 0,
      maxScore: parseFloat(row.max_possible_score) || 0,
      percentage: row.max_possible_score > 0 
        ? (parseFloat(row.total_score) / parseFloat(row.max_possible_score)) * 100 
        : 0,
      indicatorsAssessed: row.indicators_assessed,
      totalIndicators: row.total_indicators || indicators.length,
      completionRate: indicators.length > 0 
        ? (row.indicators_assessed / indicators.length) * 100 
        : 0
    }));

    res.json({ 
      success: true, 
      data: scores,
      fiscalYear: targetFiscalYear,
      totalIndicators: indicators.length
    });
  } catch (err) {
    console.error('Agency scores error:', err);
    res.status(500).json({ error: 'Failed to load agency scores' });
  }
};