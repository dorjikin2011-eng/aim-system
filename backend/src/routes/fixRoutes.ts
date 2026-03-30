import { Router } from 'express';
import { getDB, runAsync, getAsync } from '../models/db';
import { Pool } from 'pg';

const router = Router();

router.post('/create-template', async (req, res) => {
  try {
    const db = getDB();
    const isPG = db instanceof Pool;
    
    const exists = await getAsync<{ count: number }>(db,
      "SELECT COUNT(*) as count FROM form_templates WHERE id = 'template_aims_assessment_v3'"
    );
    
    if (exists?.count === 0) {
      await runAsync(db, `
        INSERT INTO form_templates (id, name, description, template_type, indicator_ids, sections, version, is_active, created_by, updated_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        'template_aims_assessment_v3',
        'AIMS Assessment Form (V3)',
        'Standard AIMS assessment form',
        'assessment',
        JSON.stringify(['ind_iccs_v3', 'ind_training_v3', 'ind_ad_v3', 'ind_coc_v3', 'ind_cases_v3']),
        '[]',
        '3.0.0',
        isPG ? true : 1,
        'system',
        'system'
      ]);
      res.json({ success: true, message: 'Template created!' });
    } else {
      res.json({ success: true, message: 'Template already exists' });
    }
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;