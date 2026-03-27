// backend/src/controllers/agencyController.ts
import { Request, Response } from 'express';
import { getDB, getAsync } from '../models/db';

// ============================================
// GET /api/agencies/:id
// ============================================
export const getAgencyById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDB();
    
    const row = await getAsync<{ id: string; name: string }>(
      db, 
      'SELECT id, name FROM agencies WHERE id = ?', 
      [id]
    );
    
    if (!row) {
      return res.status(404).json({ error: 'Agency not found' });
    }
    
    res.json(row);
  } catch (err) {
    console.error('Agency fetch error:', err instanceof Error ? err.message : 'Unknown error');
    res.status(500).json({ error: 'Failed to load agency' });
  }
};