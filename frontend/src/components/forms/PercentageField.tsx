// frontend/src/components/forms/PercentageField.tsx
import React, { useState, useEffect } from 'react';
import { CalculatorIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface PercentageFieldProps {
  // Field configuration
  parameterCode: string;
  label: string;
  description?: string;
  
  // Raw data inputs
  numerator: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    placeholder?: string;
    helpText?: string;
  };
  
  denominator: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    placeholder?: string;
    helpText?: string;
  };
  
  // Calculation configuration
  unit?: string; // "employees", "officials", "ATRs"
  precision?: number; // Decimal precision (default: 2)
  showCalculation?: boolean; // Whether to show the calculated percentage
  showScore?: boolean; // Whether to show the score based on percentage
  scoringRules?: Array<{
    minPercentage: number;
    maxPercentage?: number;
    points: number;
    label?: string;
  }>;
  
  // Callbacks
  onPercentageChange?: (percentage: number) => void;
  onScoreChange?: (score: number) => void;
  
  // UI settings
  disabled?: boolean;
  required?: boolean;
  error?: string;
  warning?: string;
}

export default function PercentageField({
  parameterCode,
  label,
  description,
  numerator,
  denominator,
  unit = 'items',
  precision = 2,
  showCalculation = true,
  showScore = false,
  scoringRules = [],
  onPercentageChange,
  onScoreChange,
  disabled = false,
  required = false,
  error,
  warning
}: PercentageFieldProps) {
  const [calculatedPercentage, setCalculatedPercentage] = useState<number>(0);
  const [calculatedScore, setCalculatedScore] = useState<number>(0);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Calculate percentage whenever numerator or denominator changes
  useEffect(() => {
    calculatePercentage();
  }, [numerator.value, denominator.value, precision]);

  // Calculate the percentage
  const calculatePercentage = () => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Validate inputs
    if (denominator.value === 0) {
      errors.push(`Denominator (${denominator.label}) cannot be zero`);
      setCalculatedPercentage(0);
    } else if (numerator.value < 0 || denominator.value < 0) {
      errors.push('Values cannot be negative');
      setCalculatedPercentage(0);
    } else if (numerator.value > denominator.value) {
      warnings.push(`Numerator (${numerator.value}) is greater than denominator (${denominator.value})`);
      // Still calculate but show warning
      const percentage = (numerator.value / denominator.value) * 100;
      const rounded = Math.round(percentage * Math.pow(10, precision)) / Math.pow(10, precision);
      setCalculatedPercentage(rounded);
    } else {
      const percentage = (numerator.value / denominator.value) * 100;
      const rounded = Math.round(percentage * Math.pow(10, precision)) / Math.pow(10, precision);
      setCalculatedPercentage(rounded);
    }

    // Update validation state
    setValidationErrors(errors);
    setWarnings(warnings);

    // Call callback if provided
    if (onPercentageChange && !errors.length) {
      const percentage = denominator.value > 0 ? (numerator.value / denominator.value) * 100 : 0;
      const rounded = Math.round(percentage * Math.pow(10, precision)) / Math.pow(10, precision);
      onPercentageChange(rounded);
    }

    // Calculate score if scoring rules are provided
    if (scoringRules.length > 0) {
      calculateScore();
    }
  };

  // Calculate score based on percentage and scoring rules
  const calculateScore = () => {
    let score = 0;
    
    // Find the matching scoring rule
    for (const rule of scoringRules) {
      const matches = calculatedPercentage >= rule.minPercentage && 
                     (rule.maxPercentage === undefined || calculatedPercentage <= rule.maxPercentage);
      if (matches) {
        score = rule.points;
        break;
      }
    }
    
    setCalculatedScore(score);
    
    // Call callback if provided
    if (onScoreChange) {
      onScoreChange(score);
    }
  };

  // Handle numerator change
  const handleNumeratorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    numerator.onChange(value);
  };

  // Handle denominator change
  const handleDenominatorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    denominator.onChange(value);
  };

  // Get score label for display
  const getScoreLabel = () => {
    if (!scoringRules.length) return null;
    
    for (const rule of scoringRules) {
      const matches = calculatedPercentage >= rule.minPercentage && 
                     (rule.maxPercentage === undefined || calculatedPercentage <= rule.maxPercentage);
      if (matches) {
        return rule.label || `${rule.points} points`;
      }
    }
    return 'No score';
  };

  // Format percentage for display
  const formatPercentage = (value: number) => {
    return value.toFixed(precision) + '%';
  };

  // AIMS specific scoring rules for common indicators
  const getAIMSScoringRules = () => {
    // These are examples based on the AIMS guideline
    switch (parameterCode) {
      case 'integrity_capacity_percentage':
        // e-Learning completion: ≥85% → 26 points, 70-84% → 18, 50-69% → 10, <50% → 0
        return [
          { minPercentage: 85, points: 26, label: 'Excellent (26 points)' },
          { minPercentage: 70, maxPercentage: 84, points: 18, label: 'Good (18 points)' },
          { minPercentage: 50, maxPercentage: 69, points: 10, label: 'Fair (10 points)' },
          { minPercentage: 0, maxPercentage: 49, points: 0, label: 'Needs Improvement (0 points)' }
        ];
      
      case 'asset_declaration_percentage':
        // Asset declaration: 100% → 16, 95-99% → 10, 90-94% → 5, <90% → 0
        return [
          { minPercentage: 100, points: 16, label: 'Perfect (16 points)' },
          { minPercentage: 95, maxPercentage: 99, points: 10, label: 'Very Good (10 points)' },
          { minPercentage: 90, maxPercentage: 94, points: 5, label: 'Good (5 points)' },
          { minPercentage: 0, maxPercentage: 89, points: 0, label: 'Needs Improvement (0 points)' }
        ];
      
      case 'atr_responsiveness_percentage':
        // ATR responsiveness: ≥90% → 10, 70-89% → 7, <70% → 3
        return [
          { minPercentage: 90, points: 10, label: 'Excellent (10 points)' },
          { minPercentage: 70, maxPercentage: 89, points: 7, label: 'Satisfactory (7 points)' },
          { minPercentage: 0, maxPercentage: 69, points: 3, label: 'Needs Improvement (3 points)' }
        ];
      
      default:
        return scoringRules;
    }
  };

  const effectiveScoringRules = getAIMSScoringRules();

  return (
    <div className="space-y-4 p-4 border border-gray-200 rounded-lg bg-white">
      {/* Field Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-900">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {showCalculation && (
            <div className="flex items-center text-sm text-blue-600">
              <CalculatorIcon className="h-4 w-4 mr-1" />
              Auto-calculated
            </div>
          )}
        </div>
        
        {description && (
          <p className="text-sm text-gray-500">{description}</p>
        )}
      </div>

      {/* Raw Data Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Numerator Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {numerator.label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <div className="relative">
            <input
              type="number"
              value={numerator.value || ''}
              onChange={handleNumeratorChange}
              min="0"
              step="1"
              disabled={disabled}
              className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                error ? 'border-red-300' : 'border-gray-300'
              } ${disabled ? 'bg-gray-100 text-gray-500' : ''}`}
              placeholder={numerator.placeholder || `Enter number of ${unit}`}
            />
            {numerator.helpText && (
              <div className="absolute right-2 top-2">
                <InformationCircleIcon className="h-5 w-5 text-gray-400" title={numerator.helpText} />
              </div>
            )}
          </div>
          {numerator.helpText && !numerator.helpText.includes('InformationCircleIcon') && (
            <p className="mt-1 text-xs text-gray-500">{numerator.helpText}</p>
          )}
        </div>

        {/* Denominator Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {denominator.label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <div className="relative">
            <input
              type="number"
              value={denominator.value || ''}
              onChange={handleDenominatorChange}
              min="0"
              step="1"
              disabled={disabled}
              className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                error ? 'border-red-300' : 'border-gray-300'
              } ${disabled ? 'bg-gray-100 text-gray-500' : ''}`}
              placeholder={denominator.placeholder || `Enter total ${unit}`}
            />
            {denominator.helpText && (
              <div className="absolute right-2 top-2">
                <InformationCircleIcon className="h-5 w-5 text-gray-400" title={denominator.helpText} />
              </div>
            )}
          </div>
          {denominator.helpText && !denominator.helpText.includes('InformationCircleIcon') && (
            <p className="mt-1 text-xs text-gray-500">{denominator.helpText}</p>
          )}
        </div>
      </div>

      {/* Calculation Results */}
      {showCalculation && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Percentage Calculation */}
            <div className="space-y-1">
              <div className="text-xs font-medium text-blue-900">CALCULATED PERCENTAGE</div>
              <div className="text-2xl font-bold text-blue-700">
                {formatPercentage(calculatedPercentage)}
              </div>
              <div className="text-xs text-blue-600">
                {numerator.value} of {denominator.value} {unit}
              </div>
            </div>

            {/* Progress Bar Visualization */}
            <div className="md:col-span-2">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>0%</span>
                <span>100%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full" 
                  style={{ width: `${Math.min(calculatedPercentage, 100)}%` }}
                ></div>
              </div>
              
              {/* Threshold Markers for AIMS Scoring */}
              {effectiveScoringRules.length > 0 && (
                <div className="flex justify-between mt-2">
                  {effectiveScoringRules.map((rule, index) => (
                    <div key={index} className="text-center">
                      <div className="text-xs text-gray-500">≥{rule.minPercentage}%</div>
                      <div className="text-xs font-medium">{rule.points} pts</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Score Display (if enabled) */}
          {showScore && effectiveScoringRules.length > 0 && (
            <div className="mt-3 pt-3 border-t border-blue-100">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-xs font-medium text-gray-700">SCORE</div>
                  <div className="text-lg font-bold text-green-700">
                    {calculatedScore} points
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  {getScoreLabel()}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Validation Errors */}
      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {validationErrors.length > 0 && (
        <div className="p-2 bg-red-50 border border-red-200 rounded">
          <ul className="text-sm text-red-600 list-disc list-inside">
            {validationErrors.map((err, index) => (
              <li key={index}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {warning && (
        <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-700">{warning}</p>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
          <ul className="text-sm text-yellow-700 list-disc list-inside">
            {warnings.map((warn, index) => (
              <li key={index}>{warn}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Calculation Formula (for transparency) */}
      <div className="text-xs text-gray-500 italic">
        Formula: ({numerator.label} ÷ {denominator.label}) × 100 = {formatPercentage(calculatedPercentage)}
      </div>
    </div>
  );
}