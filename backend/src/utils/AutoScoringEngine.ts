// backend/src/utils/AutoScoringEngine.ts
import type {
  ParameterDefinition,
  CalculationConfig,
  CalculationDetails,
  PercentageConfig,
  WeightedSumConfig,
  BooleanLogicConfig,
  FormulaConfig,
  SystemStatusConfig,
  ScoringRule,
  CalculationResult,
  ScoringResult,
  IndicatorDefinition
} from '../types/config';

export class AutoScoringEngine {
  /**
   * Calculate value for a parameter based on form data and calculation config
   */
  static calculateParameter(
    parameter: ParameterDefinition,
    formValues: Record<string, any>
  ): CalculationResult {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    const rawData: Record<string, any> = {};

    // If no calculation config or manual type, return raw value
    if (!parameter.calculationConfig || parameter.calculationConfig.calculationType === 'manual') {
      return {
        parameterCode: parameter.code,
        rawValue: formValues[parameter.code],
        calculatedValue: formValues[parameter.code],
        calculationType: 'manual',
        isValid: true,
        errors: [],
        warnings: [],
        timestamp: new Date().toISOString()
      };
    }

    const { calculationType, calculationDetails } = parameter.calculationConfig;
    let calculatedValue: any = formValues[parameter.code];

    try {
      switch (calculationType) {
        case 'percentage':
          calculatedValue = this.calculatePercentage(calculationDetails, formValues, errors, warnings, rawData);
          break;
          
        case 'weighted_sum':
          calculatedValue = this.calculateWeightedSum(calculationDetails, formValues, errors, warnings, rawData);
          break;
          
        case 'boolean_logic':
          calculatedValue = this.calculateBooleanLogic(calculationDetails, formValues, errors, warnings, rawData);
          break;
          
        case 'formula':
          calculatedValue = this.calculateFormula(calculationDetails, formValues, errors, warnings, rawData);
          break;
          
        case 'system_status':
          calculatedValue = this.calculateSystemStatus(calculationDetails, formValues, errors, warnings, rawData);
          break;
          
        case 'auto':
        case 'mixed':
          // Try to auto-detect calculation type
          calculatedValue = this.autoDetectCalculation(calculationDetails, formValues, errors, warnings, rawData);
          break;
          
        default:
          errors.push(`Unsupported calculation type: ${calculationType}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Calculation error: ${errorMessage}`);
      console.error('AutoScoringEngine calculation error:', error);
    }

    const calculationTime = Date.now() - startTime;

    return {
      parameterCode: parameter.code,
      rawValue: formValues[parameter.code],
      calculatedValue,
      rawData: Object.keys(rawData).length > 0 ? rawData : undefined,
      calculationType,
      calculationDetails,
      isValid: errors.length === 0,
      errors,
      warnings,
      timestamp: new Date().toISOString(),
      metadata: {
        calculationTimeMs: calculationTime,
        engineVersion: '1.0.0'
      }
    };
  }

  /**
   * Calculate percentage from numerator/denominator
   */
  private static calculatePercentage(
    calculationDetails: CalculationDetails | undefined,
    formValues: Record<string, any>,
    errors: string[],
    warnings: string[],
    rawData: Record<string, any>
  ): number {
    const config = calculationDetails?.percentageConfig as PercentageConfig;
    if (!config) {
      errors.push('Percentage calculation requires configuration');
      return 0;
    }

    const numerator = this.parseNumber(formValues[config.numeratorField], config.numeratorLabel);
    const denominator = this.parseNumber(formValues[config.denominatorField], config.denominatorLabel);
    
    rawData[config.numeratorField] = numerator;
    rawData[config.denominatorField] = denominator;

    // Validation
    if (denominator === 0) {
      errors.push(`Denominator (${config.denominatorLabel}) cannot be zero`);
      return 0;
    }

    if (numerator < 0) {
      errors.push(`Numerator (${config.numeratorLabel}) cannot be negative`);
    }

    if (denominator < 0) {
      errors.push(`Denominator (${config.denominatorLabel}) cannot be negative`);
    }

    if (numerator > denominator) {
      warnings.push(`Numerator (${numerator}) is greater than denominator (${denominator})`);
    }

    const percentage = (numerator / denominator) * 100;
    const precision = config.precision || 2;
    return this.roundNumber(percentage, precision);
  }

  /**
   * Calculate weighted sum
   */
  private static calculateWeightedSum(
    calculationDetails: CalculationDetails | undefined,
    formValues: Record<string, any>,
    errors: string[],
    warnings: string[],
    rawData: Record<string, any>
  ): number {
    const config = calculationDetails?.weightedSumConfig as WeightedSumConfig;
    if (!config) {
      errors.push('Weighted sum calculation requires configuration');
      return 0;
    }

    let totalWeighted = 0;
    
    config.caseTypes.forEach(caseType => {
      const value = this.parseNumber(formValues[caseType.field], caseType.label);
      rawData[caseType.field] = value;
      
      if (value < 0) {
        warnings.push(`${caseType.label} cannot be negative, using 0`);
      } else {
        totalWeighted += Math.max(0, value) * caseType.weight;
      }
      
      if (caseType.maxCases !== undefined && value > caseType.maxCases) {
        warnings.push(`${caseType.label} (${value}) exceeds maximum allowed (${caseType.maxCases})`);
      }
    });

    if (config.maxTotalWeight !== undefined && totalWeighted > config.maxTotalWeight) {
      warnings.push(`Total weighted sum (${totalWeighted}) exceeds maximum (${config.maxTotalWeight})`);
    }

    return totalWeighted;
  }

  /**
   * Calculate boolean logic
   */
  private static calculateBooleanLogic(
    calculationDetails: CalculationDetails | undefined,
    formValues: Record<string, any>,
    errors: string[],
    warnings: string[],
    rawData: Record<string, any>
  ): any {
    const config = calculationDetails?.booleanConfig as BooleanLogicConfig;
    if (!config) {
      errors.push('Boolean logic calculation requires configuration');
      return false;
    }

    const values = config.fields.map(field => {
      const value = formValues[field];
      rawData[field] = value;
      return Boolean(value);
    });

    let result = false;
    
    switch (config.logic) {
      case 'AND':
        result = values.every(v => v);
        break;
      case 'OR':
        result = values.some(v => v);
        break;
      case 'XOR':
        result = values.filter(v => v).length === 1;
        break;
      case 'NAND':
        result = !values.every(v => v);
        break;
      case 'NOR':
        result = !values.some(v => v);
        break;
      default:
        errors.push(`Unsupported boolean logic operator: ${config.logic}`);
    }

    return config.trueValue !== undefined && config.falseValue !== undefined
      ? (result ? config.trueValue : config.falseValue)
      : result;
  }

  /**
   * Calculate formula
   */
  private static calculateFormula(
    calculationDetails: CalculationDetails | undefined,
    formValues: Record<string, any>,
    errors: string[],
    warnings: string[],
    rawData: Record<string, any>
  ): number {
    const config = calculationDetails?.formulaConfig as FormulaConfig;
    if (!config) {
      errors.push('Formula calculation requires configuration');
      return 0;
    }

    try {
      // Extract and validate variables
      const variables: Record<string, number> = {};
      
      Object.entries(config.variables).forEach(([varName, varDef]) => {
        const value = this.parseNumber(formValues[varDef.field], varDef.label);
        variables[varName] = value;
        rawData[varDef.field] = value;
      });

      // Replace variables in formula
      let formula = config.formula;
      Object.entries(variables).forEach(([varName, value]) => {
        formula = formula.replace(new RegExp(`\\{${varName}\\}`, 'g'), value.toString());
      });

      // Safe evaluation with Math functions
      const safeFormula = this.sanitizeFormula(formula);
      const calculatedValue = this.evaluateFormula(safeFormula);

      // Apply validation if defined
      if (config.validation) {
        if (config.validation.minResult !== undefined && calculatedValue < config.validation.minResult) {
          warnings.push(`Formula result (${calculatedValue}) is below minimum (${config.validation.minResult})`);
        }
        if (config.validation.maxResult !== undefined && calculatedValue > config.validation.maxResult) {
          warnings.push(`Formula result (${calculatedValue}) exceeds maximum (${config.validation.maxResult})`);
        }
        if (config.validation.allowedRange && 
            (calculatedValue < config.validation.allowedRange[0] || calculatedValue > config.validation.allowedRange[1])) {
          warnings.push(`Formula result (${calculatedValue}) is outside allowed range [${config.validation.allowedRange[0]}, ${config.validation.allowedRange[1]}]`);
        }
      }

      return calculatedValue;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Formula evaluation error: ${errorMessage}`);
      return 0;
    }
  }

  /**
   * Calculate system status score
   */
  private static calculateSystemStatus(
    calculationDetails: CalculationDetails | undefined,
    formValues: Record<string, any>,
    errors: string[],
    warnings: string[],
    rawData: Record<string, any>
  ): number {
    const config = calculationDetails?.systemStatusConfig as SystemStatusConfig;
    if (!config) {
      errors.push('System status calculation requires configuration');
      return 0;
    }

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

    return totalScore;
  }

  /**
   * Auto-detect calculation type based on configuration
   */
  private static autoDetectCalculation(
    calculationDetails: CalculationDetails | undefined,
    formValues: Record<string, any>,
    errors: string[],
    warnings: string[],
    rawData: Record<string, any>
  ): any {
    // Try percentage first
    if (calculationDetails?.percentageConfig) {
      return this.calculatePercentage(calculationDetails, formValues, errors, warnings, rawData);
    }
    
    // Try weighted sum
    if (calculationDetails?.weightedSumConfig) {
      return this.calculateWeightedSum(calculationDetails, formValues, errors, warnings, rawData);
    }
    
    errors.push('Could not auto-detect calculation type');
    return 0;
  }

  /**
   * Apply scoring rules to calculate final score
   */
  static calculateScore(
    calculationResult: CalculationResult,
    scoringRules: ScoringRule[]
  ): ScoringResult {
    let score = 0;
    const appliedRules: ScoringRule[] = [];
    const ruleEvaluationErrors: string[] = [];

    // Sort rules by priority (highest points first for tie-breaking)
    const sortedRules = [...scoringRules].sort((a, b) => b.points - a.points);

    for (const rule of sortedRules) {
      try {
        if (this.evaluateRule(rule, calculationResult.calculatedValue)) {
          score = rule.points;
          appliedRules.push(rule);
          break; // First matching rule wins
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        ruleEvaluationErrors.push(`Rule ${rule.id || 'unknown'} evaluation error: ${errorMessage}`);
      }
    }

    const maxScore = Math.max(...scoringRules.map(r => r.points), 0);

    return {
      indicatorId: '', // Will be set by caller
      parameterCode: calculationResult.parameterCode,
      score,
      maxScore,
      calculationResult,
      appliedScoringRules: appliedRules,
      isOverridden: false,
      evaluationErrors: ruleEvaluationErrors.length > 0 ? ruleEvaluationErrors : undefined,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Evaluate a single scoring rule
   */
  private static evaluateRule(rule: ScoringRule, value: any): boolean {
    // Try formula first
    if (rule.formula) {
      try {
        const sanitizedFormula = this.sanitizeFormula(rule.formula.replace('{value}', value.toString()));
        return Boolean(this.evaluateFormula(sanitizedFormula));
      } catch (error: unknown) {
        console.warn('Formula evaluation failed, falling back to simple evaluation:', error);
      }
    }

    // Simple condition evaluation
    if (rule.condition) {
      return this.evaluateCondition(rule.condition, value);
    }

    // Range evaluation
    if (rule.minValue !== undefined && rule.maxValue !== undefined) {
      return value >= rule.minValue && value <= rule.maxValue;
    }
    if (rule.minValue !== undefined) {
      return value >= rule.minValue;
    }
    if (rule.maxValue !== undefined) {
      return value <= rule.maxValue;
    }

    return false;
  }

  /**
   * Evaluate condition string
   */
  private static evaluateCondition(condition: string, value: any): boolean {
    const conditions = condition.split('&&').map(c => c.trim());
    
    return conditions.every(cond => {
      if (cond.includes('>=')) {
        const [_, threshold] = cond.split('>=');
        return value >= parseFloat(threshold.trim());
      }
      if (cond.includes('<=')) {
        const [_, threshold] = cond.split('<=');
        return value <= parseFloat(threshold.trim());
      }
      if (cond.includes('>')) {
        const [_, threshold] = cond.split('>');
        return value > parseFloat(threshold.trim());
      }
      if (cond.includes('<')) {
        const [_, threshold] = cond.split('<');
        return value < parseFloat(threshold.trim());
      }
      if (cond.includes('==')) {
        const [_, threshold] = cond.split('==');
        const thresholdValue = threshold.trim();
        // Handle both numeric and string comparison
        return isNaN(Number(thresholdValue)) 
          ? value.toString() === thresholdValue
          : parseFloat(value) === parseFloat(thresholdValue);
      }
      if (cond.includes('!=')) {
        const [_, threshold] = cond.split('!=');
        const thresholdValue = threshold.trim();
        return isNaN(Number(thresholdValue))
          ? value.toString() !== thresholdValue
          : parseFloat(value) !== parseFloat(thresholdValue);
      }
      
      return false;
    });
  }

  /**
   * Calculate complete AIMS assessment score
   */
  static calculateAIMSAssessment(
    indicators: IndicatorDefinition[],
    formValues: Record<string, any>
  ): {
    totalScore: number;
    indicatorScores: Record<string, ScoringResult>;
    integrityLevel: string;
    integrityLabel: string;
    calculationResults: Record<string, CalculationResult>;
  } {
    const indicatorScores: Record<string, ScoringResult> = {};
    const calculationResults: Record<string, CalculationResult> = {};
    let totalScore = 0;

    // Calculate scores for each indicator
    indicators.forEach(indicator => {
      let indicatorScore = 0;
      const indicatorCalculationResults: CalculationResult[] = [];

      // Calculate each parameter in the indicator
      indicator.parameters?.forEach(param => {
        const calcResult = this.calculateParameter(param, formValues);
        calculationResults[param.code] = calcResult;
        indicatorCalculationResults.push(calcResult);

        // Apply scoring rules if available
        if (indicator.scoringRules && indicator.scoringRules.length > 0) {
          const scoreResult = this.calculateScore(calcResult, indicator.scoringRules);
          indicatorScore += scoreResult.score;
        }
      });

      // Store indicator score
      indicatorScores[indicator.code] = {
        indicatorId: indicator.id,
        parameterCode: indicator.code,
        score: indicatorScore,
        maxScore: indicator.maxScore,
        calculationResult: {
          parameterCode: indicator.code,
          rawValue: indicatorScore,
          calculatedValue: indicatorScore,
          calculationType: 'composite',
          isValid: true,
          errors: [],
          warnings: [],
          timestamp: new Date().toISOString()
        },
        appliedScoringRules: [],
        isOverridden: false,
        timestamp: new Date().toISOString()
      };

      totalScore += indicatorScore;
    });

    // Determine integrity level
    const integrity = this.determineIntegrityLevel(totalScore);

    return {
      totalScore,
      indicatorScores,
      integrityLevel: integrity.level,
      integrityLabel: integrity.label,
      calculationResults
    };
  }

  /**
   * Determine integrity level based on AIMS guidelines
   */
  static determineIntegrityLevel(score: number): { level: string; label: string } {
    if (score >= 80) {
      return { level: 'high', label: 'Strong Integrity Culture' };
    } else if (score >= 50) {
      return { level: 'medium', label: 'Moderate Integrity Culture' };
    } else {
      return { level: 'low', label: 'Needs Improvement in Integrity Systems' };
    }
  }

  /**
   * Get AIMS-specific scoring rules for common indicators
   */
  static getAIMSScoringRules(parameterCode: string): ScoringRule[] {
    switch (parameterCode) {
      case 'integrity_capacity_percentage':
        return [
          {
            id: 'aims_ic_1',
            parameterCode: 'integrity_capacity_percentage',
            condition: '>= 85',
            points: 26,
            description: '≥85% e-Learning completion'
          },
          {
            id: 'aims_ic_2',
            parameterCode: 'integrity_capacity_percentage',
            condition: '>= 70 && < 85',
            points: 18,
            description: '70-84% e-Learning completion'
          },
          {
            id: 'aims_ic_3',
            parameterCode: 'integrity_capacity_percentage',
            condition: '>= 50 && < 70',
            points: 10,
            description: '50-69% e-Learning completion'
          },
          {
            id: 'aims_ic_4',
            parameterCode: 'integrity_capacity_percentage',
            condition: '< 50',
            points: 0,
            description: '<50% e-Learning completion'
          }
        ];
      
      case 'asset_declaration_percentage':
        return [
          {
            id: 'aims_ad_1',
            parameterCode: 'asset_declaration_percentage',
            condition: '== 100',
            points: 16,
            description: '100% on-time submission'
          },
          {
            id: 'aims_ad_2',
            parameterCode: 'asset_declaration_percentage',
            condition: '>= 95 && < 100',
            points: 10,
            description: '95-99% on-time submission'
          },
          {
            id: 'aims_ad_3',
            parameterCode: 'asset_declaration_percentage',
            condition: '>= 90 && < 95',
            points: 5,
            description: '90-94% on-time submission'
          },
          {
            id: 'aims_ad_4',
            parameterCode: 'asset_declaration_percentage',
            condition: '< 90',
            points: 0,
            description: '<90% on-time submission'
          }
        ];
      
      case 'atr_responsiveness_percentage':
        return [
          {
            id: 'aims_atr_1',
            parameterCode: 'atr_responsiveness_percentage',
            condition: '>= 90',
            points: 10,
            description: '≥90% timely ATR submission'
          },
          {
            id: 'aims_atr_2',
            parameterCode: 'atr_responsiveness_percentage',
            condition: '>= 70 && < 90',
            points: 7,
            description: '70-89% timely ATR submission'
          },
          {
            id: 'aims_atr_3',
            parameterCode: 'atr_responsiveness_percentage',
            condition: '< 70',
            points: 3,
            description: '<70% timely ATR submission'
          }
        ];
      
      case 'corruption_case_severity':
        return [
          {
            id: 'aims_case_1',
            parameterCode: 'corruption_case_severity',
            condition: '== 0',
            points: 20,
            description: 'No corruption cases'
          },
          {
            id: 'aims_case_2',
            parameterCode: 'corruption_case_severity',
            condition: '>= 1 && <= 2',
            points: 10,
            description: '1-2 weighted cases'
          },
          {
            id: 'aims_case_3',
            parameterCode: 'corruption_case_severity',
            condition: '>= 3 && <= 4',
            points: 5,
            description: '3-4 weighted cases'
          },
          {
            id: 'aims_case_4',
            parameterCode: 'corruption_case_severity',
            condition: '>= 5',
            points: 0,
            description: '5+ weighted cases'
          }
        ];
      
      default:
        return [];
    }
  }

  /**
   * Helper method to parse number safely
   */
  private static parseNumber(value: any, label: string = 'value'): number {
    if (value === undefined || value === null || value === '') {
      return 0;
    }
    
    const num = Number(value);
    if (isNaN(num)) {
      throw new Error(`${label} is not a valid number: ${value}`);
    }
    
    return num;
  }

  /**
   * Helper method to round number
   */
  private static roundNumber(value: number, precision: number): number {
    const factor = Math.pow(10, precision);
    return Math.round(value * factor) / factor;
  }

  /**
   * Sanitize formula for safe evaluation
   */
  private static sanitizeFormula(formula: string): string {
    // Remove any dangerous constructs
    return formula
      .replace(/eval\(/gi, '')
      .replace(/Function\(/gi, '')
      .replace(/setTimeout\(/gi, '')
      .replace(/setInterval\(/gi, '')
      .replace(/document\./gi, '')
      .replace(/window\./gi, '')
      .replace(/process\./gi, '')
      .replace(/require\(/gi, '')
      .replace(/import\(/gi, '');
  }

  /**
   * Safely evaluate formula
   */
  private static evaluateFormula(formula: string): number {
    // Use Function constructor in strict mode for safe evaluation
    try {
      const result = new Function(`"use strict"; return (${formula})`)();
      if (typeof result !== 'number' || isNaN(result)) {
        throw new Error('Formula must evaluate to a number');
      }
      return result;
    } catch (error: unknown) {
      // Type guard to safely access error message
      if (error instanceof Error) {
        throw new Error(`Formula evaluation failed: ${error.message}`);
      } else {
        throw new Error('Formula evaluation failed with unknown error');
      }
    }
  }

  /**
   * Validate calculation configuration
   */
  static validateCalculationConfig(config: CalculationConfig): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config.calculationType) {
      errors.push('Calculation type is required');
    }

    switch (config.calculationType) {
      case 'percentage':
        if (!config.calculationDetails?.percentageConfig) {
          errors.push('Percentage calculation requires configuration');
        } else {
          const pc = config.calculationDetails.percentageConfig;
          if (!pc.numeratorField || !pc.denominatorField) {
            errors.push('Percentage calculation requires numerator and denominator fields');
          }
          if (pc.precision !== undefined && (pc.precision < 0 || pc.precision > 10)) {
            warnings.push('Precision should be between 0 and 10');
          }
        }
        break;

      case 'weighted_sum':
        if (!config.calculationDetails?.weightedSumConfig) {
          errors.push('Weighted sum calculation requires configuration');
        } else {
          const ws = config.calculationDetails.weightedSumConfig;
          if (!ws.caseTypes || ws.caseTypes.length === 0) {
            errors.push('Weighted sum requires at least one case type');
          }
        }
        break;

      case 'formula':
        if (!config.calculationDetails?.formulaConfig) {
          errors.push('Formula calculation requires configuration');
        } else {
          const fc = config.calculationDetails.formulaConfig;
          if (!fc.formula) {
            errors.push('Formula is required');
          }
          if (!fc.variables || Object.keys(fc.variables).length === 0) {
            warnings.push('Formula has no variables defined');
          }
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}