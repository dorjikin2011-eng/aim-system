// backend/src/controllers/submissionPipelineController.ts
import { Request, Response } from 'express';
import { getDB } from '../models/db';

export const getSubmissionPipeline = async (req: Request, res: Response) => {
  try {
    const db = getDB();
  try {
    
    // Count agencies in each status for FY 2025-26
    const stages = ['draft', 'submitted', 'verified', 'final'];
    const counts: Record<string, number> = { draft: 0, submitted: 0, verified: 0, final: 0 };

    for (const stage of stages) {
      const row = await new Promise<any>((resolve, reject) => {
        await getAsync(db, 
          `SELECT COUNT(*) as count 
           FROM indicator_data i
           JOIN agencies a ON i.agency_id = a.id
           WHERE a.status = 'active'
             AND i.fiscal_year = '2025-26'
             AND i.status = ?`,
          [stage],
          (err, row) => (err ? reject(err) : resolve(row))
        );
      });
      counts[stage] = row?.count || 0;
    }

    // Ensure funnel flow: draft ≥ submitted ≥ verified ≥ final
    res.json([
      { stage: 'Draft', count: counts.draft },
      { stage: 'Submitted', count: counts.submitted },
      { stage: 'Verified', count: counts.verified },
      { stage: 'Final', count: counts.final }
    ]);
  } catch (err) {
    console.error('Pipeline error:', err);
    res.status(500).json({ error: 'Failed to load submission pipeline' });
  }
};