// backend/src/models/IndicatorConfig.ts - UPDATED WITH DEBUG

import { getDB, getAsync, allAsync, runAsync } from './db';
import { 
  IndicatorDefinition, 
  ParameterDefinition, 
  ScoringRule, 
  IndicatorCategory
} from '../types/config';

// Define a type for creating indicators without auto-generated fields
type CreateIndicatorInput = Omit<IndicatorDefinition, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'createdBy' | 'updatedBy'> & {
  id?: string; // Make id optional for creation
  createdBy: string;
};

export class IndicatorConfig {
  /**
   * Get all indicators
   */
  static async getAll(includeInactive = false): Promise<IndicatorDefinition[]> {
    try {
      const db = getDB();
      const query = includeInactive 
        ? 'SELECT * FROM indicators ORDER BY category, display_order, name'
        : 'SELECT * FROM indicators WHERE is_active = 1 ORDER BY category, display_order, name';
      
      const rows = await allAsync<any>(db, query);
      
      return rows.map((row: any) => this.mapRowToIndicator(row));
    } catch (error) {
      console.error('Error getting all indicators:', error);
      throw error;
    }
  }

  /**
   * Get indicator by ID
   */
  static async getById(id: string): Promise<IndicatorDefinition | null> {
    try {
      const db = getDB();
      const result = await getAsync<any>(
        db, 
        'SELECT * FROM indicators WHERE id = ?', 
        [id]
      );
      
      if (!result) return null;
      
      return this.mapRowToIndicator(result);
    } catch (error) {
      console.error('Error getting indicator by ID:', error);
      throw error;
    }
  }

  /**
   * Get indicator by code
   */
  static async getByCode(code: string): Promise<IndicatorDefinition | null> {
    try {
      const db = getDB();
      const result = await getAsync<any>(
        db, 
        'SELECT * FROM indicators WHERE code = ?', 
        [code]
      );
      
      if (!result) return null;
      
      return this.mapRowToIndicator(result);
    } catch (error) {
      console.error('Error getting indicator by code:', error);
      throw error;
    }
  }

  /**
   * Get parameters for a specific indicator
   */
  static async getParameters(indicatorId: string): Promise<ParameterDefinition[]> {
    try {
      const db = getDB();
      
      // Get the indicator first
      const indicator = await this.getById(indicatorId);
      if (!indicator) {
        throw new Error(`Indicator with ID ${indicatorId} not found`);
      }
      
      // Return parameters from the indicator object
      return indicator.parameters || [];
    } catch (error) {
      console.error('Error getting indicator parameters:', error);
      throw error;
    }
  }

