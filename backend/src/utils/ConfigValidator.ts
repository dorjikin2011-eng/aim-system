//backend/src/utils/ConfigValidator.ts
import { IndicatorConfig } from '../models/IndicatorConfig';
import { 
  IndicatorDefinition, 
  ParameterDefinition, 
  ScoringRule,
  IndicatorCategory,
  ParameterType,
  ValidationRule
} from '../types/config';

export class ConfigValidator {
  
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

    if (!indicator.code?.trim()) {
      errors.push('Indicator code is required');
    } else if (!/^[a-z][a-z0-9_]*$/.test(indicator.code)) {
      errors.push('Indicator code must be lowercase with underscores (e.g., iccs_framework)');
    }

    if (!indicator.category) {
      errors.push('Category is required');
    } else if (!this.isValidCategory(indicator.category)) {
      errors.push(`Invalid category: ${indicator.category}`);
    }

    if (indicator.weight !== undefined) {
      if (typeof indicator.weight !== 'number') {
        errors.push('Weight must be a number');
      } else if (indicator.weight < 0 || indicator.weight > 100) {
        errors.push('Weight must be between 0 and 100');
      }
    }

    if (indicator.scoringMethod && !['sum', 'average', 'weighted', 'formula', 'conditional'].includes(indicator.scoringMethod)) {
      errors.push('Invalid scoring method');
    }

    // Validate parameters if present
    if (indicator.parameters && Array.isArray(indicator.parameters)) {
      indicator.parameters.forEach((param: ParameterDefinition, index: number) => {
        if (!param.code?.trim()) {
          errors.push(`Parameter ${index + 1}: Code is required`);
        }
        if (!param.label?.trim()) {
          errors.push(`Parameter ${index + 1}: Label is required`);
        }
        if (!param.type) {
          errors.push(`Parameter ${index + 1}: Type is required`);
        } else if (!this.isValidParameterType(param.type)) {
          errors.push(`Parameter ${index + 1}: Invalid type "${param.type}"`);
        }
        
        // Type-specific validation
        if (param.type === 'select' && (!param.options || param.options.length === 0)) {
          errors.push(`Parameter ${index + 1}: Select type requires options`);
        }
        
        if (param.type === 'number') {
          if (param.validation?.min !== undefined && param.validation?.max !== undefined && 
              param.validation.min > param.validation.max) {
            errors.push(`Parameter ${index + 1}: Min value cannot be greater than max value`);
          }
        }
        
        if (param.required && !param.label) {
          warnings.push(`Parameter ${index + 1}: Required parameters should have clear labels`);
        }
      });
    }

