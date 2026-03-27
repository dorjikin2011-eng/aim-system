import { Request, Response } from 'express';
import { getDB } from '../models/db';

export const getReportSummary = async (req: Request, res: Response) => {
  try {
    const { fiscal_year } = req.query;
    const db = getDB();
  try {
    const targetFiscalYear = fiscal_year || '2025-26';

    // Count active agencies
    const totalAgencies = await new Promise<number>((resolve, reject) => {
      await getAsync(db, 'SELECT COUNT(*) as count FROM agencies WHERE status = "active"', (err, row) => {
        if (err) return reject(err);
        resolve((row as any)?.count ?? 0);
      });
    });

    // Get active indicators count
    const totalIndicators = await new Promise<number>((resolve, reject) => {
      await getAsync(db, 'SELECT COUNT(*) as count FROM indicators WHERE is_active = 1', (err, row) => {
        if (err) return reject(err);
        resolve((row as any)?.count ?? 0);
      });
    });

    // Count submitted assessments (all indicators completed for an agency)
    const submitted = await new Promise<number>((resolve, reject) => {
      await getAsync(db, 
        `SELECT COUNT(DISTINCT a.id) as count
         FROM agencies a
         WHERE a.status = "active"
           AND EXISTS (
             SELECT 1 FROM indicator_data id 
             WHERE id.agency_id = a.id 
               AND id.fiscal_year = ?
               AND id.status = "final"
           )`,
        [targetFiscalYear],
        (err, row) => {
          if (err) return reject(err);
          resolve((row as any)?.count ?? 0);
        }
      );
    });

    // Fetch scored agencies with their total scores
    const scoredRows = await new Promise<any[]>((resolve, reject) => {
      await allAsync(db, 
        `SELECT a.id, a.name,
                SUM(id.score) as total_score,
                SUM(i.weight) as max_score
         FROM agencies a
         JOIN indicator_data id ON a.id = id.agency_id
         JOIN indicators i ON id.indicator_id = i.id AND i.is_active = 1
         WHERE a.status = "active"
           AND id.fiscal_year = ?
           AND id.status = "final"
         GROUP BY a.id, a.name
         HAVING COUNT(DISTINCT id.indicator_id) = ?`,
        [targetFiscalYear, totalIndicators],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows || []);
        }
      );
    });

    // Calculate percentages and thresholds
    const scoredAgencies = scoredRows
      .filter(row => row.total_score != null && row.max_score > 0)
      .map(row => ({
        ...row,
        total_score: Number(row.total_score),
        max_score: Number(row.max_score),
        percentage: (Number(row.total_score) / Number(row.max_score)) * 100
      }));

    // Get thresholds from system config
    const thresholds = await new Promise<any>((resolve, reject) => {
      await getAsync(db, 
        `SELECT 
          MAX(CASE WHEN config_key = 'high_integrity_min' THEN config_value END) as high_threshold,
          MAX(CASE WHEN config_key = 'medium_integrity_min' THEN config_value END) as medium_threshold
         FROM system_config`,
        (err, row) => {
          if (err) return reject(err);
          resolve(row || {});
        }
      );
    });

    const highThreshold = thresholds.high_threshold ? Number(thresholds.high_threshold) : 80;
    const mediumThreshold = thresholds.medium_threshold ? Number(thresholds.medium_threshold) : 50;

    // Calculate national average percentage
    let nationalAvg = 0;
    if (scoredAgencies.length > 0) {
      const sum = scoredAgencies.reduce((acc, r) => acc + r.percentage, 0);
      nationalAvg = parseFloat((sum / scoredAgencies.length).toFixed(1));
    }

    const highIntegrity = scoredAgencies.filter(r => r.percentage >= highThreshold).length;
    const mediumIntegrity = scoredAgencies.filter(r => r.percentage >= mediumThreshold && r.percentage < highThreshold).length;
    const lowIntegrity = scoredAgencies.filter(r => r.percentage < mediumThreshold).length;

    // Calculate completion rates
    const completionStats = await new Promise<any>((resolve, reject) => {
      await getAsync(db, 
        `SELECT 
          COUNT(DISTINCT id.indicator_id) as indicators_assessed,
          COUNT(DISTINCT id.agency_id) as agencies_started
         FROM indicator_data id
         JOIN agencies a ON id.agency_id = a.id
         WHERE a.status = "active"
           AND id.fiscal_year = ?
           AND id.status IN ('draft', 'final')`,
        [targetFiscalYear],
        (err, row) => {
          if (err) return reject(err);
          resolve(row || {});
        }
      );
    });

    const totalPossibleAssessments = totalAgencies * totalIndicators;
    const overallCompletion = totalPossibleAssessments > 0 
      ? (completionStats.indicators_assessed / totalPossibleAssessments) * 100 
      : 0;

    res.json({
      nationalAvg,
      totalAgencies,
      totalIndicators,
      highIntegrity,
      mediumIntegrity,
      lowIntegrity,
      submitted,
      agenciesStarted: completionStats.agencies_started || 0,
      indicatorsAssessed: completionStats.indicators_assessed || 0,
      overallCompletion: parseFloat(overallCompletion.toFixed(1)),
      thresholds: {
        high: highThreshold,
        medium: mediumThreshold
      },
      fiscalYear: targetFiscalYear
    });
  } catch (err: any) {
    console.error('Report summary error:', err.message || err);
    res.status(500).json({ error: 'Failed to generate report summary' });
  }
};