//backend/src/controllers/ConfigurationVersionController.ts

import { Request, Response } from 'express';
import { IndicatorConfig } from '../models/IndicatorConfig';
import { Parameter } from '../models/Parameter';
import { ValidationError, AuthorizationError } from '../utils/errors';
import { logger } from '../utils/logger';

// Import db functions
import { getDB, getAsync, allAsync } from '../models/db';

export class ConfigurationVersionController {
  /**
   * Get all configuration versions
   */
  static async getVersions(req: Request, res: Response) {
    try {
      const db = getDB();
  try {
      const rows = await allAsync<any>(
        db,
        'SELECT * FROM configuration_versions ORDER BY created_at DESC'
      );
      
      // Parse JSON fields
      const versions = rows.map((row: any) => ({
        ...row,
        indicators: row.indicators ? JSON.parse(row.indicators) : [],
        parameters: row.parameters ? JSON.parse(row.parameters) : [],
        scoring_rules: row.scoring_rules ? JSON.parse(row.scoring_rules) : [],
        form_templates: row.form_templates ? JSON.parse(row.form_templates) : []
      }));
      
      logger.info('Fetched configuration versions', {
        count: versions.length,
        user: (req.user as any)?.email
      });
      
      res.json({
        success: true,
        data: versions,
        count: versions.length
      });
    } catch (error: any) {
      logger.error('Failed to fetch configuration versions', {
        error: error.message,
        user: (req.user as any)?.email
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to fetch configuration versions'
      });
    }
  }

  /**
   * Create configuration version snapshot
   */
  static async createVersion(req: Request, res: Response) {
    try {
      // Authorization check
      const user = req.user as any;
      if (!user || (user.role !== 'admin' && user.role !== 'system_admin')) {
        throw new AuthorizationError('Insufficient permissions to create configuration versions', 403);
      }
      
      const {
        version_name,
        version_number,
        description
      } = req.body;
      
      // Validation
      if (!version_name || !version_number) {
        throw new ValidationError('Missing required fields: version_name, version_number');
      }
      
      // Semantic version validation (simple)
      const versionRegex = /^\d+\.\d+\.\d+$/;
      if (!versionRegex.test(version_number)) {
        throw new ValidationError('version_number must follow semantic versioning (e.g., 1.0.0)');
      }
      
      // Get current configuration snapshot
      const indicators = await IndicatorConfig.getAll(false);
      
      // Get all parameters for all indicators
      const allParameters: any[] = [];
      for (const indicator of indicators) {
        const parameters = await IndicatorConfig.getParameters(indicator.id);
        allParameters.push(...parameters);
      }
      
      // Get all scoring rules (using existing table)
      const db = getDB();
  try {
      const scoringRules = await allAsync<any>(
        db,
        'SELECT * FROM scoring_rules WHERE is_active = 1'
      );
      
      // Get all extended scoring rules
      const extendedScoringRules = await allAsync<any>(
        db,
        'SELECT * FROM extended_scoring_rules WHERE is_active = 1'
      );
      
      // Get all form templates
      const formTemplates = await allAsync<any>(
        db,
        'SELECT * FROM form_templates WHERE is_active = 1'
      );
      
      const versionData = {
        version_name,
        version_number,
        description: description || '',
        indicators,
        parameters: allParameters,
        scoring_rules: [...scoringRules, ...extendedScoringRules],
        form_templates: formTemplates.map((template: any) => ({
          ...template,
          sections: template.sections ? JSON.parse(template.sections) : [],
          ui_config: template.ui_config ? JSON.parse(template.ui_config) : {}
        })),
        is_active: false, // New versions are inactive by default
        created_by: user.email
      };
      
      const versionId = await IndicatorConfig.createConfigurationVersion(versionData);
      
      logger.info('Created configuration version', {
        versionId,
        version_name,
        version_number,
        indicatorsCount: indicators.length,
        parametersCount: allParameters.length,
        user: user.email
      });
      
      res.status(201).json({
        success: true,
        message: 'Configuration version created successfully',
        data: { id: versionId }
      });
    } catch (error: any) {
      if (error instanceof ValidationError || error instanceof AuthorizationError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
      } else {
        logger.error('Failed to create configuration version', {
          error: error.message,
          requestBody: req.body,
          user: (req.user as any)?.email
        });
        
        res.status(500).json({
          success: false,
          error: 'Failed to create configuration version'
        });
      }
    }
  }

  /**
   * Apply configuration version
   */
  static async applyVersion(req: Request, res: Response) {
    try {
      // Authorization check
      const user = req.user as any;
      if (!user || (user.role !== 'admin' && user.role !== 'system_admin')) {
        throw new AuthorizationError('Insufficient permissions to apply configuration versions', 403);
      }
      
      const { id } = req.params;
      
      const success = await IndicatorConfig.applyConfigurationVersion(id, user.email);
      
      if (!success) {
        throw new ValidationError('Configuration version not found', 404);
      }
      
      logger.info('Applied configuration version', {
        versionId: id,
        user: user.email
      });
      
      res.json({
        success: true,
        message: 'Configuration version applied successfully'
      });
    } catch (error: any) {
      if (error instanceof ValidationError || error instanceof AuthorizationError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
      } else {
        logger.error('Failed to apply configuration version', {
          error: error.message,
          versionId: req.params.id,
          user: (req.user as any)?.email
        });
        
        res.status(500).json({
          success: false,
          error: 'Failed to apply configuration version'
        });
      }
    }
  }

  /**
   * Preview configuration version changes
   */
  static async previewVersion(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const db = getDB();
  try {
      
      // Get the version
      const version = await getAsync<any>(
        db,
        'SELECT * FROM configuration_versions WHERE id = ?',
        [id]
      );
      
      if (!version) {
        throw new ValidationError('Configuration version not found', 404);
      }
      
      // Parse JSON fields
      const parsedVersion = {
        ...version,
        indicators: version.indicators ? JSON.parse(version.indicators) : [],
        parameters: version.parameters ? JSON.parse(version.parameters) : [],
        scoring_rules: version.scoring_rules ? JSON.parse(version.scoring_rules) : [],
        form_templates: version.form_templates ? JSON.parse(version.form_templates) : []
      };
      
      // Get current active configuration
      const currentVersion = await IndicatorConfig.getActiveConfiguration();
      
      // Compare changes
      const changes = {
        indicators: {
          added: [],
          removed: [],
          modified: []
        },
        parameters: {
          added: [],
          removed: [],
          modified: []
        }
        // Add more comparisons as needed
      };
      
      res.json({
        success: true,
        data: {
          version: parsedVersion,
          current: currentVersion,
          changes
        }
      });
    } catch (error: any) {
      if (error instanceof ValidationError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
      } else {
        logger.error('Failed to preview configuration version', {
          error: error.message,
          versionId: req.params.id,
          user: (req.user as any)?.email
        });
        
        res.status(500).json({
          success: false,
          error: 'Failed to preview configuration version'
        });
      }
    }
  }
}