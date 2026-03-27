// backend/src/controllers/agencyController.ts
import { Request, Response } from 'express';
import { getDB } from '../models/db';

export const getAgencyById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDB();
  try {
    const row = await new Promise<any>((resolve, reject) => {
      await getAsync(db, 'SELECT id, name FROM agencies WHERE id = ?', [id], (err, row) =>
        err ? reject(err) : resolve(row)
      );
    });
    if (!row) {
      return res.status(404).json({ error: 'Agency not found' });
    }
    res.json(row);
  } catch (err: any) {
    console.error('Agency fetch error:', err.message);
    res.status(500).json({ error: 'Failed to load agency' });
  }
};