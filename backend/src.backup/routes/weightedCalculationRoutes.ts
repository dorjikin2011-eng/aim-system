/**
 * Routes for weighted calculation endpoints
 */

import express from 'express';
import WeightedCalculationController from '../controllers/WeightedCalculationController';

const router = express.Router();

/**
 * @route   POST /api/calculate/weighted-sum
 * @desc    Calculate weighted sum from raw counts (Indicator 4)
 * @access  Public (or authenticated users)
 */
router.post('/weighted-sum', WeightedCalculationController.calculateWeightedSum);

/**
 * @route   POST /api/calculate/process-indicator4
 * @desc    Process Indicator 4 response for an assessment
 * @access  Authenticated users (agency focal, prevention officers)
 */
router.post('/process-indicator4', WeightedCalculationController.processIndicator4);

/**
 * @route   POST /api/calculate/recalculate-all
 * @desc    Recalculate all existing Indicator 4 responses (Admin only)
 * @access  Admin only
 */
router.post('/recalculate-all', WeightedCalculationController.recalculateAll);

export default router;