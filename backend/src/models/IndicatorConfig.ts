// backend/src/models/IndicatorConfig.ts - COMPLETE POSTGRESQL FIXED VERSION

import { getDB, getAsync, allAsync, runAsync } from './db';
import { 
  IndicatorDefinition, 
  ParameterDefinition, 
  ScoringRule, 
  IndicatorCategory
} from '../types/config';

function safeParse(value: any) {
  try {
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    return [];
  }
}

function normalizeIndicator(ind: any) {
  return {
    ...ind,
    parameters: Array.isArray(ind.parameters)
      ? ind.parameters
      : safeParse(ind.parameters) || [],
    scoring_rules: Array.isArray(ind.scoring_rules)
      ? ind.scoring_rules
      : safeParse(ind.scoring_rules) || []
  };
}

type CreateIndicatorInput = Omit<IndicatorDefinition, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'createdBy' | 'updatedBy'> & {
  id?: string;
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
        : 'SELECT * FROM indicators WHERE is_active = true ORDER BY category, display_order, name';
      
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
        'SELECT * FROM indicators WHERE id = $1', 
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
        'SELECT * FROM indicators WHERE code = $1', 
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
      const indicator = await this.getById(indicatorId);
      if (!indicator) {
        throw new Error(`Indicator with ID ${indicatorId} not found`);
      }
      return indicator.parameters || [];
    } catch (error) {
      console.error('Error getting indicator parameters:', error);
      throw error;
    }
  }

  /**
   * Create new indicator
   */
  static async create(indicator: CreateIndicatorInput): Promise<string> {
    try {
      const db = getDB();
      
      const id = indicator.id || this.generateId(indicator.name);
      const code = indicator.code || this.generateCode(indicator.name);
      
      const existing = await this.getByCode(code);
      if (existing) {
        throw new Error(`Indicator with code "${code}" already exists`);
      }
      
      const maxOrderResult = await getAsync<{ max_order: number }>(
        db,
        'SELECT MAX(display_order) as max_order FROM indicators WHERE category = $1',
        [indicator.category]
      );
      const displayOrder = (maxOrderResult?.max_order || 0) + 1;
      
      const parameters = indicator.parameters || [];
      const scoringRules = indicator.scoringRules || [];
      
      await runAsync(
        db,
        `INSERT INTO indicators (
          id, code, name, description, category, weight, max_score,
          scoring_method, formula, parameters, scoring_rules, ui_config,
          is_active, display_order, metadata, version,
          created_by, updated_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
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
          indicator.isActive !== false,
          displayOrder,
          JSON.stringify(indicator.metadata || {}),
          1,
          indicator.createdBy || 'system',
          indicator.createdBy || 'system',
          new Date().toISOString(),
          new Date().toISOString()
        ]
      );
      
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
  static async update(id: string, updates: Partial<IndicatorDefinition>, updatedBy: string): Promise<boolean> {
    try {
      const db = getDB();
      
      const current = await this.getById(id);
      if (!current) {
        throw new Error('Indicator not found');
      }
      
      if (updates.code && updates.code !== current.code) {
        const existingWithCode = await this.getByCode(updates.code);
        if (existingWithCode && existingWithCode.id !== id) {
          throw new Error(`Indicator with code "${updates.code}" already exists`);
        }
      }
      
      const newVersion = current.version + 1;
      const updatedIndicator = { ...current, ...updates };
      
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      const addField = (field: string, value: any) => {
        updateFields.push(`${field} = $${paramIndex++}`);
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
      if (updates.isActive !== undefined) addField('is_active', updates.isActive === true);
      if (updates.displayOrder !== undefined) addField('display_order', updates.displayOrder);
      if (updates.metadata !== undefined) addField('metadata', JSON.stringify(updates.metadata || {}));
      
      addField('version', newVersion);
      addField('updated_by', updatedBy);
      addField('updated_at', new Date().toISOString());
      
      values.push(id);
      
      const query = `UPDATE indicators SET ${updateFields.join(', ')} WHERE id = $${paramIndex++}`;
      
      await runAsync(db, query, values);
      
      await this.createHistoryEntry(id, newVersion, 'update', updatedBy, updatedIndicator);
      
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
      
      const current = await this.getById(id);
      if (!current) {
        throw new Error('Indicator not found');
      }
      
      await runAsync(
        db,
        'UPDATE indicators SET is_active = false, updated_by = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [deletedBy, id]
      );
      
      await this.createHistoryEntry(id, current.version + 1, 'delete', deletedBy, {
        ...current,
        isActive: false,
        updatedBy: deletedBy,
        updatedAt: new Date().toISOString()
      });
      
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
      await runAsync(db, 'DELETE FROM indicators WHERE id = $1', [id]);
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
  static async reorderIndicators(category: IndicatorCategory, orderedIds: string[]): Promise<boolean> {
    try {
      const db = getDB();
      await runAsync(db, 'BEGIN');
      
      try {
        for (let i = 0; i < orderedIds.length; i++) {
          await runAsync(
            db,
            'UPDATE indicators SET display_order = $1 WHERE id = $2 AND category = $3',
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
        ? 'SELECT * FROM indicators WHERE category = $1 ORDER BY display_order, name'
        : 'SELECT * FROM indicators WHERE category = $1 AND is_active = true ORDER BY display_order, name';
      
      const rows = await allAsync<any>(db, query, [category]);
      return rows.map((row: any) => this.mapRowToIndicator(row));
    } catch (error) {
      console.error('Error getting indicators by category:', error);
      throw error;
    }
  }

  /**
   * Get all active indicators
   */
  static async getCompleteConfiguration(): Promise<IndicatorDefinition[]> {
    try {
      const db = getDB();
      const rows = await allAsync<any>(
        db,
        'SELECT * FROM indicators WHERE is_active = true ORDER BY category, display_order, name'
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
      
      const activeVersion = await getAsync<any>(
        db,
        'SELECT * FROM configuration_versions WHERE is_active = true LIMIT 1'
      );
      
      if (activeVersion) {
        return {
          ...activeVersion,
          indicators: activeVersion.indicators ? JSON.parse(activeVersion.indicators) : [],
          parameters: activeVersion.parameters ? JSON.parse(activeVersion.parameters) : [],
          scoring_rules: activeVersion.scoring_rules ? JSON.parse(activeVersion.scoring_rules) : [],
          form_templates: activeVersion.form_templates ? JSON.parse(activeVersion.form_templates) : []
        };
      }
      
      const indicators = await this.getCompleteConfiguration();
      const allParameters: ParameterDefinition[] = [];
      
      for (const indicator of indicators) {
        if (indicator.parameters && indicator.parameters.length > 0) {
          allParameters.push(...indicator.parameters);
        }
      }
      
      const scoringRules = await allAsync<any>(
        db,
        'SELECT * FROM scoring_rules WHERE is_active = true'
      );
      
      const extendedScoringRules = await allAsync<any>(
        db,
        'SELECT * FROM extended_scoring_rules WHERE is_active = true'
      );
      
      const formTemplates = await allAsync<any>(
        db,
        'SELECT * FROM form_templates WHERE is_active = true'
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
      'SELECT id FROM configuration_versions WHERE version_number = $1',
      [versionData.version_number]
    );
    
    if (existingVersion) {
      throw new Error(`Version ${versionData.version_number} already exists`);
    }
    
    // Insert the new version
    await runAsync(
      db,
      `INSERT INTO configuration_versions (
        version_name, version_number, description,
        indicators, parameters, scoring_rules, form_templates,
        is_active, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)`,
      [
        versionData.version_name,
        versionData.version_number,
        versionData.description || '',
        JSON.stringify(versionData.indicators || []),
        JSON.stringify(versionData.parameters || []),
        JSON.stringify(versionData.scoring_rules || []),
        JSON.stringify(versionData.form_templates || []),
        versionData.is_active === true,
        versionData.created_by || 'system'
      ]
    );
    
    // Get the newly created version ID
    const newVersion = await getAsync<{ id: number }>(
      db,
      'SELECT id FROM configuration_versions WHERE version_number = $1 ORDER BY created_at DESC LIMIT 1',
      [versionData.version_number]
    );
    
    if (!newVersion || !newVersion.id) {
      throw new Error('Failed to get created version ID');
    }
    
    return newVersion.id;
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
      
      await runAsync(db, 'BEGIN');
      
      try {
        const version = await getAsync<any>(
          db,
          'SELECT * FROM configuration_versions WHERE id = $1',
          [versionId]
        );
        
        if (!version) {
          throw new Error('Configuration version not found');
        }
        
        const indicators = version.indicators ? JSON.parse(version.indicators) : [];
        const formTemplates = version.form_templates ? JSON.parse(version.form_templates) : [];
        
        await runAsync(
          db,
          'UPDATE configuration_versions SET is_active = false, applied_at = NULL'
        );
        
        await runAsync(
          db,
          'UPDATE configuration_versions SET is_active = true, applied_at = CURRENT_TIMESTAMP, applied_by = $1 WHERE id = $2',
          [appliedBy, versionId]
        );
        
        for (const indicator of indicators) {
          const existingIndicator = await this.getById(indicator.id);
          
          if (existingIndicator) {
            await this.update(indicator.id, indicator, appliedBy);
          } else {
            const createData: any = {
              ...indicator,
              createdBy: appliedBy
            };
            await this.create(createData);
          }
        }
        
        for (const template of formTemplates) {
          const existingTemplate = await getAsync<any>(
            db,
            'SELECT id FROM form_templates WHERE id = $1',
            [template.id]
          );
          
          if (existingTemplate) {
            await runAsync(
              db,
              `UPDATE form_templates SET 
                name = $1, description = $2, sections = $3, ui_config = $4,
                is_active = $5, updated_by = $6, updated_at = CURRENT_TIMESTAMP
               WHERE id = $7`,
              [
                template.name,
                template.description || '',
                JSON.stringify(template.sections || []),
                JSON.stringify(template.ui_config || {}),
                template.is_active === true,
                appliedBy,
                template.id
              ]
            );
          } else {
            await runAsync(
              db,
              `INSERT INTO form_templates (
                id, name, description, sections, ui_config,
                is_active, created_by, updated_by, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
              [
                template.id || `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                template.name,
                template.description || '',
                JSON.stringify(template.sections || []),
                JSON.stringify(template.ui_config || {}),
                template.is_active === true,
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
   * Get all configuration versions
   */
  static async getConfigurationVersions(): Promise<any[]> {
    try {
      const db = getDB();
      
      const rows = await allAsync<any>(
        db,
        'SELECT * FROM configuration_versions ORDER BY created_at DESC'
      );
      
      return rows.map((row: any) => ({
        id: row.id,
        versionName: row.version_name,
        versionNumber: row.version_number,
        description: row.description,
        isActive: row.is_active === true,
        createdAt: row.created_at,
        appliedAt: row.applied_at,
        createdBy: row.created_by,
        appliedBy: row.applied_by,
        indicators: row.indicators ? JSON.parse(row.indicators) : [],
        parameters: row.parameters ? JSON.parse(row.parameters) : [],
        scoring_rules: row.scoring_rules ? JSON.parse(row.scoring_rules) : [],
        form_templates: row.form_templates ? JSON.parse(row.form_templates) : []
      }));
    } catch (error) {
      console.error('Error getting configuration versions:', error);
      return [];
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
        'SELECT * FROM configuration_versions WHERE id = $1',
        [id]
      );
      
      if (!row) {
        return null;
      }
      
      return {
        id: row.id,
        versionName: row.version_name,
        versionNumber: row.version_number,
        description: row.description,
        isActive: row.is_active === true,
        createdAt: row.created_at,
        appliedAt: row.applied_at,
        createdBy: row.created_by,
        appliedBy: row.applied_by,
        indicators: row.indicators ? JSON.parse(row.indicators) : [],
        parameters: row.parameters ? JSON.parse(row.parameters) : [],
        scoring_rules: row.scoring_rules ? JSON.parse(row.scoring_rules) : [],
        form_templates: row.form_templates ? JSON.parse(row.form_templates) : []
      };
    } catch (error) {
      console.error('Error getting configuration version by ID:', error);
      return null;
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
      
      const totalResult = await getAsync<{ count: string }>(
        db,
        'SELECT COUNT(*) as count FROM indicators'
      );
      
      const activeResult = await getAsync<{ count: string }>(
        db,
        'SELECT COUNT(*) as count FROM indicators WHERE is_active = true'
      );
      
      const categoryResult = await allAsync<{ category: string; count: string }>(
        db,
        'SELECT category, COUNT(*) as count FROM indicators WHERE is_active = true GROUP BY category'
      );
      
      const byCategory: Record<string, number> = {};
      const categories = Array.isArray(categoryResult) ? categoryResult : [];
      categories.forEach(row => {
        byCategory[row.category] = parseInt(row.count, 10);
      });
      
      const total = parseInt(totalResult?.count || '0', 10);
      const active = parseInt(activeResult?.count || '0', 10);
      
      return {
        total,
        byCategory,
        active,
        inactive: total - active
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
        'SELECT * FROM indicators_history WHERE indicator_id = $1 ORDER BY version DESC',
        [indicatorId]
      );
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
   * Restore indicator to specific version
   */
  static async restoreVersion(
    indicatorId: string,
    version: number,
    restoredBy: string
  ): Promise<boolean> {
    try {
      const db = getDB();
      
      const historyRow = await getAsync<any>(
        db,
        'SELECT snapshot FROM indicators_history WHERE indicator_id = $1 AND version = $2',
        [indicatorId, version]
      );
      
      if (!historyRow) {
        throw new Error(`Version ${version} not found for indicator ${indicatorId}`);
      }
      
      const historicalData = JSON.parse(historyRow.snapshot);
      
      delete historicalData.id;
      delete historicalData.createdAt;
      delete historicalData.createdBy;
      delete historicalData.version;
      
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
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Map database row to IndicatorDefinition
   */
  private static mapRowToIndicator(row: any): IndicatorDefinition {
    let parameters: ParameterDefinition[] = [];
    try {
      if (row.parameters) {
        const parsed = typeof row.parameters === 'string' ? JSON.parse(row.parameters) : row.parameters;
        parameters = Array.isArray(parsed) ? parsed.map((p: any) => this.mapParameter(p)) : [];
      }
    } catch (error: any) {
      console.error(`Error parsing parameters for indicator ${row.id}:`, error.message);
      parameters = [];
    }
    
    let scoringRulesArray: any[] = [];
    try {
      if (row.scoring_rules) {
        const parsed = typeof row.scoring_rules === 'string' ? JSON.parse(row.scoring_rules) : row.scoring_rules;
        scoringRulesArray = Array.isArray(parsed) ? parsed : [];
      }
    } catch (error: any) {
      console.error(`Error parsing scoring_rules for indicator ${row.id}:`, error.message);
      scoringRulesArray = [];
    }
    
    let metadata = {};
    try {
      if (row.metadata) {
        metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
      }
    } catch (error: any) {
      metadata = {};
    }
    
    let uiConfig = {};
    try {
      if (row.ui_config) {
        uiConfig = typeof row.ui_config === 'string' ? JSON.parse(row.ui_config) : row.ui_config;
      }
    } catch (error: any) {
      uiConfig = {};
    }
    
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
      scoringRules: scoringRulesArray.map((r: any) => this.mapScoringRule(r)),
      uiConfig: uiConfig,
      isActive: row.is_active === true,
      displayOrder: row.display_order,
      metadata: metadata,
      version: row.version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by
    };
  }

  private static mapParameter(param: any): ParameterDefinition {
    const label = param.label || param.name || param.code || 'Unnamed Parameter';
    const { scoring_rules, ...cleanParam } = param;
    
    let calculationConfig = cleanParam.calculation_config || cleanParam.calculationConfig;
    if (calculationConfig && typeof calculationConfig === 'string') {
      try {
        calculationConfig = JSON.parse(calculationConfig);
      } catch (e) {
        calculationConfig = undefined;
      }
    }
    
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
      calculationConfig: finalCalculationConfig,
      scoringRuleIds: cleanParam.scoring_rule_ids || cleanParam.scoringRuleIds || [],
      dependencies: cleanParam.dependencies || [],
      displayOrder: cleanParam.display_order || cleanParam.displayOrder || 0,
      isActive: cleanParam.is_active !== false,
      metadata: cleanParam.metadata || {}
    };
  }

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

  private static prepareParameterForDb(param: ParameterDefinition): any {
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
    
    if (param.calculationConfig) {
      dbParam.calculation_config = param.calculationConfig;
    }
    if (param.scoringRuleIds && param.scoringRuleIds.length > 0) {
      dbParam.scoring_rule_ids = param.scoringRuleIds;
    }
    if (param.dependencies && param.dependencies.length > 0) {
      dbParam.dependencies = param.dependencies;
    }
    
    return dbParam;
  }

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

  private static generateId(name: string): string {
    return `ind_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static generateCode(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
  }

  private static async createHistoryEntry(
    indicatorId: string,
    version: number,
    action: string,
    changedBy: string,
    snapshot: any
  ): Promise<void> {
    try {
      const db = getDB();
      const lowercaseAction = action.toLowerCase();
      
      await runAsync(
        db,
        `INSERT INTO indicators_history (
          indicator_id, version, action, changed_by, snapshot, changed_at
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
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