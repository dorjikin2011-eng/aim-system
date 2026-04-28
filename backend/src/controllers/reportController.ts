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
    // Get current year for default fiscal year (format: 2026–2027)
const currentYear = new Date().getFullYear();
const defaultFiscalYear = `${currentYear}–${currentYear + 1}`;
const targetFiscalYear = fiscal_year || defaultFiscalYear;

console.log('📊 Report Summary - Target FY:', targetFiscalYear);

    // Count active agencies
    const totalAgenciesResult = await getAsync<{ count: number }>(
      db, 
      "SELECT COUNT(*) as count FROM agencies WHERE status = 'active'",
      []
    );
    const totalAgencies = totalAgenciesResult?.count || 0;

    // Get active indicators count
    const totalIndicatorsResult = await getAsync<{ count: number }>(
      db, 
      "SELECT COUNT(*) as count FROM indicators WHERE is_active = true",
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
           SELECT 1 FROM assessments ass 
           WHERE ass.agency_id = a.id 
             AND ass.fiscal_year = $1
             AND ass.status = 'FINALIZED'
         )`,
      [targetFiscalYear]
    );
    const submitted = submittedResult?.count || 0;

    // Fetch scored agencies with their total scores
    const scoredRows = await allAsync<any>(
      db, 
      `SELECT a.id, a.name,
              ass.overall_score as total_score,
              100 as max_score
       FROM agencies a
       JOIN assessments ass ON a.id = ass.agency_id
       WHERE a.status = 'active'
         AND ass.fiscal_year = $1
         AND ass.status = 'FINALIZED'
       GROUP BY a.id, a.name, ass.overall_score`,
      [targetFiscalYear]
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
        `SELECT config_value FROM system_config WHERE config_key = $1`,
        ['integrity.threshold.high']
      );
      if (highConfig && highConfig.config_value) {
        highThreshold = Number(highConfig.config_value);
      }
      
      const mediumConfig = await getAsync<any>(
        db,
        `SELECT config_value FROM system_config WHERE config_key = $1`,
        ['integrity.threshold.medium']
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
        COUNT(DISTINCT dar.indicator_id) as indicators_assessed,
        COUNT(DISTINCT a.agency_id) as agencies_started
       FROM assessments a
       JOIN dynamic_assessment_responses dar ON a.id = dar.assessment_id
       JOIN agencies ag ON a.agency_id = ag.id
       WHERE ag.status = 'active'
         AND a.fiscal_year = $1
         AND a.status IN ('IN_PROGRESS', 'SUBMITTED_TO_AGENCY', 'AWAITING_VALIDATION', 'FINALIZED')`,
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
    // Get current year for default fiscal year (format: 2026–2027)
