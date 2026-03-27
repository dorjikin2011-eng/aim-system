// backend/src/controllers/reportController.ts
import { Request, Response } from 'express';
import { getDB, getAsync, allAsync } from '../models/db';

// ============================================
// GET /api/reports/summary
// ============================================
export const getReportSummary = async (req: Request, res: Response) => {
  try {
    const { fiscal_year } = req.query;
    const db = getDB();
    const targetFiscalYear = fiscal_year || '2025-26';

    // Count active agencies
    const totalAgenciesResult = await getAsync<{ count: number }>(
      db, 
      'SELECT COUNT(*) as count FROM agencies WHERE status = "active"',
      []
    );
    const totalAgencies = totalAgenciesResult?.count || 0;

    // Get active indicators count
    const totalIndicatorsResult = await getAsync<{ count: number }>(
      db, 
      'SELECT COUNT(*) as count FROM indicators WHERE is_active = 1',
      []
    );
    const totalIndicators = totalIndicatorsResult?.count || 0;

    // Count submitted assessments (all indicators completed for an agency)
    const submittedResult = await getAsync<{ count: number }>(
      db, 
      `SELECT COUNT(DISTINCT a.id) as count
       FROM agencies a
       WHERE a.status = 'active'
         AND EXISTS (
           SELECT 1 FROM indicator_data id 
           WHERE id.agency_id = a.id 
             AND id.fiscal_year = ?
             AND id.status = 'final'
         )`,
      [targetFiscalYear]
    );
    const submitted = submittedResult?.count || 0;

    // Fetch scored agencies with their total scores
    const scoredRows = await allAsync<any[]>(
      db, 
      `SELECT a.id, a.name,
              SUM(id.score) as total_score,
              SUM(i.weight) as max_score
       FROM agencies a
       JOIN indicator_data id ON a.id = id.agency_id
       JOIN indicators i ON id.indicator_id = i.id AND i.is_active = 1
       WHERE a.status = 'active'
         AND id.fiscal_year = ?
         AND id.status = 'final'
       GROUP BY a.id, a.name
       HAVING COUNT(DISTINCT id.indicator_id) = ?`,
      [targetFiscalYear, totalIndicators]
    );

    // Calculate percentages and thresholds
    const scoredAgencies = scoredRows
      .filter(row => row.total_score != null && row.max_score > 0)
      .map(row => ({
        ...row,
        total_score: Number(row.total_score),
        max_score: Number(row.max_score),
        percentage: (Number(row.total_score) / Number(row.max_score)) * 100
      }));

    // Get thresholds from system_config table
    let highThreshold = 80;
    let mediumThreshold = 50;
    
    try {
      const highConfig = await getAsync<any>(
        db,
        `SELECT config_value FROM system_config WHERE config_key = 'integrity.threshold.high'`,
        []
      );
      if (highConfig && highConfig.config_value) {
        highThreshold = Number(highConfig.config_value);
      }
      
      const mediumConfig = await getAsync<any>(
        db,
        `SELECT config_value FROM system_config WHERE config_key = 'integrity.threshold.medium'`,
        []
      );
      if (mediumConfig && mediumConfig.config_value) {
        mediumThreshold = Number(mediumConfig.config_value);
      }
    } catch (error) {
      console.warn('Could not fetch thresholds from system_config, using defaults:', error);
    }

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
    const completionStats = await getAsync<any>(
      db, 
      `SELECT 
        COUNT(DISTINCT id.indicator_id) as indicators_assessed,
        COUNT(DISTINCT id.agency_id) as agencies_started
       FROM indicator_data id
       JOIN agencies a ON id.agency_id = a.id
       WHERE a.status = 'active'
         AND id.fiscal_year = ?
         AND id.status IN ('draft', 'final')`,
      [targetFiscalYear]
    );

    const totalPossibleAssessments = totalAgencies * totalIndicators;
    const overallCompletion = totalPossibleAssessments > 0 
      ? (completionStats?.indicators_assessed || 0) / totalPossibleAssessments * 100 
      : 0;

    res.json({
      nationalAvg,
      totalAgencies,
      totalIndicators,
      highIntegrity,
      mediumIntegrity,
      lowIntegrity,
      submitted,
      agenciesStarted: completionStats?.agencies_started || 0,
      indicatorsAssessed: completionStats?.indicators_assessed || 0,
      overallCompletion: parseFloat(overallCompletion.toFixed(1)),
      thresholds: {
        high: highThreshold,
        medium: mediumThreshold
      },
      fiscalYear: targetFiscalYear
    });
  } catch (err) {
    console.error('Report summary error:', err);
    res.status(500).json({ error: 'Failed to generate report summary' });
  }
};

