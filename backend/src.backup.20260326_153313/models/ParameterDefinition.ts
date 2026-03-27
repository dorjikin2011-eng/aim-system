// backend/src/models/ParameterDefinition.ts
import { getDB, getAsync, allAsync, runAsync } from './db';
import { 
  ParameterDefinition as ParameterDefinitionType, 
  DataType, 
  CalculationConfig,
  CalculationDetails,
  PercentageConfig,
  WeightedSumConfig,
  BooleanLogicConfig,
  FormulaConfig,
  SystemStatusConfig,
  CalculationType
} from '../types/config';

export class ParameterDefinition {
  /**
   * Get all parameter definitions
   */
  static async getAll(includeInactive = false): Promise<ParameterDefinitionType[]> {
    const db = getDB();
    const query = includeInactive 
      ? 'SELECT * FROM parameter_definitions ORDER BY code'
      : 'SELECT * FROM parameter_definitions WHERE is_active = 1 ORDER BY code';
    
    const rows = await allAsync<any>(db, query);
    return rows.map(row => this.mapRowToParameter(row));
  }

  /**
   * Get parameter definition by code
   */
  static async getByCode(code: string): Promise<ParameterDefinitionType | null> {
    const db = getDB();
    const row = await getAsync<any>(
      db,
      'SELECT * FROM parameter_definitions WHERE code = ?',
      [code]
    );
    
    if (!row) return null;
    return this.mapRowToParameter(row);
  }

  /**
   * Get parameter definition by ID
   */
  static async getById(id: string): Promise<ParameterDefinitionType | null> {
    const db = getDB();
    const row = await getAsync<any>(
      db,
      'SELECT * FROM parameter_definitions WHERE id = ?',
      [id]
    );
    
    if (!row) return null;
    return this.mapRowToParameter(row);
  }

  /**
   * Create parameter definition
   */
  static async create(
    param: Omit<ParameterDefinitionType, 'created_at' | 'updated_at'> & {
      createdBy: string;
    }
  ): Promise<string | null> {
    const db = getDB();
    
    // Use provided id or generate one
    const id = param.id || `param_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      await runAsync(
        db,
        `INSERT INTO parameter_definitions (
          id, code, name, description, data_type, validation_rules, 
          ui_component, options, default_value, is_active, created_by, updated_by,
          calculation_config, scoring_rule_ids, dependencies,
          display_order, metadata, required, weight
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          param.code,
          param.label,
          param.description || null,
          param.type || 'text',
          JSON.stringify(param.validation || {}),
          param.uiSettings?.component || null,
          JSON.stringify(param.options || []),
          param.defaultValue !== undefined ? JSON.stringify(param.defaultValue) : null,
          param.isActive ? 1 : 0,
          param.createdBy,
          param.createdBy,
          param.calculationConfig ? JSON.stringify(param.calculationConfig) : null,
          JSON.stringify(param.scoringRuleIds || []),
          JSON.stringify(param.dependencies || []),
          param.displayOrder || 0,
          JSON.stringify(param.metadata || {}),
          param.required ? 1 : 0,
          param.weight || null
        ]
      );
      