  /**
   * Create new indicator
   */
  static async create(
    indicator: CreateIndicatorInput
  ): Promise<string> {
    try {
      const db = getDB();
      
      // Generate ID if not provided
      const id = indicator.id || this.generateId(indicator.name);
      
      // Generate code from name if not provided
      const code = indicator.code || this.generateCode(indicator.name);
      
      // Check if code already exists
      const existing = await this.getByCode(code);
      if (existing) {
        throw new Error(`Indicator with code "${code}" already exists`);
      }
      
      // Determine display order
      const maxOrderResult = await getAsync<{ max_order: number }>(
        db,
        'SELECT MAX(display_order) as max_order FROM indicators WHERE category = ?',
        [indicator.category]
      );
      const displayOrder = (maxOrderResult?.max_order || 0) + 1;
      
      // Convert for database
      const parameters = indicator.parameters || [];
      const scoringRules = indicator.scoringRules || [];
      
      // Execute the insert
await runAsync(
  db,
  `INSERT INTO indicators (
    id, code, name, description, category, weight, max_score,
    scoring_method, formula, parameters, scoring_rules, ui_config,
    is_active, display_order, metadata, version,
    created_by, updated_by, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [
    id,
    code,
    indicator.name,
    indicator.description || null,
    indicator.category,
    indicator.weight || 0,
    indicator.maxScore || 100,
    indicator.scoringMethod || 'sum',
    indicator.formula || '',
    JSON.stringify(parameters.map(p => this.prepareParameterForDb(p))),
    JSON.stringify(scoringRules.map(r => this.prepareScoringRuleForDb(r))),
    JSON.stringify(indicator.uiConfig || {}),
    indicator.isActive !== false ? 1 : 0,
    displayOrder,
    JSON.stringify(indicator.metadata || {}),
    1, // initial version
    indicator.createdBy || 'system',  // FIX: Add fallback to 'system'
    indicator.createdBy || 'system',  // FIX: Add fallback to 'system'
    new Date().toISOString(),
    new Date().toISOString()
  ]
);
      
      // Create history entry - FIXED: Pass action as parameter, not in object
      await this.createHistoryEntry(id, 1, 'create', indicator.createdBy, {
        ...indicator,
        id,
        code,
        displayOrder,
        maxScore: indicator.maxScore || 100,
        formula: indicator.formula || '',
        uiConfig: indicator.uiConfig || {},
        parameters,
        scoringRules,
        metadata: indicator.metadata || {},
        version: 1,
        isActive: indicator.isActive !== false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: indicator.createdBy,
        updatedBy: indicator.createdBy
      });
      
      return id;
    } catch (error) {
      console.error('Error creating indicator:', error);
      throw error;
    }
  }

  /**
   * Update indicator
   */
  static async update(
    id: string, 
    updates: Partial<IndicatorDefinition>,
    updatedBy: string
  ): Promise<boolean> {
    try {
      const db = getDB();
      
      // Get current indicator
      const current = await this.getById(id);
      if (!current) {
        throw new Error('Indicator not found');
      }
      
      // Check if code is being changed and if it already exists
      if (updates.code && updates.code !== current.code) {
        const existingWithCode = await this.getByCode(updates.code);
        if (existingWithCode && existingWithCode.id !== id) {
          throw new Error(`Indicator with code "${updates.code}" already exists`);
        }
      }
      
      // Increment version
      const newVersion = current.version + 1;
      
      // Merge updates with current data
      const updatedIndicator = { ...current, ...updates };
      
      // Build update query
      const updateFields: string[] = [];
      const values: any[] = [];
      
      const addField = (field: string, value: any) => {
        updateFields.push(`${field} = ?`);
        values.push(value);
      };
      
      if (updates.code !== undefined) addField('code', updates.code);
      if (updates.name !== undefined) addField('name', updates.name);
      if (updates.description !== undefined) addField('description', updates.description);
      if (updates.category !== undefined) addField('category', updates.category);
      if (updates.weight !== undefined) addField('weight', updates.weight);
      if (updates.maxScore !== undefined) addField('max_score', updates.maxScore);
      if (updates.scoringMethod !== undefined) addField('scoring_method', updates.scoringMethod);
      if (updates.formula !== undefined) addField('formula', updates.formula);
      if (updates.parameters !== undefined) {
        addField('parameters', JSON.stringify(updates.parameters.map(p => this.prepareParameterForDb(p))));
      }
      if (updates.scoringRules !== undefined) {
        addField('scoring_rules', JSON.stringify(updates.scoringRules.map(r => this.prepareScoringRuleForDb(r))));
      }
      if (updates.uiConfig !== undefined) addField('ui_config', JSON.stringify(updates.uiConfig || {}));
      if (updates.isActive !== undefined) addField('is_active', updates.isActive ? 1 : 0);
      if (updates.displayOrder !== undefined) addField('display_order', updates.displayOrder);
      if (updates.metadata !== undefined) addField('metadata', JSON.stringify(updates.metadata || {}));
      
      // Always update version, updated_by, and updated_at
      addField('version', newVersion);
      addField('updated_by', updatedBy);
      addField('updated_at', new Date().toISOString());
      
      // Add WHERE clause value
      values.push(id);
      
      const query = `UPDATE indicators SET ${updateFields.join(', ')} WHERE id = ?`;
      
      await runAsync(db, query, values);
      
      // Create history entry - FIXED: Pass action as parameter
      await this.createHistoryEntry(id, newVersion, 'update', updatedBy, updatedIndicator);
      
      // Verify the update was successful
      const updated = await this.getById(id);
      return updated !== null && updated.version === newVersion;
    } catch (error) {
      console.error('Error updating indicator:', error);
      throw error;
    }
  }

  /**
   * Delete indicator (soft delete)
   */
  static async delete(id: string, deletedBy: string): Promise<boolean> {
    try {
      const db = getDB();
      
      // Get current indicator before deleting
      const current = await this.getById(id);
      if (!current) {
        throw new Error('Indicator not found');
      }
      
      await runAsync(
        db,
        'UPDATE indicators SET is_active = 0, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [deletedBy, id]
      );
      
      // Create history entry for deletion
      await this.createHistoryEntry(id, current.version + 1, 'delete', deletedBy, {
        ...current,
        isActive: false,
        updatedBy: deletedBy,
        updatedAt: new Date().toISOString()
      });
      
      // Verify the deletion by checking if the indicator is now inactive
      const indicator = await this.getById(id);
      return indicator !== null && !indicator.isActive;
    } catch (error) {
      console.error('Error deleting indicator:', error);
      throw error;
    }
  }

  /**
   * Hard delete indicator
   */
  static async hardDelete(id: string): Promise<boolean> {
    try {
      const db = getDB();
      
      await runAsync(
        db,
        'DELETE FROM indicators WHERE id = ?',
        [id]
      );
      
      // Verify deletion by checking if indicator no longer exists
      const indicator = await this.getById(id);
      return indicator === null;
    } catch (error) {
      console.error('Error hard deleting indicator:', error);
      throw error;
    }
  }

  /**
   * Reorder indicators
   */
  static async reorderIndicators(
    category: IndicatorCategory,
    orderedIds: string[]
  ): Promise<boolean> {
    try {
      const db = getDB();
      
      // Start transaction
      await runAsync(db, 'BEGIN TRANSACTION');
      
      try {
        // Update display order for each indicator
        for (let i = 0; i < orderedIds.length; i++) {
          await runAsync(
            db,
            'UPDATE indicators SET display_order = ? WHERE id = ? AND category = ?',
            [i + 1, orderedIds[i], category]
          );
        }
        
        await runAsync(db, 'COMMIT');
        return true;
      } catch (error) {
        await runAsync(db, 'ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error reordering indicators:', error);
      throw error;
    }
  }

  /**
   * Get indicators by category
   */
  static async getByCategory(category: IndicatorCategory, includeInactive = false): Promise<IndicatorDefinition[]> {
    try {
      const db = getDB();
      const query = includeInactive 
        ? 'SELECT * FROM indicators WHERE category = ? ORDER BY display_order, name'
        : 'SELECT * FROM indicators WHERE category = ? AND is_active = 1 ORDER BY display_order, name';
      
      const rows = await allAsync<any>(db, query, [category]);
      
      return rows.map((row: any) => this.mapRowToIndicator(row));
    } catch (error) {
      console.error('Error getting indicators by category:', error);
      throw error;
    }
  }

  /**
   * Get all active indicators with their parameters and scoring rules
   */
  static async getCompleteConfiguration(): Promise<IndicatorDefinition[]> {
    try {
      const db = getDB();
      
      const rows = await allAsync<any>(
        db,
        'SELECT * FROM indicators WHERE is_active = 1 ORDER BY category, display_order, name'
      );
      
      return rows.map((row: any) => this.mapRowToIndicator(row));
    } catch (error) {
      console.error('Error getting complete configuration:', error);
      throw error;
    }
  }

  /**
   * Get the currently active configuration version
   */
  static async getActiveConfiguration(): Promise<any> {
    try {
      const db = getDB();
      
      // First, get the active configuration version
      const activeVersion = await getAsync<any>(
        db,
        'SELECT * FROM configuration_versions WHERE is_active = 1 LIMIT 1'
      );
      
      if (activeVersion) {
        // Parse JSON fields
        return {
          ...activeVersion,
          indicators: activeVersion.indicators ? JSON.parse(activeVersion.indicators) : [],
          parameters: activeVersion.parameters ? JSON.parse(activeVersion.parameters) : [],
          scoring_rules: activeVersion.scoring_rules ? JSON.parse(activeVersion.scoring_rules) : [],
          form_templates: activeVersion.form_templates ? JSON.parse(activeVersion.form_templates) : []
        };
      }
      
      // If no active version exists, return current live configuration
      const indicators = await this.getCompleteConfiguration();
      const allParameters: ParameterDefinition[] = [];
      
      // Get all parameters for all indicators
      for (const indicator of indicators) {
        if (indicator.parameters && indicator.parameters.length > 0) {
          allParameters.push(...indicator.parameters);
        }
      }
      
      // Get all scoring rules
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
      
      return {
        indicators,
        parameters: allParameters,
        scoring_rules: [...scoringRules, ...extendedScoringRules],
        form_templates: formTemplates.map((template: any) => ({
          ...template,
          sections: template.sections ? JSON.parse(template.sections) : [],
          ui_config: template.ui_config ? JSON.parse(template.ui_config) : {}
        }))
      };
    } catch (error) {
      console.error('Error getting active configuration:', error);
      throw error;
    }
  }

  /**
   * Create a configuration version snapshot
   */
  static async createConfigurationVersion(versionData: any): Promise<number> {
    try {
      const db = getDB();
      
      // Check if version number already exists
      const existingVersion = await getAsync<any>(
        db,
        'SELECT id FROM configuration_versions WHERE version_number = ?',
        [versionData.version_number]
      );
      
      if (existingVersion) {
        throw new Error(`Version ${versionData.version_number} already exists`);
      }
      
      await runAsync(
        db,
        `INSERT INTO configuration_versions (
          version_name, version_number, description,
          indicators, parameters, scoring_rules, form_templates,
          is_active, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          versionData.version_name,
          versionData.version_number,
          versionData.description || '',
          JSON.stringify(versionData.indicators),
          JSON.stringify(versionData.parameters),
          JSON.stringify(versionData.scoring_rules),
          JSON.stringify(versionData.form_templates),
          versionData.is_active ? 1 : 0,
          versionData.created_by
        ]
      );
      
      // Get the inserted ID
      const insertedVersion = await getAsync<{ id: number }>(
        db,
        'SELECT id FROM configuration_versions WHERE version_number = ? ORDER BY created_at DESC LIMIT 1',
        [versionData.version_number]
      );
      
      return insertedVersion?.id || 0;
    } catch (error) {
      console.error('Error creating configuration version:', error);
      throw error;
    }
  }

