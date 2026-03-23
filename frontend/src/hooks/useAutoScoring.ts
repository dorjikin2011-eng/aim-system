// frontend/src/hooks/useAutoScoring.ts
import { useState, useEffect, useCallback } from 'react';
import type { 
  ParameterDefinition, 
  PercentageConfig,
  WeightedSumConfig,
  BooleanLogicConfig,
  FormulaConfig,
  SystemStatusConfig,
  ScoringRule,
  CalculationResult,
  ScoringResult
} from '../types/config';

interface UseAutoScoringOptions {
  parameter: ParameterDefinition;
  formValues: Record<string, any>;
  onResultChange?: (result: CalculationResult) => void;
  onScoreChange?: (score: ScoringResult) => void;
  autoCalculate?: boolean;
}

export default function useAutoScoring({
  parameter,
  formValues,
  onResultChange,
  onScoreChange,
  autoCalculate = true
}: UseAutoScoringOptions) {
  const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null);
  const [scoringResult, setScoringResult] = useState<ScoringResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Calculate value based on calculation config
  const calculateValue = useCallback((): CalculationResult | null => {
    if (!parameter.calculationConfig || parameter.calculationConfig.calculationType === 'manual') {
      return null;
    }

    setIsCalculating(true);
    const errors: string[] = [];
    const warnings: string[] = [];
    const rawData: Record<string, any> = {};
    const { calculationType, calculationDetails } = parameter.calculationConfig;

    try {
      let calculatedValue: any = null;

      switch (calculationType) {
        case 'percentage':
          const percentageConfig = calculationDetails?.percentageConfig as PercentageConfig;
          if (percentageConfig) {
            const numerator = parseFloat(formValues[percentageConfig.numeratorField] || 0);
            const denominator = parseFloat(formValues[percentageConfig.denominatorField] || 0);
            
            rawData[percentageConfig.numeratorField] = numerator;
            rawData[percentageConfig.denominatorField] = denominator;
            
            // Validation
            if (denominator === 0) {
              errors.push(`Denominator (${percentageConfig.denominatorLabel}) cannot be zero`);
              calculatedValue = 0;
            } else if (numerator > denominator) {
              warnings.push(`Numerator (${numerator}) is greater than denominator (${denominator})`);
              const percentage = (numerator / denominator) * 100;
              calculatedValue = Math.round(percentage * 100) / 100;
            } else {
              const percentage = (numerator / denominator) * 100;
              calculatedValue = Math.round(percentage * 100) / 100;
            }
          }
          break;

        case 'weighted_sum':
          const weightedConfig = calculationDetails?.weightedSumConfig as WeightedSumConfig;
          if (weightedConfig) {
            let totalWeighted = 0;
            weightedConfig.caseTypes.forEach(caseType => {
              const value = parseFloat(formValues[caseType.field] || 0);
              rawData[caseType.field] = value;
              totalWeighted += value * caseType.weight;
              
              if (caseType.maxCases !== undefined && value > caseType.maxCases) {
                warnings.push(`${caseType.label} (${value}) exceeds maximum allowed (${caseType.maxCases})`);
              }
            });
            
            if (weightedConfig.maxTotalWeight !== undefined && totalWeighted > weightedConfig.maxTotalWeight) {
              warnings.push(`Total weighted sum (${totalWeighted}) exceeds maximum (${weightedConfig.maxTotalWeight})`);
            }
            
            calculatedValue = totalWeighted;
          }
          break;

        case 'boolean_logic':
          const booleanConfig = calculationDetails?.booleanConfig as BooleanLogicConfig;
          if (booleanConfig) {
            const values = booleanConfig.fields.map(field => Boolean(formValues[field]));
            booleanConfig.fields.forEach((field, idx) => {
              rawData[field] = values[idx];
            });
            
            let result = false;
            if (booleanConfig.logic === 'AND') {
              result = values.every(v => v);
            } else if (booleanConfig.logic === 'OR') {
              result = values.some(v => v);
            } else if (booleanConfig.logic === 'XOR') {
              result = values.filter(v => v).length === 1;
            } else if (booleanConfig.logic === 'NAND') {
              result = !values.every(v => v);
            } else if (booleanConfig.logic === 'NOR') {
              result = !values.some(v => v);
            }
            
            calculatedValue = result ? (booleanConfig.trueValue !== undefined ? booleanConfig.trueValue : true) : 
                                     (booleanConfig.falseValue !== undefined ? booleanConfig.falseValue : false);
          }
          break;

        case 'system_status':
          const systemConfig = calculationDetails?.systemStatusConfig as SystemStatusConfig;
          if (systemConfig) {
            let totalScore = 0;
            systemConfig.systems.forEach(system => {
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
            calculatedValue = totalScore;
          }
          break;

        case 'formula':
          const formulaConfig = calculationDetails?.formulaConfig as FormulaConfig;
          if (formulaConfig) {
            try {
              const variables: Record<string, number> = {};
              Object.entries(formulaConfig.variables).forEach(([varName, varDef]) => {
                const value = parseFloat(formValues[varDef.field] || varDef.defaultValue || 0);
                variables[varName] = value;
                rawData[varDef.field] = value;
              });

              // Replace variables in formula
              let formula = formulaConfig.formula;
              Object.entries(variables).forEach(([varName, value]) => {
                formula = formula.replace(new RegExp(`\\{${varName}\\}`, 'g'), value.toString());
              });

              // Safe evaluation
              calculatedValue = Function(`"use strict"; return (${formula})`)();
              
              // Apply validation if defined
              if (formulaConfig.validation) {
                if (formulaConfig.validation.minResult !== undefined && calculatedValue < formulaConfig.validation.minResult) {
                  warnings.push(`Formula result (${calculatedValue}) is below minimum (${formulaConfig.validation.minResult})`);
                }
                if (formulaConfig.validation.maxResult !== undefined && calculatedValue > formulaConfig.validation.maxResult) {
                  warnings.push(`Formula result (${calculatedValue}) exceeds maximum (${formulaConfig.validation.maxResult})`);
                }
              }
            } catch (error: any) {
              errors.push(`Formula calculation error: ${error.message}`);
              calculatedValue = null;
            }
          }
          break;

        default:
          // For auto/mixed types, try to determine calculation
          if (calculationDetails?.percentageConfig) {
            // Handle as percentage
            const percentageConfig = calculationDetails.percentageConfig as PercentageConfig;
            const numerator = parseFloat(formValues[percentageConfig.numeratorField] || 0);
            const denominator = parseFloat(formValues[percentageConfig.denominatorField] || 0);
            
            rawData[percentageConfig.numeratorField] = numerator;
            rawData[percentageConfig.denominatorField] = denominator;
            
            if (denominator === 0) {
              errors.push(`Denominator (${percentageConfig.denominatorLabel}) cannot be zero`);
              calculatedValue = 0;
            } else {
              const percentage = (numerator / denominator) * 100;
              calculatedValue = Math.round(percentage * 100) / 100;
            }
          }
          break;
      }

      const result: CalculationResult = {
        parameterCode: parameter.code,
        rawValue: formValues[parameter.code],
        calculatedValue: calculatedValue !== null ? calculatedValue : formValues[parameter.code],
        rawData: Object.keys(rawData).length > 0 ? rawData : undefined,
        calculationType,
        calculationDetails,
        isValid: errors.length === 0,
        errors,
        warnings,
        timestamp: new Date().toISOString()
      };

      return result;

    } catch (error: any) {
      console.error('Calculation error:', error);
      const errorResult: CalculationResult = {
        parameterCode: parameter.code,
        rawValue: formValues[parameter.code],
        calculatedValue: formValues[parameter.code],
        calculationType,
        calculationDetails,
        isValid: false,
        errors: [`Calculation error: ${error.message}`],
        warnings: [],
        timestamp: new Date().toISOString()
      };
      return errorResult;
    } finally {
      setIsCalculating(false);
    }
  }, [parameter, formValues]);

  // Calculate score based on scoring rules
  const calculateScore = useCallback((calcResult: CalculationResult, scoringRules: ScoringRule[]): ScoringResult => {
    let score = 0;
    const appliedRules: ScoringRule[] = [];

    // Apply scoring rules
    scoringRules.forEach(rule => {
      try {
        // Basic condition evaluation (can be extended for complex conditions)
        const value = calcResult.calculatedValue;
        
        // Check if rule applies
        let applies = false;
        
        if (rule.condition.includes('>=')) {
          const [_, threshold] = rule.condition.split('>=');
          applies = value >= parseFloat(threshold.trim());
        } else if (rule.condition.includes('<=')) {
          const [_, threshold] = rule.condition.split('<=');
          applies = value <= parseFloat(threshold.trim());
        } else if (rule.condition.includes('>')) {
          const [_, threshold] = rule.condition.split('>');
          applies = value > parseFloat(threshold.trim());
        } else if (rule.condition.includes('<')) {
          const [_, threshold] = rule.condition.split('<');
          applies = value < parseFloat(threshold.trim());
        } else if (rule.condition.includes('===') || rule.condition.includes('==')) {
          const [_, threshold] = rule.condition.split(/===|==/);
          applies = value === parseFloat(threshold.trim());
        } else if (rule.minValue !== undefined && rule.maxValue !== undefined) {
          applies = value >= rule.minValue && value <= rule.maxValue;
        } else if (rule.minValue !== undefined) {
          applies = value >= rule.minValue;
        } else if (rule.maxValue !== undefined) {
          applies = value <= rule.maxValue;
        }
        
        if (applies) {
          score = rule.points;
          appliedRules.push(rule);
        }
      } catch (error) {
        console.error('Error evaluating scoring rule:', error);
      }
    });

    const result: ScoringResult = {
      indicatorId: parameter.id || '',
      parameterCode: parameter.code,
      score,
      maxScore: Math.max(...scoringRules.map(r => r.points), 0),
      calculationResult: calcResult,
      appliedScoringRules: appliedRules,
      isOverridden: false
    };

    return result;
  }, [parameter]);

  // AIMS specific scoring helper for percentage-based indicators
  const getAIMSScoringRules = (parameterCode: string): ScoringRule[] => {
    // Default AIMS scoring rules based on the guideline
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
            condition: '>= 70',
            points: 18,
            description: '70-84% e-Learning completion'
          },
          { 
            id: 'aims_ic_3',
            parameterCode: 'integrity_capacity_percentage',
            condition: '>= 50',
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
            condition: '>= 100',
            points: 16,
            description: '100% on-time submission'
          },
          { 
            id: 'aims_ad_2',
            parameterCode: 'asset_declaration_percentage',
            condition: '>= 95',
            points: 10,
            description: '95-99% on-time submission'
          },
          { 
            id: 'aims_ad_3',
            parameterCode: 'asset_declaration_percentage',
            condition: '>= 90',
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
            condition: '>= 70',
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
      
      default:
        return [];
    }
  };

  // Perform calculation and scoring
  const performCalculation = useCallback(() => {
    if (!autoCalculate || !parameter.calculationConfig) {
      return;
    }

    const calcResult = calculateValue();
    if (!calcResult) return;

    setCalculationResult(calcResult);
    setErrors(calcResult.errors);
    setWarnings(calcResult.warnings);

    // Call result callback
    if (onResultChange) {
      onResultChange(calcResult);
    }

    // Calculate score if scoring rules are available
    const scoringRules = parameter.scoringRuleIds?.length > 0 
      ? [] // In real implementation, fetch scoring rules by IDs
      : getAIMSScoringRules(parameter.code);

    if (scoringRules.length > 0) {
      const scoreResult = calculateScore(calcResult, scoringRules);
      setScoringResult(scoreResult);

      // Call score callback
      if (onScoreChange) {
        onScoreChange(scoreResult);
      }
    }
  }, [autoCalculate, parameter, calculateValue, calculateScore, onResultChange, onScoreChange]);

  // Auto-calculate when form values change
  useEffect(() => {
    if (autoCalculate && parameter.calculationConfig?.autoCalculate !== false) {
      performCalculation();
    }
  }, [formValues, autoCalculate, performCalculation]);

  // Manual calculation trigger
  const calculate = useCallback(() => {
    performCalculation();
  }, [performCalculation]);

  // Override calculated score with manual score
  const overrideScore = useCallback((manualScore: number, reason?: string) => {
    if (!scoringResult) return;

    const overriddenResult: ScoringResult = {
      ...scoringResult,
      score: manualScore,
      isOverridden: true,
      overrideReason: reason
    };

    setScoringResult(overriddenResult);
    
    if (onScoreChange) {
      onScoreChange(overriddenResult);
    }
  }, [scoringResult, onScoreChange]);

  // Reset override
  const resetOverride = useCallback(() => {
    if (!scoringResult || !calculationResult) return;

    const scoringRules = parameter.scoringRuleIds?.length > 0 
      ? [] // In real implementation, fetch scoring rules by IDs
      : getAIMSScoringRules(parameter.code);

    if (scoringRules.length > 0) {
      const scoreResult = calculateScore(calculationResult, scoringRules);
      setScoringResult(scoreResult);
      
      if (onScoreChange) {
        onScoreChange(scoreResult);
      }
    }
  }, [scoringResult, calculationResult, parameter, calculateScore, onScoreChange]);

  return {
    // State
    calculationResult,
    scoringResult,
    isCalculating,
    errors,
    warnings,
    
    // Actions
    calculate,
    overrideScore,
    resetOverride,
    
    // Derived values
    calculatedValue: calculationResult?.calculatedValue,
    rawValue: calculationResult?.rawValue,
    rawData: calculationResult?.rawData,
    score: scoringResult?.score,
    maxScore: scoringResult?.maxScore,
    appliedRules: scoringResult?.appliedScoringRules,
    isOverridden: scoringResult?.isOverridden,
    
    // Helpers
    getAIMSScoringRules: () => getAIMSScoringRules(parameter.code)
  };
}