    // Validate scoring rules if present
    if (indicator.scoringRules && Array.isArray(indicator.scoringRules)) {
      indicator.scoringRules.forEach((rule: ScoringRule, index: number) => {
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

    // Check code uniqueness (only for new indicators or when code is being changed)
    if (indicator.code && !indicator.id) {
      try {
        const existing = await IndicatorConfig.getByCode(indicator.code);
        if (existing) {
          errors.push(`Indicator code "${indicator.code}" already exists`);
        }
      } catch (error) {
        // If we can't check uniqueness, add a warning
        warnings.push('Could not verify code uniqueness');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate form template configuration
   */
  static validateTemplate(template: any): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!template.name || template.name.trim().length < 2) {
      errors.push('Template name must be at least 2 characters long');
    }

    if (!template.sections || !Array.isArray(template.sections) || template.sections.length === 0) {
      errors.push('Template must have at least one section');
    } else {
      template.sections.forEach((section: any, sIndex: number) => {
        if (!section.title) {
          errors.push(`Section ${sIndex + 1}: Title is required`);
        }
        
        if (section.fields && Array.isArray(section.fields)) {
          section.fields.forEach((field: any, fIndex: number) => {
            if (!field.indicatorId) {
              errors.push(`Section ${sIndex + 1}, Field ${fIndex + 1}: Indicator ID is required`);
            }
            if (!field.parameterCode) {
              errors.push(`Section ${sIndex + 1}, Field ${fIndex + 1}: Parameter code is required`);
            }
            if (!field.label) {
              errors.push(`Section ${sIndex + 1}, Field ${fIndex + 1}: Label is required`);
            }
          });
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
   * Validate that total weights sum to 100
   */
  static validateTotalWeights(indicators: IndicatorDefinition[]): { 
    isValid: boolean; 
    total: number; 
    error?: string;
    warnings?: string[];
  } {
    const total = indicators.reduce((sum, indicator) => sum + (indicator.weight || 0), 0);
    
    const warnings: string[] = [];
    
    if (Math.abs(total - 100) > 0.01) {
      return {
        isValid: false,
        total,
        error: `Total weights must sum to 100% (currently ${total.toFixed(2)}%)`,
        warnings
      };
    }

    // Check for indicators with zero weight
    const zeroWeightIndicators = indicators.filter(ind => ind.weight === 0);
    if (zeroWeightIndicators.length > 0) {
      warnings.push(`${zeroWeightIndicators.length} indicators have zero weight and won't affect scoring`);
    }

    // Check for indicators with very low weight
    const lowWeightIndicators = indicators.filter(ind => ind.weight > 0 && ind.weight < 5);
    if (lowWeightIndicators.length > 0) {
      warnings.push(`${lowWeightIndicators.length} indicators have very low weight (< 5%)`);
    }

    return {
      isValid: true,
      total,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Validate scoring rule condition syntax
   */
  static validateScoringCondition(condition: string, parameterType: string): { 
    isValid: boolean; 
    error?: string;
  } {
    try {
      if (!condition.trim()) {
        return { isValid: false, error: 'Condition cannot be empty' };
      }
      
      const operators = ['==', '!=', '<', '>', '<=', '>=', 'in', 'not in', 'contains', 'between'];
      let hasValidOperator = false;
      
      for (const operator of operators) {
        if (condition.includes(operator)) {
          const parts = condition.split(operator).map(p => p.trim());
          if (parts.length === 2 && parts[0] && parts[1]) {
            hasValidOperator = true;
            break;
          }
        }
      }
      
      if (!hasValidOperator && !/^[a-zA-Z0-9_]+$/.test(condition.trim())) {
        return { 
          isValid: false, 
          error: 'Invalid condition syntax. Use: field operator value (e.g., "score > 80")' 
        };
      }
      
      return { isValid: true };
    } catch (error) {
      return { 
        isValid: false, 
        error: 'Invalid condition syntax' 
      };
    }
  }

  /**
   * Validate parameter value based on configuration
   */
  static validateParameterValue(paramConfig: ParameterDefinition, value: any): { 
    isValid: boolean; 
    error?: string;
  } {
    // Handle null/undefined values
    if (value === null || value === undefined || value === '') {
      if (paramConfig.required) {
        return {
          isValid: false,
          error: `${paramConfig.label} is required`
        };
      }
      return { isValid: true };
    }

    // Type-specific validation
    switch (paramConfig.type) {
      case 'number':
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          return {
            isValid: false,
            error: `${paramConfig.label} must be a number`
          };
        }
        if (paramConfig.validation?.min !== undefined && numValue < paramConfig.validation.min) {
          return {
            isValid: false,
            error: `${paramConfig.label} must be at least ${paramConfig.validation.min}`
          };
        }
        if (paramConfig.validation?.max !== undefined && numValue > paramConfig.validation.max) {
          return {
            isValid: false,
            error: `${paramConfig.label} must be at most ${paramConfig.validation.max}`
          };
        }
        break;

      case 'text':
      case 'textarea':
        if (typeof value !== 'string') {
          return {
            isValid: false,
            error: `${paramConfig.label} must be text`
          };
        }
        if (paramConfig.validation?.minLength && value.length < paramConfig.validation.minLength) {
          return {
            isValid: false,
            error: `${paramConfig.label} must be at least ${paramConfig.validation.minLength} characters`
          };
        }
        if (paramConfig.validation?.maxLength && value.length > paramConfig.validation.maxLength) {
          return {
            isValid: false,
            error: `${paramConfig.label} must be at most ${paramConfig.validation.maxLength} characters`
          };
        }
        break;

      case 'select':
      case 'radio':
        if (!paramConfig.options || !Array.isArray(paramConfig.options)) {
          return {
            isValid: false,
            error: `${paramConfig.label} has invalid options configuration`
          };
        }
        if (!paramConfig.options.some((opt: any) => opt.value === value)) {
          return {
            isValid: false,
            error: `${paramConfig.label} has invalid value. Valid options: ${paramConfig.options.map((opt: any) => opt.value).join(', ')}`
          };
        }
        break;

      case 'checkbox':
        if (typeof value !== 'boolean') {
          return {
            isValid: false,
            error: `${paramConfig.label} must be true or false`
          };
        }
        break;

      case 'date':
        if (isNaN(Date.parse(value))) {
          return {
            isValid: false,
            error: `${paramConfig.label} must be a valid date`
          };
        }
        break;

      case 'file':
        if (typeof value !== 'string') {
          return {
            isValid: false,
            error: `${paramConfig.label} must be a file path`
          };
        }
        break;
    }

    return { isValid: true };
  }

  /**
   * Validate form submission data against template
   */
  static validateFormSubmission(template: any, submissionData: any): { 
    isValid: boolean; 
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (!template || !template.sections) {
      errors.push('Invalid template structure');
      return { isValid: false, errors };
    }
    
    // Flatten all fields from all sections
    const allFields: any[] = [];
    template.sections.forEach((section: any) => {
      if (section.fields && Array.isArray(section.fields)) {
        allFields.push(...section.fields);
      }
    });
    
    // Validate each field
    allFields.forEach(field => {
      const value = submissionData[field.parameterCode];
      const paramConfig: ParameterDefinition = {
  code: field.parameterCode,
  label: field.label,
  type: field.type,
  required: field.required,
  displayOrder: field.displayOrder || 0,
  isActive: true,
  validation: field.uiSettings?.validation || {},
  uiSettings: field.uiSettings || {},  // <-- Comma here is important
  scoringRuleIds: [],                  // <-- New field
  dependencies: []                     // <-- New field
};
      
      const validation = this.validateParameterValue(paramConfig, value);
      
      if (!validation.isValid && validation.error) {
        errors.push(validation.error);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate integrity thresholds
   */
  static validateIntegrityThresholds(highMin: number, mediumMin: number): { 
    isValid: boolean; 
    error?: string;
  } {
    if (highMin <= mediumMin) {
      return {
        isValid: false,
        error: 'High integrity threshold must be greater than medium threshold'
      };
    }
    
    if (highMin > 100 || highMin < 0) {
      return {
        isValid: false,
        error: 'High integrity threshold must be between 0 and 100'
      };
    }
    
    if (mediumMin > 100 || mediumMin < 0) {
      return {
        isValid: false,
        error: 'Medium integrity threshold must be between 0 and 100'
      };
    }
    
    return { isValid: true };
  }

  /**
   * Check if category is valid
   */
  private static isValidCategory(category: string): boolean {
    const validCategories: IndicatorCategory[] = [
      'iccs_framework', 
      'integrity_training', 
      'asset_declaration', 
      'case_handling', 
      'atr_timeliness',
      'general',
      'custom'
    ];
    return validCategories.includes(category as IndicatorCategory);
  }

  /**
   * Check if parameter type is valid
   */
  private static isValidParameterType(type: string): boolean {
    const validTypes: ParameterType[] = ['text', 'number', 'select', 'checkbox', 'radio', 'date', 'file', 'textarea', 'range'];
    return validTypes.includes(type as ParameterType);
  }
}