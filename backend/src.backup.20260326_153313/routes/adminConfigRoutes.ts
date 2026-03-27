import { Router } from 'express';
import { getConfig, updateConfig } from '../controllers/configController';
import { getScoringRules, updateScoringRule } from '../controllers/scoringRulesController';
import { requireRole } from '../middleware/auth';

const router = Router();

router.get('/', requireRole(['system_admin', 'admin']), getConfig);
router.put('/', requireRole(['system_admin', 'admin']), updateConfig);

// New: Scoring rules
router.get('/rules', requireRole(['system_admin', 'admin']), getScoringRules);
router.put('/rules/:id', requireRole(['system_admin', 'admin']), updateScoringRule);

export default router;