      return id;
    } catch (error) {
      console.error('Error creating parameter definition:', error);
      return null;
    }
  }

  /**
   * Update parameter definition
   */
  static async update(
    id: string,
    updates: Partial<ParameterDefinitionType>,
    updatedBy: string
  ): Promise<boolean> {
    const db = getDB();
    
    const fields: string[] = [];
    const values: any[] = [];
    
    // Build dynamic update query
    if (updates.code !== undefined) {
      fields.push('code = ?');
      values.push(updates.code);
    }
    if (updates.label !== undefined) {
      fields.push('name = ?');
      values.push(updates.label);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.type !== undefined) {
      fields.push('data_type = ?');
      values.push(updates.type);
    }
    if (updates.validation !== undefined) {
      fields.push('validation_rules = ?');
      values.push(JSON.stringify(updates.validation));
    }
    if (updates.uiSettings !== undefined) {
      fields.push('ui_component = ?');
      values.push(updates.uiSettings.component || null);
    }
    if (updates.options !== undefined) {
      fields.push('options = ?');
      values.push(JSON.stringify(updates.options));
    }
    if (updates.defaultValue !== undefined) {
      fields.push('default_value = ?');
      values.push(JSON.stringify(updates.defaultValue));
    }
    if (updates.isActive !== undefined) {
      fields.push('is_active = ?');
      values.push(updates.isActive ? 1 : 0);
    }
    if (updates.calculationConfig !== undefined) {
      fields.push('calculation_config = ?');
      values.push(JSON.stringify(updates.calculationConfig));
    }
    if (updates.scoringRuleIds !== undefined) {
      fields.push('scoring_rule_ids = ?');
      values.push(JSON.stringify(updates.scoringRuleIds));
    }
    if (updates.dependencies !== undefined) {
      fields.push('dependencies = ?');
      values.push(JSON.stringify(updates.dependencies));
    }
    if (updates.displayOrder !== undefined) {
      fields.push('display_order = ?');
      values.push(updates.displayOrder);
    }
    if (updates.metadata !== undefined) {
      fields.push('metadata = ?');
      values.push(JSON.stringify(updates.metadata));
    }
    if (updates.required !== undefined) {
      fields.push('required = ?');
      values.push(updates.required ? 1 : 0);
    }
    if (updates.weight !== undefined) {
      fields.push('weight = ?');
      values.push(updates.weight);
    }
    
    if (fields.length === 0) {
      return false;
    }
    
    fields.push('updated_by = ?');
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(updatedBy);
    values.push(id);
    
    try {
      await runAsync(
        db,
        `UPDATE parameter_definitions SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
      return true;
    } catch (error) {
      console.error('Error updating parameter definition:', error);
      return false;
    }
  }

  /**
   * Delete parameter definition (soft delete)
   */
  static async delete(id: string, deletedBy: string): Promise<boolean> {
    const db = getDB();
    
    try {
      await runAsync(
        db,
        'UPDATE parameter_definitions SET is_active = 0, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [deletedBy, id]
      );
      return true;
    } catch (error) {
      console.error('Error deleting parameter definition:', error);
      return false;
    }
  }

  /**
   * Get parameters by calculation type
   */
  static async getByCalculationType(calculationType: CalculationType): Promise<ParameterDefinitionType[]> {
    const db = getDB();
    const rows = await allAsync<any>(
      db,
      'SELECT * FROM parameter_definitions WHERE calculation_config LIKE ? AND is_active = 1 ORDER BY display_order, code',
      [`%"calculationType":"${calculationType}"%`]
    );
    
    return rows.map(row => this.mapRowToParameter(row));
  }

  /**
   * Get parameters with auto-scoring
   */
  static async getAutoScoringParameters(): Promise<ParameterDefinitionType[]> {
    const db = getDB();
    const rows = await allAsync<any>(
      db,
      `SELECT * FROM parameter_definitions 
       WHERE (calculation_config LIKE '%"calculationType":"auto"%' 
              OR calculation_config LIKE '%"calculationType":"mixed"%'
              OR calculation_config LIKE '%"calculationType":"percentage"%'
              OR calculation_config LIKE '%"calculationType":"weighted_sum"%')
       AND is_active = 1 
       ORDER BY display_order, code`,
      []
    );
    
    return rows.map(row => this.mapRowToParameter(row));
  }

  /**
   * Get parameter dependencies
   */
  static async getDependencies(parameterCode: string): Promise<ParameterDefinitionType[]> {
    const db = getDB();
    const rows = await allAsync<any>(
      db,
      `SELECT pd.* FROM parameter_definitions pd 
       WHERE pd.is_active = 1 
       AND JSON_CONTAINS(pd.dependencies, ?)`,
      [JSON.stringify(parameterCode)]
    );
    
    return rows.map(row => this.mapRowToParameter(row));
  }

  /**
   * Calculate value based on calculation config
   */
  static calculateValue(
    param: ParameterDefinitionType,
    formValues: Record<string, any>
  ): { calculatedValue: any; rawData?: Record<string, any>; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const rawData: Record<string, any> = {};

    if (!param.calculationConfig || param.calculationConfig.calculationType === 'manual') {
      return { 
        calculatedValue: formValues[param.code], 
        rawData: {},
        errors: [],
        warnings: []
      };
    }

    const { calculationType, calculationDetails } = param.calculationConfig;

    try {
      switch (calculationType) {
        case 'percentage':
          if (calculationDetails?.percentageConfig) {
            const config = calculationDetails.percentageConfig as PercentageConfig;
            const numerator = Number(formValues[config.numeratorField] || 0);
            const denominator = Number(formValues[config.denominatorField] || 0);
            
            rawData[config.numeratorField] = numerator;
            rawData[config.denominatorField] = denominator;
            
            // Validation
            if (denominator === 0) {
              errors.push(`Denominator (${config.denominatorLabel}) cannot be zero`);
              return { calculatedValue: 0, rawData, errors, warnings };
            }
            
            if (numerator > denominator) {
              warnings.push(`Numerator (${numerator}) is greater than denominator (${denominator})`);
            }
            
            const percentage = (numerator / denominator) * 100;
            const precision = config.precision || 2;
            const calculatedValue = Math.round(percentage * Math.pow(10, precision)) / Math.pow(10, precision);
            
            return { calculatedValue, rawData, errors, warnings };
          }
          break;

        case 'weighted_sum':
          if (calculationDetails?.weightedSumConfig) {
            const config = calculationDetails.weightedSumConfig as WeightedSumConfig;
            let totalWeighted = 0;
            
            config.caseTypes.forEach(caseType => {
              const value = Number(formValues[caseType.field] || 0);
              rawData[caseType.field] = value;
              totalWeighted += value * caseType.weight;
              
              if (caseType.maxCases !== undefined && value > caseType.maxCases) {
                warnings.push(`${caseType.label} (${value}) exceeds maximum allowed (${caseType.maxCases})`);
              }
            });
            
            if (config.maxTotalWeight !== undefined && totalWeighted > config.maxTotalWeight) {
              warnings.push(`Total weighted sum (${totalWeighted}) exceeds maximum (${config.maxTotalWeight})`);
            }
            
            return { calculatedValue: totalWeighted, rawData, errors, warnings };
          }
          break;

        case 'boolean_logic':
          if (calculationDetails?.booleanConfig) {
            const config = calculationDetails.booleanConfig as BooleanLogicConfig;
            const values = config.fields.map(field => Boolean(formValues[field]));
            
            config.fields.forEach((field, idx) => {
              rawData[field] = values[idx];
            });
            
            let result = false;
            if (config.logic === 'AND') {
              result = values.every(v => v);
            } else if (config.logic === 'OR') {
              result = values.some(v => v);
            } else if (config.logic === 'XOR') {
              result = values.filter(v => v).length === 1;
            } else if (config.logic === 'NAND') {
              result = !values.every(v => v);
            } else if (config.logic === 'NOR') {
              result = !values.some(v => v);
            }
            
            return { 
              calculatedValue: result ? (config.trueValue !== undefined ? config.trueValue : true) : (config.falseValue !== undefined ? config.falseValue : false), 
              rawData, 
              errors, 
              warnings 
            };
          }
          break;

        case 'formula':
          if (calculationDetails?.formulaConfig) {
            const config = calculationDetails.formulaConfig as FormulaConfig;
            const variables: Record<string, number> = {};
            
            Object.entries(config.variables).forEach(([varName, varDef]) => {
              const value = Number(formValues[varDef.field] || varDef.defaultValue || 0);
              variables[varName] = value;
              rawData[varDef.field] = value;
            });

            // Replace variables in formula
            let formula = config.formula;
            Object.entries(variables).forEach(([varName, value]) => {
              formula = formula.replace(new RegExp(`\\{${varName}\\}`, 'g'), value.toString());
            });

            // Safe evaluation
            const calculatedValue = Function(`"use strict"; return (${formula})`)();
            
            // Apply validation if defined
            if (config.validation) {
              if (config.validation.minResult !== undefined && calculatedValue < config.validation.minResult) {
                warnings.push(`Formula result (${calculatedValue}) is below minimum (${config.validation.minResult})`);
              }
              if (config.validation.maxResult !== undefined && calculatedValue > config.validation.maxResult) {
                warnings.push(`Formula result (${calculatedValue}) exceeds maximum (${config.validation.maxResult})`);
              }
            }
            
            return { calculatedValue, rawData, errors, warnings };
          }
          break;

        case 'system_status':
          if (calculationDetails?.systemStatusConfig) {
            const config = calculationDetails.systemStatusConfig as SystemStatusConfig;
            let totalScore = 0;
            
            config.systems.forEach(system => {
              const exists = Boolean(formValues[system.existenceField]);
              const functioning = Boolean(formValues[system.functioningField]);
              
              rawData[system.existenceField] = exists;
              rawData[system.functioningField] = functioning;
              
              if (exists) {
                totalScore += system.existencePoints;
                if (functioning) {
                  totalScore += system.functioningPoints;
                }
              }
            });
            
            return { calculatedValue: totalScore, rawData, errors, warnings };
          }
          break;
      }
    } catch (error: any) {
      errors.push(`Calculation error: ${error.message}`);
      console.error('Calculation error:', error);
    }

    // Fallback to manual value if calculation fails
    return { 
      calculatedValue: formValues[param.code], 
      rawData: {},
      errors,
      warnings 
    };
  }

  /**
   * Validate parameter value with calculation support
   */
  static validateValue(param: ParameterDefinitionType, value: any, formValues?: Record<string, any>): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Required check
    if (param.required && (value === undefined || value === null || value === '')) {
      errors.push(`${param.label} is required`);
      return { isValid: false, errors, warnings };
    }
    
    // Type-specific validation
    if (value !== undefined && value !== null && value !== '') {
      switch (param.type) {
        case 'number':
          if (isNaN(Number(value))) {
            errors.push(`${param.label} must be a number`);
          } else {
            const numValue = Number(value);
            if (param.validation?.min !== undefined && numValue < param.validation.min) {
              errors.push(`${param.label} must be at least ${param.validation.min}`);
            }
            if (param.validation?.max !== undefined && numValue > param.validation.max) {
              errors.push(`${param.label} must be at most ${param.validation.max}`);
            }
            if (param.validation?.step !== undefined && numValue % param.validation.step !== 0) {
              warnings.push(`${param.label} should be in steps of ${param.validation.step}`);
            }
          }
          break;
          
        case 'percentage':
          const numValue = Number(value);
          if (isNaN(numValue)) {
            errors.push(`${param.label} must be a number`);
          } else if (numValue < 0 || numValue > 100) {
            errors.push(`${param.label} must be between 0 and 100`);
          }
          break;
          
        case 'select':
          if (param.options && param.options.length > 0) {
            const validValues = param.options.map(opt => opt.value);
            if (!validValues.includes(value)) {
              errors.push(`${param.label} must be one of: ${param.options.map(opt => opt.label).join(', ')}`);
            }
          }
          break;
          
        case 'date':
          if (!(value instanceof Date) && isNaN(Date.parse(value))) {
            errors.push(`${param.label} must be a valid date`);
          }
          break;
          
        case 'array':
          if (!Array.isArray(value)) {
            errors.push(`${param.label} must be an array`);
          } else if (param.validation?.minLength && value.length < param.validation.minLength) {
            errors.push(`${param.label} must have at least ${param.validation.minLength} items`);
          } else if (param.validation?.maxLength && value.length > param.validation.maxLength) {
            errors.push(`${param.label} must have at most ${param.validation.maxLength} items`);
          }
          break;
      }
    }

    // Calculation-specific validation
    if (formValues && param.calculationConfig?.calculationType === 'percentage') {
      const config = param.calculationConfig.calculationDetails?.percentageConfig as PercentageConfig;
      if (config) {
        const numerator = Number(formValues[config.numeratorField] || 0);
        const denominator = Number(formValues[config.denominatorField] || 0);
        
        if (denominator === 0) {
          errors.push(`Denominator (${config.denominatorLabel}) cannot be zero`);
        } else if (numerator > denominator) {
          warnings.push(`Numerator (${config.numeratorLabel}) is greater than denominator`);
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get parameter statistics
   */
  static async getStatistics(): Promise<{
    total: number;
    byType: Record<string, number>;
    byCalculationType: Record<string, number>;
    active: number;
    inactive: number;
  }> {
    const db = getDB();
    
    const totalResult = await getAsync<{ count: number }>(
      db,
      'SELECT COUNT(*) as count FROM parameter_definitions'
    );
    
    const activeResult = await getAsync<{ count: number }>(
      db,
      'SELECT COUNT(*) as count FROM parameter_definitions WHERE is_active = 1'
    );
    
    const typeResult = await allAsync<{ data_type: string; count: number }>(
      db,
      'SELECT data_type, COUNT(*) as count FROM parameter_definitions WHERE is_active = 1 GROUP BY data_type'
    );
    
    // Count by calculation type
    const calcTypeResult = await allAsync<any>(
      db,
      `SELECT 
        CASE 
          WHEN calculation_config LIKE '%"calculationType":"manual"%' THEN 'manual'
          WHEN calculation_config LIKE '%"calculationType":"auto"%' THEN 'auto'
          WHEN calculation_config LIKE '%"calculationType":"mixed"%' THEN 'mixed'
          WHEN calculation_config LIKE '%"calculationType":"percentage"%' THEN 'percentage'
          WHEN calculation_config LIKE '%"calculationType":"weighted_sum"%' THEN 'weighted_sum'
          WHEN calculation_config LIKE '%"calculationType":"boolean_logic"%' THEN 'boolean_logic'
          WHEN calculation_config LIKE '%"calculationType":"formula"%' THEN 'formula'
          WHEN calculation_config LIKE '%"calculationType":"system_status"%' THEN 'system_status'
          ELSE 'manual'
        END as calculation_type,
        COUNT(*) as count 
       FROM parameter_definitions 
       WHERE is_active = 1 
       GROUP BY calculation_type`
    );
    
    const byType: Record<string, number> = {};
    typeResult.forEach(row => {
      byType[row.data_type] = row.count;
    });
    
    const byCalculationType: Record<string, number> = {};
    calcTypeResult.forEach(row => {
      byCalculationType[row.calculation_type] = row.count;
    });
    
    return {
      total: totalResult?.count || 0,
      byType,
      byCalculationType,
      active: activeResult?.count || 0,
      inactive: (totalResult?.count || 0) - (activeResult?.count || 0)
    };
  }

  /**
   * Map database row to ParameterDefinition
   */
  private static mapRowToParameter(row: any): ParameterDefinitionType {
    let calculationConfig: CalculationConfig | undefined;
    if (row.calculation_config) {
      try {
        calculationConfig = JSON.parse(row.calculation_config);
      } catch (error) {
        console.error('Error parsing calculation config:', error);
        calculationConfig = {
          calculationType: 'manual',
          autoCalculate: false,
          allowManualOverride: false,
          showCalculation: false
        };
      }
    } else {
      calculationConfig = {
        calculationType: 'manual',
        autoCalculate: false,
        allowManualOverride: false,
        showCalculation: false
      };
    }

    return {
      id: row.id,
      code: row.code,
      label: row.name,
      description: row.description,
      type: (row.data_type as any) || 'text',
      required: row.required === 1,
      defaultValue: row.default_value ? JSON.parse(row.default_value) : undefined,
      options: row.options ? JSON.parse(row.options) : [],
      validation: row.validation_rules ? JSON.parse(row.validation_rules) : {},
      uiSettings: {
        component: row.ui_component || undefined,
        ...(row.ui_settings ? JSON.parse(row.ui_settings) : {})
      },
      calculationConfig,
      scoringRuleIds: row.scoring_rule_ids ? JSON.parse(row.scoring_rule_ids) : [],
      dependencies: row.dependencies ? JSON.parse(row.dependencies) : [],
      displayOrder: row.display_order || 0,
      isActive: row.is_active === 1,
      weight: row.weight || undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : {}
    };
  }
}