const currentYear = new Date().getFullYear();
const defaultFiscalYear = `${currentYear}–${currentYear + 1}`;
const targetFiscalYear = fiscal_year || defaultFiscalYear;

    const agency = await getAsync<any>(
      db,
      'SELECT id, name, sector, status FROM agencies WHERE id = $1',
      [agencyId]
    );

    if (!agency) {
      return res.status(404).json({ error: 'Agency not found' });
    }

    const assessment = await getAsync<any>(
      db,
      `SELECT * FROM assessments WHERE agency_id = $1 AND fiscal_year = $2`,
      [agencyId, targetFiscalYear]
    );

    const indicators = await allAsync<any>(
      db,
      `SELECT 
        dar.indicator_id,
        i.name as indicator_name,
        i.code as indicator_code,
        i.category,
        i.weight,
        i.max_score,
        dar.final_score as score,
        dar.response_data,
        dar.comments,
        'final' as status
       FROM dynamic_assessment_responses dar
       JOIN indicators i ON dar.indicator_id = i.id
       WHERE dar.assessment_id IN (
         SELECT id FROM assessments WHERE agency_id = $1 AND fiscal_year = $2
       )
       ORDER BY i.display_order`,
      [agencyId, targetFiscalYear]
    );

    let totalScore = 0;
    let maxPossibleScore = 0;
    
    const processedIndicators = indicators.map(ind => {
      const weight = ind.weight || 0;
      const maxScore = ind.max_score || 100;
      const score = ind.score || 0;
      
      totalScore += score;
      maxPossibleScore += weight;
      
      let responseData = {};
      try {
        responseData = ind.response_data ? 
          (typeof ind.response_data === 'string' ? JSON.parse(ind.response_data) : ind.response_data) : {};
      } catch (e) {
        console.error('Error parsing response data:', e);
      }
      
      return {
        indicator_id: ind.indicator_id,
        indicator_name: ind.indicator_name,
        indicator_code: ind.indicator_code,
        category: ind.category,
        weight: weight,
        max_score: maxScore,
        score: score,
        value: responseData,
        metadata: responseData,
        status: ind.status
      };
    });

    const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;

    let highThreshold = 80;
    let mediumThreshold = 50;
    
    try {
      const highConfig = await getAsync<any>(
        db,
        `SELECT config_value FROM system_config WHERE config_key = $1`,
        ['integrity.threshold.high']
      );
      if (highConfig && highConfig.config_value) {
        highThreshold = Number(highConfig.config_value);
      }
      
      const mediumConfig = await getAsync<any>(
        db,
        `SELECT config_value FROM system_config WHERE config_key = $1`,
        ['integrity.threshold.medium']
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
    // Get current year for default fiscal year (format: 2026–2027)
const currentYear = new Date().getFullYear();
const defaultFiscalYear = `${currentYear}–${currentYear + 1}`;
const targetFiscalYear = fiscal_year || defaultFiscalYear;

    const agencies = await allAsync<any>(
      db,
      `SELECT 
        a.id,
        a.name,
        a.sector,
        a.status,
        COALESCE(ass.overall_score, 0) as total_score,
        100 as max_possible_score,
        COUNT(DISTINCT dar.indicator_id) as indicators_completed,
        (SELECT COUNT(*) FROM indicators WHERE is_active = true) as total_indicators
       FROM agencies a
       LEFT JOIN assessments ass ON a.id = ass.agency_id AND ass.fiscal_year = $1 AND ass.status = 'FINALIZED'
       LEFT JOIN dynamic_assessment_responses dar ON ass.id = dar.assessment_id
       WHERE a.status = 'active'
       GROUP BY a.id, a.name, a.sector, a.status, ass.overall_score
       ORDER BY total_score DESC`,
      [targetFiscalYear]
    );

    const exportData = agencies.map(agency => {
      const percentage = agency.max_possible_score > 0 
        ? (agency.total_score / agency.max_possible_score) * 100 
        : 0;
      
      return {
        'Agency ID': agency.id,
        'Agency Name': agency.name,
        'Sector': agency.sector,
        'Status': agency.status,
        'Total Score': Number(agency.total_score).toFixed(2),
        'Max Possible Score': Number(agency.max_possible_score).toFixed(2),
        'Percentage': percentage.toFixed(1) + '%',
        'Indicators Completed': Number(agency.indicators_completed),
        'Total Indicators': Number(agency.total_indicators),
        'Completion Rate': agency.total_indicators > 0 
          ? ((agency.indicators_completed / agency.total_indicators) * 100).toFixed(1) + '%' 
          : '0%',
        'Fiscal Year': targetFiscalYear
      };
    });

    if (format === 'csv') {
      const headers = Object.keys(exportData[0] || {});
      const csvRows = exportData.map(row => 
        headers.map(header => {
          const value = row[header as keyof typeof row];
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

// ============================================
// GET /api/reports/overall
// Description: Generates an overall report for all agencies for a specific fiscal year
// ============================================
export const getOverallReport = async (req: Request, res: Response) => {
  try {
    const { fy } = req.query;
    const db = getDB();
    
    let dbFy = String(fy).replace('-', '–'); 
    if (dbFy.includes('–')) {
      const parts = dbFy.split('–');
      if (parts[1].length === 2) {
        const century = parts[0].substring(0, 2); 
        dbFy = `${parts[0]}–${century}${parts[1]}`;
      }
    }

    const assessments = await allAsync<any>(
      db,
      `SELECT a.*, ag.name as agency_name, ag.sector 
       FROM assessments a
       JOIN agencies ag ON a.agency_id = ag.id
       WHERE a.fiscal_year = $1`,
      [dbFy]
    );

    const totalAgencies = assessments.length;
    const finalizedAssessments = assessments.filter(a => a.status === 'FINALIZED');
    const inProgressAssessments = assessments.filter(a => a.status !== 'FINALIZED');
    
    const scores = finalizedAssessments.map(a => a.overall_score || 0);
    const averageScore = finalizedAssessments.length > 0 
      ? scores.reduce((a, b) => a + b, 0) / finalizedAssessments.length 
      : 0;

    let highIntegrity = 0;
    let mediumIntegrity = 0;
    let needsImprovement = 0;

    finalizedAssessments.forEach(a => {
      const score = a.overall_score || 0;
      if (score >= 80) highIntegrity++;
      else if (score >= 50) mediumIntegrity++;
      else needsImprovement++;
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalAgencies,
          finalizedCount: finalizedAssessments.length,
          inProgressCount: inProgressAssessments.length,
          averageScore: Math.round(averageScore * 10) / 10,
          highestScore: scores.length > 0 ? Math.max(...scores) : 0,
          lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
          highIntegrity,
          high_integrity: highIntegrity,
          mediumIntegrity,
          medium_integrity: mediumIntegrity,
          needsImprovement,
          needs_improvement: needsImprovement,
          fiscalYear: fy
        },
        assessments: assessments.map(a => {
          const score = a.overall_score || 0;
          let integrityLevel = 'Needs Improvement';
          if (score >= 80) integrityLevel = 'High Integrity';
          else if (score >= 50) integrityLevel = 'Medium Integrity';

          return {
            agencyName: a.agency_name,
            agency_name: a.agency_name, 
            sector: a.sector,
            score: score,
            status: a.status,
            finalizedAt: a.finalized_at,
            integrityLevel: integrityLevel,
            indicatorScores: typeof a.indicator_scores === 'string' 
              ? JSON.parse(a.indicator_scores) 
              : a.indicator_scores
          };
        })
      }
    });
  } catch (error) {
    console.error('❌ Error generating overall report:', error);
    res.status(500).json({ success: false, error: 'Failed to generate overall report' });
  }
};

// ============================================
// NEW: GET /api/reports/agency-rankings
// Description: Get agency rankings based on overall scores for current FY
// ============================================
export const getAgencyRankings = async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const currentYear = new Date().getFullYear();
    const fiscalYear = `${currentYear}–${currentYear + 1}`;
    
    const rankings = await allAsync<any>(db, `
      SELECT 
        a.id as agency_id,
        a.name as agency_name,
        a.sector,
        COALESCE(ass.overall_score, 0) as overall_score,
        COALESCE(ass.status, 'NOT_STARTED') as status,
        ass.fiscal_year,
        CASE 
          WHEN COALESCE(ass.overall_score, 0) >= 80 THEN 'High Integrity'
          WHEN COALESCE(ass.overall_score, 0) >= 50 THEN 'Medium Integrity'
          ELSE 'Needs Improvement'
        END as integrity_level,
        COALESCE(ass.finalized_at, ass.updated_at) as last_assessed
      FROM agencies a
      LEFT JOIN assessments ass ON a.id = ass.agency_id AND ass.fiscal_year = $1
      WHERE a.status = 'active'
      ORDER BY COALESCE(ass.overall_score, 0) DESC
    `, [fiscalYear]);
    
    const rankedAgencies = rankings.map((agency, index) => ({
      ...agency,
      rank: index + 1,
      rank_label: index === 0 ? '🥇 1st' : index === 1 ? '🥈 2nd' : index === 2 ? '🥉 3rd' : `${index + 1}th`
    }));
    
    res.json({
      success: true,
      data: {
        fiscal_year: fiscalYear,
        total_agencies: rankedAgencies.length,
        rankings: rankedAgencies
      }
    });
    
  } catch (error) {
    console.error('Error fetching agency rankings:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch agency rankings' });
  }
};

// ============================================
// GET /api/reports/parameter-comparison
// Description: Get parameter-level comparison across all agencies
// ============================================
export const getParameterComparison = async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const currentYear = new Date().getFullYear();
    const fiscalYear = `${currentYear}–${currentYear + 1}`;
    
    console.log('📊 Parameter Comparison - Fetching for FY:', fiscalYear);
    
    // Get all agencies with their assessment data
    const agencies = await allAsync<any>(db, `
  SELECT 
    a.id as agency_id,
    a.name as agency_name,
    a.sector,
    ass.overall_score,
    ass.indicator_scores,
    ass.status,
    ass.fiscal_year
  FROM agencies a
  LEFT JOIN assessments ass ON a.id = ass.agency_id AND ass.fiscal_year = $1
  WHERE a.status = 'active'
  ORDER BY a.name
`, [fiscalYear]);
    
    console.log('📊 Found agencies:', agencies.length);
    
    // For each agency, get the parameter data from dynamic_assessment_responses
    const parameterData = [];
    
    for (const agency of agencies) {
      // Get the assessment ID for this agency and FY
      const assessment = await getAsync<any>(db, `
        SELECT id FROM assessments 
        WHERE agency_id = $1 AND fiscal_year = $2
      `, [agency.agency_id, fiscalYear]);
      
      let parameters = {
        iccs_complaint: 0,
        iccs_coi: 0,
        iccs_gift: 0,
        iccs_proactive: 0,
        training_total_employees: 0,
        training_completed_employees: 0,
        training_percentage: 0,
        ad_total_officials: 0,
        ad_submitted_officials: 0,
        ad_percentage: 0,
        coc_level: 0,
        cases_convictions: 0,
        cases_prosecutions: 0,
        cases_admin_actions: 0,
        cases_score: 0
      };
      
      if (assessment) {
        // Get ICCS parameter data
        const iccsResponse = await getAsync<any>(db, `
          SELECT response_data FROM dynamic_assessment_responses 
          WHERE assessment_id = $1 AND indicator_id = $2
        `, [assessment.id, 'ind_iccs_v3']);
        
        if (iccsResponse && iccsResponse.response_data) {
          let data = iccsResponse.response_data;
          if (typeof data === 'string') data = JSON.parse(data);
          parameters.iccs_complaint = parseInt(data.complaint_level) || 0;
          parameters.iccs_coi = parseInt(data.coi_level) || 0;
          parameters.iccs_gift = parseInt(data.gift_level) || 0;
          parameters.iccs_proactive = parseInt(data.proactive_level) || 0;
        }
        
        // Get Training parameter data
        const trainingResponse = await getAsync<any>(db, `
          SELECT response_data FROM dynamic_assessment_responses 
          WHERE assessment_id = $1 AND indicator_id = $2
        `, [assessment.id, 'ind_training_v3']);
        
        if (trainingResponse && trainingResponse.response_data) {
          let data = trainingResponse.response_data;
          if (typeof data === 'string') data = JSON.parse(data);
          parameters.training_total_employees = parseInt(data.total_employees) || 0;
          parameters.training_completed_employees = parseInt(data.completed_employees) || 0;
          parameters.training_percentage = parameters.training_total_employees > 0 
            ? (parameters.training_completed_employees / parameters.training_total_employees) * 100 
            : 0;
        }
        
        // Get Asset Declaration parameter data
        const adResponse = await getAsync<any>(db, `
          SELECT response_data FROM dynamic_assessment_responses 
          WHERE assessment_id = $1 AND indicator_id = $2
        `, [assessment.id, 'ind_ad_v3']);
        
        if (adResponse && adResponse.response_data) {
          let data = adResponse.response_data;
          if (typeof data === 'string') data = JSON.parse(data);
          parameters.ad_total_officials = parseInt(data.total_covered_officials) || 0;
          parameters.ad_submitted_officials = parseInt(data.officials_submitted_on_time) || 0;
          parameters.ad_percentage = parameters.ad_total_officials > 0 
            ? (parameters.ad_submitted_officials / parameters.ad_total_officials) * 100 
            : 0;
        }
        
        // Get Code of Conduct parameter data
        const cocResponse = await getAsync<any>(db, `
          SELECT response_data FROM dynamic_assessment_responses 
          WHERE assessment_id = $1 AND indicator_id = $2
        `, [assessment.id, 'ind_coc_v3']);
        
        if (cocResponse && cocResponse.response_data) {
          let data = cocResponse.response_data;
          if (typeof data === 'string') data = JSON.parse(data);
          parameters.coc_level = data.coc_level || 0;
        }
        
        // Get Cases parameter data
const casesResponse = await getAsync<any>(db, `
  SELECT response_data FROM dynamic_assessment_responses 
  WHERE assessment_id = $1 AND indicator_id = $2
`, [assessment.id, 'ind_cases_v3']);

// First, get the stored cases_score from indicator_scores in assessments table
let storedCasesScore = 0;
if (agency.indicator_scores) {
  let indicatorScores = agency.indicator_scores;
  if (typeof indicatorScores === 'string') {
    indicatorScores = JSON.parse(indicatorScores);
  }
  storedCasesScore = indicatorScores.ind_cases_v3 || 0;
}

if (casesResponse && casesResponse.response_data) {
  let data = casesResponse.response_data;
  if (typeof data === 'string') data = JSON.parse(data);
  parameters.cases_convictions = parseInt(data.conviction_cases) || 0;
  parameters.cases_prosecutions = parseInt(data.prosecution_cases) || 0;
  parameters.cases_admin_actions = parseInt(data.admin_action_cases) || 0;
  // Use the stored score from assessments table, NOT recalculated from individual counts
  parameters.cases_score = storedCasesScore;
}
      }
      
      parameterData.push({
        agency_id: agency.agency_id,
        agency_name: agency.agency_name,
        sector: agency.sector,
        overall_score: agency.overall_score || 0,
        status: agency.status || 'NOT_STARTED',
        parameters: parameters
      });
    }
    
    // Calculate averages
    const assessedAgencies = parameterData.filter(a => a.overall_score > 0);
    const averages = {
  iccs_complaint: 0,
  iccs_coi: 0,
  iccs_gift: 0,
  iccs_proactive: 0,
  training_percentage: 0,
  ad_percentage: 0,
  coc_level: 0,
  cases_score: 0,
  cases_convictions: 0,
  cases_prosecutions: 0,
  cases_admin_actions: 0,
  total_score: 0
};
    
    if (assessedAgencies.length > 0) {
  averages.iccs_complaint = assessedAgencies.reduce((sum, a) => sum + a.parameters.iccs_complaint, 0) / assessedAgencies.length;
  averages.iccs_coi = assessedAgencies.reduce((sum, a) => sum + a.parameters.iccs_coi, 0) / assessedAgencies.length;
  averages.iccs_gift = assessedAgencies.reduce((sum, a) => sum + a.parameters.iccs_gift, 0) / assessedAgencies.length;
  averages.iccs_proactive = assessedAgencies.reduce((sum, a) => sum + a.parameters.iccs_proactive, 0) / assessedAgencies.length;
  averages.training_percentage = assessedAgencies.reduce((sum, a) => sum + a.parameters.training_percentage, 0) / assessedAgencies.length;
  averages.ad_percentage = assessedAgencies.reduce((sum, a) => sum + a.parameters.ad_percentage, 0) / assessedAgencies.length;
  averages.coc_level = assessedAgencies.reduce((sum, a) => sum + a.parameters.coc_level, 0) / assessedAgencies.length;
  averages.cases_score = assessedAgencies.reduce((sum, a) => sum + a.parameters.cases_score, 0) / assessedAgencies.length;
  averages.cases_convictions = assessedAgencies.reduce((sum, a) => sum + a.parameters.cases_convictions, 0) / assessedAgencies.length;
  averages.cases_prosecutions = assessedAgencies.reduce((sum, a) => sum + a.parameters.cases_prosecutions, 0) / assessedAgencies.length;
  averages.cases_admin_actions = assessedAgencies.reduce((sum, a) => sum + a.parameters.cases_admin_actions, 0) / assessedAgencies.length;
  averages.total_score = assessedAgencies.reduce((sum, a) => sum + a.overall_score, 0) / assessedAgencies.length;
}
    
    console.log('📊 Parameter averages:', averages);
    
    res.json({
      success: true,
      data: {
        fiscal_year: fiscalYear,
        agencies: parameterData,
        averages: averages,
        total_agencies: parameterData.length,
        assessed_agencies: assessedAgencies.length
      }
    });
    
  } catch (error) {
    console.error('Error fetching parameter comparison:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch parameter comparison' });
  }
};