// Helper function for common AIMS percentage calculations
export function calculateAIMSPercentage(
  numerator: number,
  denominator: number,
  precision: number = 2
): { percentage: number; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (denominator === 0) {
    errors.push('Denominator cannot be zero');
    return { percentage: 0, errors, warnings };
  }

  if (numerator < 0 || denominator < 0) {
    errors.push('Values cannot be negative');
    return { percentage: 0, errors, warnings };
  }

  if (numerator > denominator) {
    warnings.push(`Numerator (${numerator}) is greater than denominator (${denominator})`);
  }

  const percentage = (numerator / denominator) * 100;
  const rounded = Math.round(percentage * Math.pow(10, precision)) / Math.pow(10, precision);

  return { percentage: rounded, errors, warnings };
}

// Helper function to get AIMS score based on percentage
export function getAIMSScoreFromPercentage(
  parameterCode: string,
  percentage: number
): { score: number; label: string } {
  switch (parameterCode) {
    case 'integrity_capacity_percentage':
      if (percentage >= 85) return { score: 26, label: 'Excellent' };
      if (percentage >= 70) return { score: 18, label: 'Good' };
      if (percentage >= 50) return { score: 10, label: 'Fair' };
      return { score: 0, label: 'Needs Improvement' };
    
    case 'asset_declaration_percentage':
      if (percentage >= 100) return { score: 16, label: 'Perfect' };
      if (percentage >= 95) return { score: 10, label: 'Very Good' };
      if (percentage >= 90) return { score: 5, label: 'Good' };
      return { score: 0, label: 'Needs Improvement' };
    
    case 'atr_responsiveness_percentage':
      if (percentage >= 90) return { score: 10, label: 'Excellent' };
      if (percentage >= 70) return { score: 7, label: 'Satisfactory' };
      return { score: 3, label: 'Needs Improvement' };
    
    default:
      return { score: 0, label: 'Not Scored' };
  }
}