// ============================================
// GET /api/reports/agency/:agencyId
// ============================================
export const getAgencyReport = async (req: Request, res: Response) => {
  try {
    const { agencyId } = req.params;
    const { fiscal_year } = req.query;
    const db = getDB();
    const targetFiscalYear = fiscal_year || '2025-26';

    // Get agency details
    const agency = await getAsync<any>(
      db,
      'SELECT id, name, sector, status FROM agencies WHERE id = ?',
      [agencyId]
    );

    if (!agency) {
      return res.status(404).json({ error: 'Agency not found' });
    }

    // Get assessment data
    const assessment = await getAsync<any>(
      db,
      `SELECT * FROM assessments WHERE agency_id = ? AND fiscal_year = ?`,
      [agencyId, targetFiscalYear]
    );

    // Get indicator responses
    const indicators = await allAsync<any[]>(
      db,
      `SELECT 
        id.indicator_id,
        i.name as indicator_name,
        i.code as indicator_code,
        i.category,
        i.weight,
        i.max_score,
        id.score,
        id.value,
        id.metadata,
        id.status
       FROM indicator_data id
       JOIN indicators i ON id.indicator_id = i.id
       WHERE id.agency_id = ? AND id.fiscal_year = ?
       ORDER BY i.display_order`,
      [agencyId, targetFiscalYear]
    );

    // Calculate scores
    let totalScore = 0;
    let maxPossibleScore = 0;
    
    const processedIndicators = indicators.map(ind => {
      const weight = ind.weight || 0;
      const maxScore = ind.max_score || 100;
      const score = ind.score || 0;
      
      totalScore += score;
      maxPossibleScore += weight;
      
      return {
        indicator_id: ind.indicator_id,
        indicator_name: ind.indicator_name,
        indicator_code: ind.indicator_code,
        category: ind.category,
        weight: weight,
        max_score: maxScore,
        score: score,
        value: ind.value,
        metadata: ind.metadata ? JSON.parse(ind.metadata) : {},
        status: ind.status
      };
    });

    const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;

    // Get thresholds
    let highThreshold = 80;
    let mediumThreshold = 50;
    
    try {
      const highConfig = await getAsync<any>(
        db,
        `SELECT config_value FROM system_config WHERE config_key = 'integrity.threshold.high'`,
        []
      );
      if (highConfig && highConfig.config_value) {
        highThreshold = Number(highConfig.config_value);
      }
      
      const mediumConfig = await getAsync<any>(
        db,
        `SELECT config_value FROM system_config WHERE config_key = 'integrity.threshold.medium'`,
        []
      );
      if (mediumConfig && mediumConfig.config_value) {
        mediumThreshold = Number(mediumConfig.config_value);
      }
    } catch (error) {
      console.warn('Could not fetch thresholds, using defaults:', error);
    }

    let integrityLevel = 'Needs Improvement';
    if (percentage >= highThreshold) integrityLevel = 'High Integrity';
    else if (percentage >= mediumThreshold) integrityLevel = 'Medium Integrity';

    res.json({
      agency: {
        id: agency.id,
        name: agency.name,
        sector: agency.sector,
        status: agency.status
      },
      assessment: assessment ? {
        id: assessment.id,
        status: assessment.status,
        overall_score: assessment.overall_score,
        submitted_at: assessment.submitted_at,
        finalized_at: assessment.finalized_at,
        validated_at: assessment.validated_at
      } : null,
      indicators: processedIndicators,
      summary: {
        total_score: totalScore,
        max_possible_score: maxPossibleScore,
        percentage: parseFloat(percentage.toFixed(1)),
        integrity_level: integrityLevel,
        high_threshold: highThreshold,
        medium_threshold: mediumThreshold,
        indicators_completed: indicators.filter(i => i.status === 'final').length,
        total_indicators: indicators.length
      },
      fiscal_year: targetFiscalYear
    });
  } catch (err) {
    console.error('Agency report error:', err);
    res.status(500).json({ error: 'Failed to generate agency report' });
  }
};

// ============================================
// GET /api/reports/export
// ============================================
export const exportReport = async (req: Request, res: Response) => {
  try {
    const { fiscal_year, format = 'csv' } = req.query;
    const db = getDB();
    const targetFiscalYear = fiscal_year || '2025-26';

    // Get all agencies with their scores
    const agencies = await allAsync<any[]>(
      db,
      `SELECT 
        a.id,
        a.name,
        a.sector,
        a.status,
        COALESCE(SUM(id.score), 0) as total_score,
        COALESCE(SUM(i.weight), 0) as max_possible_score,
        COUNT(DISTINCT id.indicator_id) as indicators_completed,
        COUNT(DISTINCT i.id) as total_indicators
       FROM agencies a
       LEFT JOIN indicator_data id ON a.id = id.agency_id AND id.fiscal_year = ? AND id.status = 'final'
       LEFT JOIN indicators i ON id.indicator_id = i.id AND i.is_active = 1
       WHERE a.status = 'active'
       GROUP BY a.id, a.name, a.sector, a.status
       ORDER BY total_score DESC`,
      [targetFiscalYear]
    );

    // Process data for export
    const exportData = agencies.map(agency => {
      const percentage = agency.max_possible_score > 0 
        ? (agency.total_score / agency.max_possible_score) * 100 
        : 0;
      
      return {
        'Agency ID': agency.id,
        'Agency Name': agency.name,
        'Sector': agency.sector,
        'Status': agency.status,
        'Total Score': agency.total_score.toFixed(2),
        'Max Possible Score': agency.max_possible_score.toFixed(2),
        'Percentage': percentage.toFixed(1) + '%',
        'Indicators Completed': agency.indicators_completed,
        'Total Indicators': agency.total_indicators,
        'Completion Rate': agency.total_indicators > 0 
          ? ((agency.indicators_completed / agency.total_indicators) * 100).toFixed(1) + '%' 
          : '0%',
        'Fiscal Year': targetFiscalYear
      };
    });

    if (format === 'csv') {
      // Generate CSV
      const headers = Object.keys(exportData[0] || {});
      const csvRows = exportData.map(row => 
        headers.map(header => {
          const value = row[header as keyof typeof row];
          // Escape quotes and wrap in quotes if needed
          const stringValue = String(value || '');
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',')
      );

      const csvContent = [
        headers.join(','),
        ...csvRows
      ].join('\n');

      res.header('Content-Type', 'text/csv');
      res.header('Content-Disposition', `attachment; filename=aims-report-${targetFiscalYear}.csv`);
      res.send(csvContent);
    } else {
      // JSON format
      res.json({
        success: true,
        data: exportData,
        fiscal_year: targetFiscalYear,
        generated_at: new Date().toISOString()
      });
    }
  } catch (err) {
    console.error('Export report error:', err);
    res.status(500).json({ error: 'Failed to export report' });
  }
};