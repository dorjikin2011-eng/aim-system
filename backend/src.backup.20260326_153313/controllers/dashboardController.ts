// backend/src/controllers/dashboardController.ts
import { Request, Response } from 'express';
import { getDB, allAsync } from '../models/db';

// Define database row type
interface AgencyRow {
  id: string;
  name: string;
  sector: string;
  status: string;
  lastUpdated: string;
}

export async function getDashboardData(req: Request, res: Response) {
  try {
    const db = getDB();
  try {
    
    // Calculate current fiscal year (e.g., 2026–2027)
    const currentYear = new Date().getFullYear();
    const fiscalYear = `${currentYear}–${currentYear + 1}`;
    
    console.log('📊 Using fiscal year:', fiscalYear);
    
    // Get all agencies with their latest assessment status
    const agencies = await allAsync<AgencyRow>(db, `
      SELECT 
        a.id,
        a.name,
        a.sector,
        COALESCE(ass.status, 'DRAFT') as status,
        COALESCE(ass.updated_at, a.created_at) as lastUpdated
      FROM agencies a
      LEFT JOIN assessments ass ON a.id = ass.agency_id AND ass.fiscal_year = ?
      ORDER BY a.name
    `, [fiscalYear]);

    console.log('📊 Raw agencies from DB:', JSON.stringify(agencies, null, 2));

    // Calculate progress and risk level (simplified)
    const processedAgencies = agencies.map((agency: AgencyRow) => {
      console.log(`📊 Processing agency ${agency.id}: raw status = ${agency.status}`);
      
      // Determine the display status
      let displayStatus = agency.status;
      
      // Map DRAFT to NOT_STARTED for display
      if (agency.status === 'DRAFT') {
        displayStatus = 'NOT_STARTED';
      }
      
      // Calculate progress based on status
      let progress = 25; // default
      if (agency.status === 'FINALIZED') {
        progress = 100;
      } else if (agency.status === 'AWAITING_VALIDATION') {
        progress = 90;
      } else if (agency.status === 'SUBMITTED_TO_AGENCY') {
        progress = 75;
      } else if (agency.status === 'IN_PROGRESS') {
        progress = 50;
      } else if (agency.status === 'NOT_STARTED' || agency.status === 'DRAFT') {
        progress = 25;
      }

      console.log(`📊 Processed agency ${agency.id}: displayStatus = ${displayStatus}, progress = ${progress}`);
      
      return {
        id: agency.id,
        name: agency.name,
        sector: agency.sector,
        status: displayStatus,
        progress: progress,
        riskLevel: 'Low',
        lastUpdated: new Date(agency.lastUpdated).toLocaleDateString('en-GB')
      };
    });

    console.log('📊 Final processed agencies:', JSON.stringify(processedAgencies, null, 2));
    res.json({ agencies: processedAgencies });
  } catch (error) {
    console.error('❌ Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
}