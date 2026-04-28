// backend/src/controllers/agencyScoreController.ts
import { Request, Response } from 'express';
import { getDB, allAsync } from '../models/db';

// ============================================
// GET /api/reports/agency-scores
// Description: Get all agency scores for the bar chart
// ============================================
export const getAgencyScores = async (req: Request, res: Response) => {
  try {
    const { fiscal_year } = req.query;
    const db = getDB();
    
    // Get current active fiscal year or use provided one
    const currentYear = new Date().getFullYear();
    const defaultFy = `${currentYear}–${currentYear + 1}`;
    const targetFiscalYear = fiscal_year || defaultFy;
    
    console.log('📊 Fetching agency scores for FY:', targetFiscalYear);
    
    // Get all active agencies with their assessment scores
    const rows = await allAsync<any>(db, `
      SELECT 
        a.id,
        a.name,
        a.sector,
        COALESCE(ass.overall_score, 0) as total_score,
        COALESCE(ass.status, 'NOT_STARTED') as status,
        ass.fiscal_year,
        ass.finalized_at,
        ass.updated_at
      FROM agencies a
      LEFT JOIN assessments ass ON a.id = ass.agency_id AND ass.fiscal_year = $1
      WHERE a.status = 'active'
      ORDER BY COALESCE(ass.overall_score, 0) DESC, a.name ASC
    `, [targetFiscalYear]);
    
    console.log(`📊 Found ${rows.length} agencies for FY ${targetFiscalYear}`);
    
    // Get total indicators count for reference
    let totalIndicators = 5; // Default AIMS has 5 indicators
    try {
      const indicatorsResult = await allAsync<any>(db, 
        `SELECT COUNT(*) as count FROM indicators WHERE is_active = true`,
        []
      );
      if (indicatorsResult && indicatorsResult.length > 0) {
        totalIndicators = indicatorsResult[0].count || 5;
      }
    } catch (err) {
      console.log('Could not fetch indicators count, using default 5');
    }
    
    const scores = rows.map(row => ({
      id: row.id,
      name: row.name,
      sector: row.sector,
      score: parseFloat(row.total_score) || 0,
      maxScore: 100, // AIMS total max score is 100
      percentage: parseFloat(row.total_score) || 0,
      status: row.status,
      fiscalYear: row.fiscal_year || targetFiscalYear,
      finalizedAt: row.finalized_at,
      updatedAt: row.updated_at
    }));
    
    // Also return a list of agencies for the timeline dropdown
    const agenciesList = rows.map(row => ({
      id: row.id,
      name: row.name,
      sector: row.sector
    }));
    
    res.json({ 
      success: true, 
      agencies: scores,
      agency_list: agenciesList,
      fiscalYear: targetFiscalYear,
      totalIndicators: totalIndicators,
      totalAgencies: rows.length
    });
  } catch (err) {
    console.error('Agency scores error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to load agency scores',
      details: process.env.NODE_ENV === 'development' ? (err instanceof Error ? err.message : 'Unknown error') : undefined
    });
  }
};