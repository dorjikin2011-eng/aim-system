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
    
    // FIXED: Changed ? to $1 for PostgreSQL
    const row = await getAsync<any>(
      db, 
      'SELECT id, name, sector, status, created_at, updated_at FROM agencies WHERE id = $1', 
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