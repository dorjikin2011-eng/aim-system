
/**
 * Controller for weighted calculation endpoints
 * Handles automatic calculation for Indicator 4
 */

import { Request, Response } from 'express';
import WeightedCalculationService from '../services/WeightedCalculationService';

export class WeightedCalculationController {
  
  /**
   * Calculate weighted sum from raw counts
   * POST /api/calculate/weighted-sum
   */
  static async calculateWeightedSum(req: Request, res: Response) {
    try {
      const { convictions, prosecutions, admin_actions } = req.body;
      
      if (convictions === undefined || prosecutions === undefined || admin_actions === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters: convictions, prosecutions, admin_actions'
        });
      }
      
      const counts = {
        convictions: parseInt(convictions) || 0,
        prosecutions: parseInt(prosecutions) || 0,
        admin_actions: parseInt(admin_actions) || 0
      };
      
      const result = WeightedCalculationService.calculateFromCounts(counts);
      
      return res.json({
        success: true,
        data: result
      });
      
    } catch (error) {
      console.error('Error in calculateWeightedSum:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
  
  /**
   * Process Indicator 4 response for an assessment
   * POST /api/calculate/process-indicator4
   */
  static async processIndicator4(req: Request, res: Response) {
    try {
      const { assessment_id, response_data } = req.body;
      
      if (!assessment_id || !response_data) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters: assessment_id, response_data'
        });
      }
      
      const result = await WeightedCalculationService.processIndicator4Response(
        assessment_id,
        response_data
      );
      
      if (!result) {
        return res.status(500).json({
          success: false,
          error: 'Failed to process Indicator 4 response'
        });
      }
      
      return res.json({
        success: true,
        data: result
      });
      
    } catch (error) {
      console.error('Error in processIndicator4:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
  
  /**
   * Recalculate all existing Indicator 4 responses
   * POST /api/calculate/recalculate-all
   * (Admin only - for migration purposes)
   */
  static async recalculateAll(req: Request, res: Response) {
    try {
      // Check if user is admin (simplified check)
      // In production, use proper authentication middleware
      if (req.headers['x-admin-token'] !== 'admin-secret-token') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }
      
      const result = await WeightedCalculationService.recalculateAllIndicator4Responses();
      
      return res.json({
        success: true,
        data: result,
        message: `Recalculation completed: ${result.updated} updated, ${result.errors} errors`
      });
      
    } catch (error) {
      console.error('Error in recalculateAll:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}

export default WeightedCalculationController;