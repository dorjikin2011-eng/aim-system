//frontend/src/components/forms/AutoScoringFields.tsx
import React from 'react';

interface FormField {
  id: string;
  label: string;
  type: string;
  [key: string]: any;
}

interface CalculationConfig {
  calculationType: string;
  [key: string]: any;
}

interface ParameterDefinition {
  calculationConfig?: CalculationConfig;
  maxScore?: number;
  [key: string]: any;
}

export const renderAutoScoringField = (field: FormField, param: ParameterDefinition | undefined): React.ReactNode => {
  if (!param?.calculationConfig) {
    return null;
  }

  const { calculationType } = param.calculationConfig;
  
  // For manual fields, don't render auto-scoring UI (let regular field render)
  if (calculationType === 'manual') {
    return null;
  }

  // ALWAYS return a visual indicator for auto-scoring fields
  // This prevents duplicate rendering as regular input fields
  
  let bgColor: string;
  let textColor: string;
  let badgeColor: string;
  
  switch (calculationType) {
    case 'binary':
      bgColor = 'bg-blue-50 border-blue-200';
      textColor = 'text-blue-900';
      badgeColor = 'bg-blue-200 text-blue-800';
      break;
    case 'range':
      bgColor = 'bg-green-50 border-green-200';
      textColor = 'text-green-900';
      badgeColor = 'bg-green-200 text-green-800';
      break;
    case 'weighted_sum':
      bgColor = 'bg-cyan-50 border-cyan-200';
      textColor = 'text-cyan-900';
      badgeColor = 'bg-cyan-200 text-cyan-800';
      break;
    case 'formula':
      bgColor = 'bg-amber-50 border-amber-200';
      textColor = 'text-amber-900';
      badgeColor = 'bg-amber-200 text-amber-800';
      break;
    case 'percentage':
      bgColor = 'bg-purple-50 border-purple-200';
      textColor = 'text-purple-900';
      badgeColor = 'bg-purple-200 text-purple-800';
      break;
    default:
      bgColor = 'bg-gray-50 border-gray-200';
      textColor = 'text-gray-900';
      badgeColor = 'bg-gray-200 text-gray-800';
  }

  // Determine if this is a calculated field (should not show input)
  const isCalculated = field.type === 'calculated' || 
                       calculationType === 'weighted_sum' || 
                       calculationType === 'formula';

  if (isCalculated) {
    // Show read-only calculated field indicator
    return (
      <div className={`mb-4 p-3 rounded-lg border ${bgColor}`}>
        <div className="flex items-center justify-between">
          <div>
            <label className={`block text-sm font-medium ${textColor}`}>
              {field.label}
              <span className={`ml-2 text-xs px-2 py-0.5 rounded ${badgeColor}`}>
                Auto-calculated
              </span>
            </label>
            <p className={`text-xs ${textColor.replace('900', '700')} mt-1`}>
              This field is automatically calculated by the scoring engine
            </p>
          </div>
          {param.maxScore !== undefined && (
            <span className={`text-sm font-semibold ${textColor}`}>
              Max: {param.maxScore}
            </span>
          )}
        </div>
      </div>
    );
  } else {
    // Show auto-scoring field that can still accept input
    return (
      <div className={`mb-4 p-3 rounded-lg border ${bgColor}`}>
        <div className="flex items-center justify-between">
          <div>
            <label className={`block text-sm font-medium ${textColor}`}>
              {field.label}
              <span className={`ml-2 text-xs px-2 py-0.5 rounded ${badgeColor}`}>
                Auto: {calculationType}
              </span>
            </label>
            <p className={`text-xs ${textColor.replace('900', '700')} mt-1`}>
              This field uses auto-scoring rules
            </p>
          </div>
          {param.maxScore !== undefined && (
            <span className={`text-sm font-semibold ${textColor}`}>
              Max: {param.maxScore}
            </span>
          )}
        </div>
      </div>
    );
  }
};