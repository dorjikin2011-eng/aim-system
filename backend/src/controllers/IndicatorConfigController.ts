// backend/src/controllers/IndicatorConfigController.ts

import { Request, Response } from 'express';
import { IndicatorConfig } from '../models/IndicatorConfig';
import { IndicatorCategory } from '../types/config';

export class IndicatorConfigController {
  
  /**
   * Helper function to safely convert any value to boolean
   * Handles PostgreSQL boolean, integer (0/1), and string representations
   */
  private static toBoolean(value: any): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      return lower === 'true' || lower === '1' || lower === 't';
    }
    return false;
  }
  
  static async getAllIndicators(req: Request, res: Response): Promise<void> {
    try {
      const { 
        category, 
        active_only = 'true',
        include_parameters = 'false',
        include_rules = 'false'
      } = req.query;
      
      let indicators;
      
      if (category) {
        indicators = await IndicatorConfig.getByCategory(
          category as IndicatorCategory, 
          active_only === 'false'
        );
      } else {
        indicators = await IndicatorConfig.getAll(active_only === 'false');
      }
      
      // Ensure isActive is boolean using type-safe conversion
      indicators = indicators.map(ind => ({
        ...ind,
        isActive: this.toBoolean(ind.isActive)
      }));
      
      // If not requesting parameters/rules, strip them to reduce payload
      if (include_parameters !== 'true') {
        indicators = indicators.map(ind => ({
          ...ind,
          parameters: []
        }));
      }
      
      if (include_rules !== 'true') {
        indicators = indicators.map(ind => ({
          ...ind,
          scoringRules: []
        }));
      }
      
      res.json({
        success: true,
        data: indicators,
      });
    } catch (error: any) {
      console.error('Error fetching indicators:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch indicators',
      });
    }
  }

  static async getIndicatorById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const indicator = await IndicatorConfig.getById(id);
      
      if (!indicator) {
        res.status(404).json({
          success: false,
          error: 'Indicator not found',
        });
        return;
      }
      
      // Ensure isActive is boolean using type-safe conversion
      const fixedIndicator = {
        ...indicator,
        isActive: this.toBoolean(indicator.isActive)
      };
      
      res.json({
        success: true,
        data: fixedIndicator,
      });
    } catch (error: any) {
      console.error('Error fetching indicator:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch indicator',
      });
    }
  }

  static async createIndicator(req: Request, res: Response): Promise<void> {
    try {
      const indicatorData = req.body;
      const userId = (req as any).user?.id || 'system';
      
      // Validate indicator
      const validation = await IndicatorConfig.validateIndicator(indicatorData);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          errors: validation.errors,
          warnings: validation.warnings,
        });
        return;
      }
      
      // Create indicator
      const id = await IndicatorConfig.create({
        ...indicatorData,
        created_by: userId,
      });
      
      // Get the created indicator
      const indicator = await IndicatorConfig.getById(id);
      
      res.status(201).json({
        success: true,
        data: indicator ? { ...indicator, isActive: this.toBoolean(indicator.isActive) } : null,
        message: 'Indicator created successfully',
      });
    } catch (error: any) {
      console.error('Error creating indicator:', error);
      
      if (error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: error.message || 'Failed to create indicator',
        });
      }
    }
  }

  static async updateIndicator(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;
      const userId = (req as any).user?.id || 'system';
      
      // Get current indicator to validate
      const currentIndicator = await IndicatorConfig.getById(id);
      if (!currentIndicator) {
        res.status(404).json({
          success: false,
          error: 'Indicator not found',
        });
        return;
      }
      
      // Merge updates with current data for validation
      const updatedIndicator = { ...currentIndicator, ...updates };
      const validation = await IndicatorConfig.validateIndicator(updatedIndicator);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          errors: validation.errors,
          warnings: validation.warnings,
        });
        return;
      }
      
      // Update indicator
      const success = await IndicatorConfig.update(id, updates, userId);
      
      if (!success) {
        throw new Error('Failed to update indicator');
      }
      
      // Get the updated indicator
      const indicator = await IndicatorConfig.getById(id);
      
      res.json({
        success: true,
        data: indicator ? { ...indicator, isActive: this.toBoolean(indicator.isActive) } : null,
        message: 'Indicator updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating indicator:', error);
      
      if (error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: error.message || 'Failed to update indicator',
        });
      }
    }
  }

  static async deleteIndicator(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { hardDelete = 'false' } = req.query;
      const userId = (req as any).user?.id || 'system';
      
      let success: boolean;
      
      if (hardDelete === 'true') {
        success = await IndicatorConfig.hardDelete(id);
      } else {
        success = await IndicatorConfig.delete(id, userId);
      }
      
      if (!success) {
        res.status(404).json({
          success: false,
          error: 'Indicator not found',
        });
        return;
      }
      
      res.json({
        success: true,
        message: hardDelete === 'true' 
          ? 'Indicator permanently deleted' 
          : 'Indicator deactivated',
      });
    } catch (error: any) {
      console.error('Error deleting indicator:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete indicator',
      });
    }
  }

  static async reorderIndicators(req: Request, res: Response): Promise<void> {
    try {
      const { category } = req.params;
      const { orderedIds } = req.body;
      
      if (!Array.isArray(orderedIds)) {
        res.status(400).json({
          success: false,
          error: 'orderedIds must be an array',
        });
        return;
      }
      
      const success = await IndicatorConfig.reorderIndicators(
        category as IndicatorCategory,
        orderedIds
      );
      
      if (!success) {
        throw new Error('Failed to reorder indicators');
      }
      
      res.json({
        success: true,
        message: 'Indicators reordered successfully',
      });
    } catch (error: any) {
      console.error('Error reordering indicators:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to reorder indicators',
      });
    }
  }

  static async getIndicatorStatistics(req: Request, res: Response): Promise<void> {
    try {
      const statistics = await IndicatorConfig.getStatistics();
      
      res.json({
        success: true,
        data: statistics,
      });
    } catch (error: any) {
      console.error('Error getting statistics:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get statistics',
      });
    }
  }

  static async getIndicatorHistory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const history = await IndicatorConfig.getHistory(id);
      
      res.json({
        success: true,
        data: history,
      });
    } catch (error: any) {
      console.error('Error getting indicator history:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get history',
      });
    }
  }

 static async restoreIndicatorVersion(req: Request, res: Response): Promise<void> {
  try {
    const { id, version } = req.params;
    const userId = (req as any).user?.id || 'system';
    
    // Check if indicator exists
    const indicator = await IndicatorConfig.getById(id);
    if (!indicator) {
      res.status(404).json({
        success: false,
        error: 'Indicator not found',
      });
      return;
    }
    
    const success = await IndicatorConfig.restoreVersion(
      id,
      parseInt(version),
      userId
    );
    
    if (!success) {
      throw new Error('Failed to restore version');
    }
    
    const restoredIndicator = await IndicatorConfig.getById(id);
    
    res.json({
      success: true,
      data: restoredIndicator,
      message: `Indicator restored to version ${version} successfully`,
    });
  } catch (error: any) {
    console.error('Error restoring version:', error);
    
    if (error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to restore version',
      });
    }
  }
}

  static async validateIndicatorConfig(req: Request, res: Response): Promise<void> {
    try {
      const indicatorData = req.body;
      
      const validation = await IndicatorConfig.validateIndicator(indicatorData);
      
      res.json({
        success: true,
        data: validation,
      });
    } catch (error: any) {
      console.error('Error validating indicator:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to validate indicator',
      });
    }
  }

  static async getCompleteConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const indicators = await IndicatorConfig.getCompleteConfiguration();
      
      // Ensure isActive is boolean for all indicators using type-safe conversion
      const fixedIndicators = indicators.map(ind => ({
        ...ind,
        isActive: this.toBoolean(ind.isActive)
      }));
      
      res.json({
        success: true,
        data: fixedIndicators,
      });
    } catch (error: any) {
      console.error('Error getting complete configuration:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get configuration',
      });
    }
  }

  static async batchUpdateIndicators(req: Request, res: Response): Promise<void> {
    try {
      const { indicators } = req.body;
      const userId = (req as any).user?.id || 'system';
      
      if (!Array.isArray(indicators)) {
        res.status(400).json({
          success: false,
          error: 'indicators must be an array',
        });
        return;
      }
      
      const results = [];
      const errors = [];
      
      for (const indicatorUpdate of indicators) {
        try {
          if (!indicatorUpdate.id) {
            throw new Error('Indicator ID is required');
          }
          
          const success = await IndicatorConfig.update(
            indicatorUpdate.id,
            indicatorUpdate,
            userId
          );
          
          if (success) {
            const updatedIndicator = await IndicatorConfig.getById(indicatorUpdate.id);
            results.push({
              id: indicatorUpdate.id,
              success: true,
              data: updatedIndicator ? { ...updatedIndicator, isActive: this.toBoolean(updatedIndicator.isActive) } : null,
            });
          } else {
            errors.push({
              id: indicatorUpdate.id,
              error: 'Failed to update indicator',
            });
          }
        } catch (error: any) {
          errors.push({
            id: indicatorUpdate.id,
            error: error.message,
          });
        }
      }
      
      res.json({
        success: errors.length === 0,
        data: results,
        errors: errors.length > 0 ? errors : undefined,
        message: errors.length === 0 
          ? 'All indicators updated successfully' 
          : `Updated ${results.length} indicators, ${errors.length} failed`,
      });
    } catch (error: any) {
      console.error('Error batch updating indicators:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to batch update indicators',
      });
    }
  }
}