//backend/src/routes/indicatorConfig.ts
import { Router } from 'express';
import { IndicatorConfigController } from '../controllers/IndicatorConfigController';

const router = Router();

// Get all indicators
router.get('/', (req, res) => IndicatorConfigController.getAllIndicators(req, res));

// Get indicator statistics
router.get('/statistics', (req, res) => IndicatorConfigController.getIndicatorStatistics(req, res));

// Get complete configuration
router.get('/complete', (req, res) => IndicatorConfigController.getCompleteConfiguration(req, res));

// Get indicator by ID
router.get('/:id', (req, res) => IndicatorConfigController.getIndicatorById(req, res));

// Create new indicator
router.post('/', (req, res) => IndicatorConfigController.createIndicator(req, res));

// Update indicator
router.put('/:id', (req, res) => IndicatorConfigController.updateIndicator(req, res));

// Delete indicator
router.delete('/:id', (req, res) => IndicatorConfigController.deleteIndicator(req, res));

// Get indicator history
router.get('/:id/history', (req, res) => IndicatorConfigController.getIndicatorHistory(req, res));

// Restore indicator version
router.post('/:id/restore/:version', (req, res) => IndicatorConfigController.restoreIndicatorVersion(req, res));

// Reorder indicators in category
router.put('/category/:category/reorder', (req, res) => IndicatorConfigController.reorderIndicators(req, res));

// Validate indicator configuration
router.post('/validate', (req, res) => IndicatorConfigController.validateIndicatorConfig(req, res));

// Batch update indicators
router.put('/batch/update', (req, res) => IndicatorConfigController.batchUpdateIndicators(req, res));

export default router;