// ============================================
// NEW: GET /api/reports/agency-timeline
// Description: Get year-on-year performance trend for an agency
// Query params: agencyId (required)
// ============================================
export const getAgencyTimeline = async (req: Request, res: Response) => {
  try {
    const { agencyId } = req.query;
    
    if (!agencyId) {
      return res.status(400).json({ success: false, error: 'agencyId is required' });
    }
    
    const db = getDB();
    
    const agency = await getAsync<any>(db, `
      SELECT id, name, sector FROM agencies WHERE id = $1 AND status = 'active'
    `, [agencyId]);
    
    if (!agency) {
      return res.status(404).json({ success: false, error: 'Agency not found' });
    }
    
    const timeline = await allAsync<any>(db, `
      SELECT 
        fiscal_year,
        overall_score,
        indicator_scores,
        status,
        finalized_at,
        updated_at
      FROM assessments 
      WHERE agency_id = $1
      ORDER BY fiscal_year ASC
    `, [agencyId]);
    
    const formattedTimeline = timeline.map(assessment => {
      let indicatorScores = {};
      if (assessment.indicator_scores) {
        if (typeof assessment.indicator_scores === 'string') {
          indicatorScores = JSON.parse(assessment.indicator_scores);
        } else {
          indicatorScores = assessment.indicator_scores;
        }
      }
      
      let integrityLevel = 'Not Assessed';
      if (assessment.overall_score >= 80) integrityLevel = 'High Integrity';
      else if (assessment.overall_score >= 50) integrityLevel = 'Medium Integrity';
      else if (assessment.overall_score > 0) integrityLevel = 'Needs Improvement';
      
      return {
        fiscal_year: assessment.fiscal_year,
        overall_score: assessment.overall_score || 0,
        integrity_level: integrityLevel,
        status: assessment.status,
        finalized_at: assessment.finalized_at,
        updated_at: assessment.updated_at,
        indicators: indicatorScores
      };
    });
    
    const scores = formattedTimeline.map(t => t.overall_score).filter(s => s > 0);
    const currentScore = scores.length > 0 ? scores[scores.length - 1] : 0;
    const previousScore = scores.length > 1 ? scores[scores.length - 2] : 0;
    const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const bestFY = formattedTimeline.find(t => t.overall_score === bestScore)?.fiscal_year || '';
    
    const changeAbsolute = currentScore - previousScore;
    const changePercentage = previousScore > 0 ? (changeAbsolute / previousScore) * 100 : 0;
    
    let trend = 'stable';
    if (changeAbsolute > 5) trend = 'improving';
    else if (changeAbsolute < -5) trend = 'declining';
    
    res.json({
      success: true,
      data: {
        agency: {
          id: agency.id,
          name: agency.name,
          sector: agency.sector
        },
        timeline: formattedTimeline,
        summary: {
          current_score: currentScore,
          previous_score: previousScore,
          change_absolute: parseFloat(changeAbsolute.toFixed(1)),
          change_percentage: parseFloat(changePercentage.toFixed(1)),
          best_score: bestScore,
          best_fy: bestFY,
          trend: trend,
          total_years: formattedTimeline.length,
          years_assessed: scores.length
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching agency timeline:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch agency timeline' });
  }
};