  /**
   * Apply a configuration version
   */
  static async applyConfigurationVersion(versionId: string | number, appliedBy: string): Promise<boolean> {
    try {
      const db = getDB();
      
      // Start transaction
      await runAsync(db, 'BEGIN TRANSACTION');
      
      try {
        // Get the version data
        const version = await getAsync<any>(
          db,
          'SELECT * FROM configuration_versions WHERE id = ?',
          [versionId]
        );
        
        if (!version) {
          throw new Error('Configuration version not found');
        }
        
        // Parse the version data
        const indicators = version.indicators ? JSON.parse(version.indicators) : [];
        const parameters = version.parameters ? JSON.parse(version.parameters) : [];
        const scoringRules = version.scoring_rules ? JSON.parse(version.scoring_rules) : [];
        const formTemplates = version.form_templates ? JSON.parse(version.form_templates) : [];
        
        // Deactivate all current configuration versions
        await runAsync(
          db,
          'UPDATE configuration_versions SET is_active = 0, applied_at = NULL'
        );
        
        // Apply the selected version
        await runAsync(
          db,
          'UPDATE configuration_versions SET is_active = 1, applied_at = datetime("now"), applied_by = ? WHERE id = ?',
          [appliedBy, versionId]
        );
        
        // Apply indicators
        for (const indicator of indicators) {
          // Check if indicator exists
          const existingIndicator = await this.getById(indicator.id);
          
          if (existingIndicator) {
            // Update existing indicator
            await this.update(indicator.id, indicator, appliedBy);
          } else {
            // Create new indicator - ensure we have all required fields
            const createData: CreateIndicatorInput = {
              ...indicator,
              createdBy: appliedBy
            };
            await this.create(createData);
          }
        }
        
        // Apply form templates (simplified - update existing or create new)
        for (const template of formTemplates) {
          const existingTemplate = await getAsync<any>(
            db,
            'SELECT id FROM form_templates WHERE code = ?',
            [template.code]
          );
          
          if (existingTemplate) {
            await runAsync(
              db,
              `UPDATE form_templates SET 
                name = ?, description = ?, sections = ?, ui_config = ?,
                is_active = ?, updated_by = ?, updated_at = datetime('now')
               WHERE id = ?`,
              [
                template.name,
                template.description || '',
                JSON.stringify(template.sections || []),
                JSON.stringify(template.ui_config || {}),
                template.is_active ? 1 : 0,
                appliedBy,
                existingTemplate.id
              ]
            );
          } else {
            await runAsync(
              db,
              `INSERT INTO form_templates (
                code, name, description, sections, ui_config,
                is_active, created_by, updated_by, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
              [
                template.code,
                template.name,
                template.description || '',
                JSON.stringify(template.sections || []),
                JSON.stringify(template.ui_config || {}),
                template.is_active ? 1 : 0,
                appliedBy,
                appliedBy
              ]
            );
          }
        }
        
        await runAsync(db, 'COMMIT');
        return true;
      } catch (error) {
        await runAsync(db, 'ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error applying configuration version:', error);
      throw error;
    }
  }

  /**
   * Get indicator statistics
   */
  static async getStatistics(): Promise<{
    total: number;
    byCategory: Record<string, number>;
    active: number;
    inactive: number;
  }> {
    try {
      const db = getDB();
      
      // Total count
      const totalResult = await getAsync<{ count: number }>(
        db,
        'SELECT COUNT(*) as count FROM indicators'
      );
      
      // Active count
      const activeResult = await getAsync<{ count: number }>(
        db,
        'SELECT COUNT(*) as count FROM indicators WHERE is_active = 1'
      );
      
      // Count by category
      const categoryResult = await allAsync<{ category: string; count: number }>(
        db,
        'SELECT category, COUNT(*) as count FROM indicators WHERE is_active = 1 GROUP BY category'
      );
      
      const byCategory: Record<string, number> = {};
      categoryResult.forEach(row => {
        byCategory[row.category] = row.count;
      });
      
      return {
        total: totalResult?.count || 0,
        byCategory,
        active: activeResult?.count || 0,
        inactive: (totalResult?.count || 0) - (activeResult?.count || 0)
      };
    } catch (error) {
      console.error('Error getting indicator statistics:', error);
      throw error;
    }
  }

  /**
   * Get indicator history
   */
  static async getHistory(indicatorId: string): Promise<any[]> {
    try {
      const db = getDB();
      
      const rows = await allAsync<any>(
        db,
        'SELECT * FROM indicators_history WHERE indicator_id = ? ORDER BY version DESC',
        [indicatorId]
      );
      
      // Parse JSON snapshot field
      return rows.map(row => ({
        ...row,
        snapshot: row.snapshot ? JSON.parse(row.snapshot) : {}
      }));
    } catch (error) {
      console.error('Error getting indicator history:', error);
      throw error;
    }
  }

  /**
   * Get configuration versions (all)
   */
  static async getConfigurationVersions(): Promise<any[]> {
    try {
      const db = getDB();
      
      const rows = await allAsync<any>(
        db,
        'SELECT * FROM configuration_versions ORDER BY created_at DESC'
      );
      
      // Parse JSON fields
      return rows.map((row: any) => ({
        ...row,
        indicators: row.indicators ? JSON.parse(row.indicators) : [],
        parameters: row.parameters ? JSON.parse(row.parameters) : [],
        scoring_rules: row.scoring_rules ? JSON.parse(row.scoring_rules) : [],
        form_templates: row.form_templates ? JSON.parse(row.form_templates) : []
      }));
    } catch (error) {
      console.error('Error getting configuration versions:', error);
      throw error;
    }
  }

  /**
   * Get configuration version by ID
   */
  static async getConfigurationVersionById(id: string | number): Promise<any> {
    try {
      const db = getDB();
      
      const row = await getAsync<any>(
        db,
        'SELECT * FROM configuration_versions WHERE id = ?',
        [id]
      );
      
      if (!row) {
        return null;
      }
      
      // Parse JSON fields
      return {
        ...row,
        indicators: row.indicators ? JSON.parse(row.indicators) : [],
        parameters: row.parameters ? JSON.parse(row.parameters) : [],
        scoring_rules: row.scoring_rules ? JSON.parse(row.scoring_rules) : [],
        form_templates: row.form_templates ? JSON.parse(row.form_templates) : []
      };
    } catch (error) {
      console.error('Error getting configuration version by ID:', error);
      throw error;
    }
  }

  /**
   * Restore indicator to specific version
   */
  static async restoreVersion(
    indicatorId: string,
    version: number,
    restoredBy: string
  ): Promise<boolean> {
    try {
      const db = getDB();
      
      // Get the historical version
      const historyRow = await getAsync<any>(
        db,
        'SELECT snapshot FROM indicators_history WHERE indicator_id = ? AND version = ?',
        [indicatorId, version]
      );
      
      if (!historyRow) {
        throw new Error(`Version ${version} not found for indicator ${indicatorId}`);
      }
      
      const historicalData = JSON.parse(historyRow.snapshot);
      
      // Update current indicator with historical data
      return await this.update(indicatorId, historicalData, restoredBy);
    } catch (error) {
      console.error('Error restoring indicator version:', error);
      throw error;
    }
  }

  /**
   * Validate indicator configuration
   */
  static async validateIndicator(indicator: Partial<IndicatorDefinition>): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!indicator.name?.trim()) {
      errors.push('Indicator name is required');
    } else if (indicator.name.length < 2) {
      errors.push('Indicator name must be at least 2 characters');
    }

    if (!indicator.category) {
      errors.push('Category is required');
    }

    if (indicator.weight !== undefined) {
      if (typeof indicator.weight !== 'number') {
        errors.push('Weight must be a number');
      } else if (indicator.weight < 0 || indicator.weight > 100) {
        errors.push('Weight must be between 0 and 100');
      }
    }

    if (indicator.maxScore !== undefined) {
      if (typeof indicator.maxScore !== 'number') {
        errors.push('Max score must be a number');
      } else if (indicator.maxScore < 0) {
        errors.push('Max score must be a positive number');
      }
    }

    // Validate parameters
    if (indicator.parameters && Array.isArray(indicator.parameters)) {
      indicator.parameters.forEach((param, index) => {
        if (!param.code?.trim()) {
          errors.push(`Parameter ${index + 1}: Code is required`);
        }
        if (!param.label?.trim()) {
          errors.push(`Parameter ${index + 1}: Label is required`);
        }
        if (!param.type) {
          errors.push(`Parameter ${index + 1}: Type is required`);
        }
        
        // Type-specific validation
        if (param.type === 'select' && (!param.options || param.options.length === 0)) {
          errors.push(`Parameter ${index + 1}: Select type requires options`);
        }
        
        if (param.type === 'number') {
          if (param.validation?.min !== undefined && param.validation?.max !== undefined && param.validation.min > param.validation.max) {
            errors.push(`Parameter ${index + 1}: Min value cannot be greater than max value`);
          }
        }
      });
    }

    // Validate scoring rules
    if (indicator.scoringRules && Array.isArray(indicator.scoringRules)) {
      indicator.scoringRules.forEach((rule, index) => {
        if (!rule.condition?.trim()) {
          errors.push(`Scoring rule ${index + 1}: Condition is required`);
        }
        if (rule.points === undefined || typeof rule.points !== 'number') {
          errors.push(`Scoring rule ${index + 1}: Points must be a number`);
        }
        if (rule.minValue !== undefined && rule.maxValue !== undefined && rule.minValue > rule.maxValue) {
          errors.push(`Scoring rule ${index + 1}: Min value cannot be greater than max value`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

    /**
   * Map database row to IndicatorDefinition - DEBUG VERSION
   */
  private static mapRowToIndicator(row: any): IndicatorDefinition {
    // DEBUG: Log raw data
    console.log('=== DEBUG mapRowToIndicator ===');
    console.log('Indicator ID:', row.id);
    console.log('Indicator Name:', row.name);
    console.log('Raw parameters field type:', typeof row.parameters);
    console.log('Raw parameters value:', row.parameters);
    
    // Parse JSON fields from database
    let parameters: ParameterDefinition[] = [];
    try {
      if (row.parameters && row.parameters.trim() !== '' && row.parameters !== '[]') {
        console.log('Attempting to parse parameters JSON...');
        const parsed = JSON.parse(row.parameters);
        console.log('Successfully parsed. Type:', typeof parsed);
        console.log('Parsed value:', parsed);
        console.log('Is array?', Array.isArray(parsed));
        
        if (Array.isArray(parsed)) {
          console.log('Array length:', parsed.length);
          if (parsed.length > 0) {
            console.log('First item in array:', parsed[0]);
            // Test mapParameter on first item
            const testMapped = this.mapParameter(parsed[0]);
            console.log('First item after mapParameter:', testMapped);
          }
          
          parameters = parsed.map((p: any) => this.mapParameter(p));
        } else {
          console.warn('Parsed parameters is not an array:', parsed);
          parameters = [];
        }
      } else {
        console.log('No parameters or empty parameters field');
        if (row.parameters === null || row.parameters === undefined) {
          console.log('parameters field is null/undefined');
        } else if (row.parameters === '[]') {
          console.log('parameters field is empty array string');
        }
      }
    } catch (error: any) {
      console.error('ERROR parsing parameters:', error);
      console.error('Error stack:', error.stack);
      console.error('Problematic JSON string:', row.parameters);
      parameters = [];
    }
    
    console.log('Final mapped parameters array length:', parameters.length);
    console.log('Final mapped parameters:', parameters);
    console.log('=== END DEBUG ===\n');
    
    // Parse other JSON fields
    const scoringRules = row.scoring_rules ? JSON.parse(row.scoring_rules) : [];
    const metadata = row.metadata ? JSON.parse(row.metadata) : {};
    const uiConfig = row.ui_config ? JSON.parse(row.ui_config) : {};
    
    // Convert database snake_case to TypeScript camelCase
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      category: row.category as IndicatorCategory,
      weight: row.weight,
      maxScore: row.max_score || 100,
      scoringMethod: row.scoring_method as 'sum' | 'average' | 'weighted' | 'formula' | 'conditional',
      formula: row.formula || '',
      parameters: parameters,
      scoringRules: scoringRules.map((r: any) => this.mapScoringRule(r)),
      uiConfig: uiConfig,
      isActive: row.is_active === 1,
      displayOrder: row.display_order,
      metadata: metadata,
      version: row.version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by
    };
  }

  /**
   * Map parameter from database to ParameterDefinition
   * FIXED: Now handles both old format (with name field) and new format (with label field)
   */
  private static mapParameter(param: any): ParameterDefinition {
  // Handle backward compatibility: if label doesn't exist, use name or code
  const label = param.label || param.name || param.code || 'Unnamed Parameter';
  
  // Handle scoring_rules field that might be in the parameter (old format)
  // Remove it since scoring rules are separate from parameters
  const { scoring_rules, ...cleanParam } = param;
  
  // Extract calculation config from either snake_case or camelCase
  let calculationConfig = cleanParam.calculation_config || cleanParam.calculationConfig;
  
  // If calculationConfig exists but is a string (JSON), parse it
  if (calculationConfig && typeof calculationConfig === 'string') {
    try {
      calculationConfig = JSON.parse(calculationConfig);
    } catch (e) {
      console.error('Error parsing calculationConfig JSON:', e);
      calculationConfig = undefined;
    }
  }
  
  // If no calculationConfig, don't include it (it's optional in ParameterDefinition)
  // Otherwise, ensure it has the minimum required structure
  let finalCalculationConfig;
  if (calculationConfig) {
    finalCalculationConfig = {
      calculationType: calculationConfig.calculationType || 'manual',
      autoCalculate: calculationConfig.autoCalculate !== false,
      allowManualOverride: calculationConfig.allowManualOverride || false,
      showCalculation: calculationConfig.showCalculation || false,
      calculationDetails: calculationConfig.calculationDetails,
      validationRules: calculationConfig.validationRules
    };
  }
  
  return {
    id: cleanParam.id || cleanParam.code || `param_${Date.now()}`,
    code: cleanParam.code || cleanParam.id || 'unnamed',
    label: label,
    type: (cleanParam.type || 'text') as any,
    description: cleanParam.description || '',
    required: cleanParam.required !== false,
    defaultValue: cleanParam.default_value || cleanParam.defaultValue,
    options: cleanParam.options || [],
    validation: cleanParam.validation || {},
    uiSettings: cleanParam.ui_settings || cleanParam.uiSettings || {},
    calculationConfig: finalCalculationConfig, // Now properly structured or undefined
    scoringRuleIds: cleanParam.scoring_rule_ids || cleanParam.scoringRuleIds || [],
    dependencies: cleanParam.dependencies || [],
    displayOrder: cleanParam.display_order || cleanParam.displayOrder || 0,
    isActive: cleanParam.is_active !== false,
    metadata: cleanParam.metadata || {}
  };
}
  /**
   * Map scoring rule from database to ScoringRule
   */
  private static mapScoringRule(rule: any): ScoringRule {
    return {
      id: rule.id,
      parameterCode: rule.parameter_code,
      condition: rule.condition,
      description: rule.description,
      points: rule.points,
      minValue: rule.min_value,
      maxValue: rule.max_value,
      dependsOn: rule.depends_on || [],
      metadata: rule.metadata || {}
    };
  }

  /**
 * Prepare parameter for database (camelCase to snake_case)
 * FIXED: Now handles conversion properly
 */
private static prepareParameterForDb(param: ParameterDefinition): any {
  // Ensure required fields
  const dbParam: any = {
    id: param.id || param.code || `param_${Date.now()}`,
    code: param.code || 'unnamed',
    label: param.label || param.code || 'Unnamed Parameter',
    type: param.type || 'text',
    description: param.description || '',
    required: param.required !== false,
    default_value: param.defaultValue,
    options: param.options || [],
    validation: param.validation || {},
    ui_settings: param.uiSettings || {},
    display_order: param.displayOrder || 0,
    is_active: param.isActive !== false,
    metadata: param.metadata || {}
  };
  
  // Only include calculation_config if it exists and has content
  if (param.calculationConfig) {
    dbParam.calculation_config = param.calculationConfig;
  }
  
  // Include scoring rule IDs if they exist
  if (param.scoringRuleIds && param.scoringRuleIds.length > 0) {
    dbParam.scoring_rule_ids = param.scoringRuleIds;
  }
  
  // Include dependencies if they exist
  if (param.dependencies && param.dependencies.length > 0) {
    dbParam.dependencies = param.dependencies;
  }
  
  return dbParam;
}
  /**
   * Prepare scoring rule for database (camelCase to snake_case)
   */
  private static prepareScoringRuleForDb(rule: ScoringRule): any {
    return {
      id: rule.id,
      parameter_code: rule.parameterCode,
      condition: rule.condition,
      description: rule.description,
      points: rule.points,
      min_value: rule.minValue,
      max_value: rule.maxValue,
      depends_on: rule.dependsOn,
      metadata: rule.metadata
    };
  }

  /**
   * Generate ID from name
   */
  private static generateId(name: string): string {
    return `ind_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate code from name
   */
  private static generateCode(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
  }

  /**
   * Create history entry - FIXED VERSION
   */
  private static async createHistoryEntry(
    indicatorId: string,
    version: number,
    action: string,  // 'create', 'update', 'delete', 'activate', 'deactivate'
    changedBy: string,
    snapshot: any
  ): Promise<void> {
    try {
      const db = getDB();
      
      // Ensure action is lowercase to match database constraint
      const lowercaseAction = action.toLowerCase();
      
      await runAsync(
        db,
        `INSERT INTO indicators_history (
          indicator_id, version, action, changed_by, snapshot, changed_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          indicatorId,
          version,
          lowercaseAction,
          changedBy,
          JSON.stringify(snapshot),
          new Date().toISOString()
        ]
      );
    } catch (error) {
      console.error('Error creating history entry:', error);
      throw error;
    }
  }
}