// frontend/src/components/config/ScoringRuleConfig.tsx

import React, { useState } from 'react';
import {
  PlusIcon,
  TrashIcon,
  InformationCircleIcon,
  ChartBarIcon,
  CalculatorIcon,
  BeakerIcon
} from '@heroicons/react/24/outline';
import type {
  MaturityScoringRule,
  ScoringType,
  PercentageThreshold,
  //SeverityWeight,
  SeverityMapping,
  MaturityLevel
} from '../../types/maturity';

interface ScoringRuleConfigProps {
  /** The scoring rule to configure */
  rule: MaturityScoringRule;
  
  /** Callback when rule changes */
  onChange: (rule: MaturityScoringRule) => void;
  
  /** Available maturity levels (for reference) */
  availableLevels?: MaturityLevel[];
  
  /** Is the config in read-only mode? */
  readOnly?: boolean;
  
  /** Show validation warnings? */
  showValidation?: boolean;
}

export const ScoringRuleConfig: React.FC<ScoringRuleConfigProps> = ({
  rule,
  onChange,
  availableLevels = [0, 1, 2, 3],
  readOnly = false,
  showValidation = true
}) => {
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Handle scoring type change
  const handleTypeChange = (type: ScoringType) => {
    let newRule: MaturityScoringRule;
    
    switch (type) {
      case 'maturity-level':
        newRule = {
          type: 'maturity-level',
          levelPoints: {
            0: 0,
            1: 4,
            2: 6,
            3: 8
          }
        };
        break;
      
      case 'percentage-range':
        newRule = {
          type: 'percentage-range',
          percentageThresholds: [
            { min: 0, max: 49, level: 0, points: 0 },
            { min: 50, max: 69, level: 1, points: 10 },
            { min: 70, max: 84, level: 2, points: 18 },
            { min: 85, max: 100, level: 3, points: 24 }
          ]
        };
        break;
      
      case 'severity-index':
        newRule = {
          type: 'severity-index',
          severityWeights: [
            { caseType: 'conviction', points: 3, description: 'Criminal conviction in court' },
            { caseType: 'prosecution', points: 2, description: 'Referred to OAG for prosecution' },
            { caseType: 'admin_action', points: 1, description: 'ACC-confirmed administrative action' }
          ],
          severityMapping: [
            { minScore: 0, maxScore: 0, level: 3, points: 20 },
            { minScore: 1, maxScore: 2, level: 2, points: 12 },
            { minScore: 3, maxScore: 4, level: 1, points: 6 },
            { minScore: 5, maxScore: Infinity, level: 0, points: 0 }
          ]
        };
        break;
      
      case 'boolean':
        newRule = {
          type: 'boolean',
          levelPoints: {
            0: 0,
            1: 10
          }
        };
        break;
      
      case 'numeric':
        newRule = {
          type: 'numeric',
          scoringFunction: 'return value;'
        };
        break;
      
      default:
        newRule = { type: 'maturity-level' };
    }
    
    onChange(newRule);
    validateRule(newRule);
  };

  // Validate the rule configuration
  const validateRule = (ruleToValidate: MaturityScoringRule): boolean => {
    const errors: Record<string, string> = {};

    switch (ruleToValidate.type) {
      case 'maturity-level':
        if (!ruleToValidate.levelPoints) {
          errors.levelPoints = 'Level points configuration is required';
        } else {
          // Check if all levels have points defined
          const missingLevels = availableLevels.filter(
            level => ruleToValidate.levelPoints?.[level] === undefined
          );
          if (missingLevels.length > 0) {
            errors.levelPoints = `Points missing for levels: ${missingLevels.join(', ')}`;
          }
        }
        break;

      case 'percentage-range':
        if (!ruleToValidate.percentageThresholds || ruleToValidate.percentageThresholds.length === 0) {
          errors.percentageThresholds = 'Percentage thresholds are required';
        } else {
          // Check for gaps in thresholds
          const sorted = [...ruleToValidate.percentageThresholds].sort((a, b) => a.min - b.min);
          for (let i = 0; i < sorted.length - 1; i++) {
            if (sorted[i].max < sorted[i + 1].min - 0.01) {
              errors.percentageThresholds = `Gap between ${sorted[i].max}% and ${sorted[i + 1].min}%`;
              break;
            }
          }
          // Check if 0-100 is covered
          if (sorted[0].min > 0) {
            errors.percentageThresholds = `Thresholds must start at 0%`;
          }
          if (sorted[sorted.length - 1].max < 100) {
            errors.percentageThresholds = `Thresholds must end at 100%`;
          }
        }
        break;

      case 'severity-index':
        if (!ruleToValidate.severityWeights || ruleToValidate.severityWeights.length === 0) {
          errors.severityWeights = 'Severity weights are required';
        }
        if (!ruleToValidate.severityMapping || ruleToValidate.severityMapping.length === 0) {
          errors.severityMapping = 'Severity mapping is required';
        } else {
          // Check for coverage
          const mapping = ruleToValidate.severityMapping;
          const hasCatchAll = mapping.some(m => m.maxScore === Infinity);
          if (!hasCatchAll) {
            errors.severityMapping = 'Mapping must include a catch-all for high scores';
          }
        }
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Update level points
  const handleLevelPointsChange = (level: MaturityLevel, points: number) => {
    onChange({
      ...rule,
      levelPoints: {
        ...rule.levelPoints,
        [level]: points
      }
    });
  };

  // Add percentage threshold
  const handleAddThreshold = () => {
    if (!rule.percentageThresholds) {
      rule.percentageThresholds = [];
    }
    
    const newThreshold: PercentageThreshold = {
      min: 0,
      max: 0,
      level: 0,
      points: 0
    };
    
    onChange({
      ...rule,
      percentageThresholds: [...rule.percentageThresholds, newThreshold]
    });
  };

  // Update percentage threshold
  const handleThresholdChange = (index: number, updates: Partial<PercentageThreshold>) => {
    if (!rule.percentageThresholds) return;
    
    const newThresholds = [...rule.percentageThresholds];
    newThresholds[index] = { ...newThresholds[index], ...updates };
    
    // Sort by min value
    newThresholds.sort((a, b) => a.min - b.min);
    
    onChange({
      ...rule,
      percentageThresholds: newThresholds
    });
  };

  // Delete percentage threshold
  const handleDeleteThreshold = (index: number) => {
    if (!rule.percentageThresholds) return;
    
    onChange({
      ...rule,
      percentageThresholds: rule.percentageThresholds.filter((_, i) => i !== index)
    });
  };

  // Update severity weight
  const handleSeverityWeightChange = (caseType: 'conviction' | 'prosecution' | 'admin_action', points: number) => {
    if (!rule.severityWeights) {
      rule.severityWeights = [];
    }
    
    const newWeights = rule.severityWeights.map(w =>
      w.caseType === caseType ? { ...w, points } : w
    );
    
    onChange({
      ...rule,
      severityWeights: newWeights
    });
  };

  // Add severity mapping
  const handleAddSeverityMapping = () => {
    if (!rule.severityMapping) {
      rule.severityMapping = [];
    }
    
    const newMapping: SeverityMapping = {
      minScore: 0,
      maxScore: 0,
      level: 0,
      points: 0
    };
    
    onChange({
      ...rule,
      severityMapping: [...rule.severityMapping, newMapping]
    });
  };

  // Update severity mapping
  const handleSeverityMappingChange = (index: number, updates: Partial<SeverityMapping>) => {
    if (!rule.severityMapping) return;
    
    const newMapping = [...rule.severityMapping];
    newMapping[index] = { ...newMapping[index], ...updates };
    
    // Sort by min score
    newMapping.sort((a, b) => a.minScore - b.minScore);
    
    onChange({
      ...rule,
      severityMapping: newMapping
    });
  };

  // Delete severity mapping
  const handleDeleteSeverityMapping = (index: number) => {
    if (!rule.severityMapping) return;
    
    onChange({
      ...rule,
      severityMapping: rule.severityMapping.filter((_, i) => i !== index)
    });
  };

  // Get level name
  const getLevelName = (level: MaturityLevel): string => {
    const names: Record<MaturityLevel, string> = {
      0: 'Nascent',
      1: 'Foundational',
      2: 'Established',
      3: 'Advanced'
    };
    return names[level];
  };

  // Get scoring type icon
  const getTypeIcon = (type: ScoringType) => {
    switch (type) {
      case 'maturity-level':
        return <ChartBarIcon className="h-5 w-5" />;
      case 'percentage-range':
        return <CalculatorIcon className="h-5 w-5" />;
      case 'severity-index':
        return <BeakerIcon className="h-5 w-5" />;
      default:
        return <InformationCircleIcon className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Scoring Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Scoring Type
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['maturity-level', 'percentage-range', 'severity-index'] as ScoringType[]).map(type => (
            <button
              key={type}
              onClick={() => !readOnly && handleTypeChange(type)}
              disabled={readOnly}
              className={`
                p-4 border rounded-lg text-left transition-colors
                ${rule.type === type 
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                  : 'border-gray-200 hover:border-gray-300 bg-white'
                }
                ${readOnly ? 'cursor-default opacity-75' : 'cursor-pointer hover:bg-gray-50'}
              `}
            >
              <div className="flex items-center mb-2">
                <div className={`p-2 rounded-full mr-3 ${
                  rule.type === type ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  {getTypeIcon(type)}
                </div>
                <span className="font-medium text-gray-900">
                  {type === 'maturity-level' && 'Maturity Level'}
                  {type === 'percentage-range' && 'Percentage Range'}
                  {type === 'severity-index' && 'Severity Index'}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {type === 'maturity-level' && 'Score based on selected maturity level (0-3)'}
                {type === 'percentage-range' && 'Score based on percentage thresholds (e.g., training completion)'}
                {type === 'severity-index' && 'Score based on weighted severity of cases'}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Validation Errors */}
      {showValidation && Object.keys(validationErrors).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <InformationCircleIcon className="h-5 w-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-red-800">Configuration Errors</h4>
              <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                {Object.values(validationErrors).map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Maturity Level Scoring Configuration */}
      {rule.type === 'maturity-level' && (
        <div className="bg-white border rounded-lg p-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Maturity Level Points</h4>
          <p className="text-sm text-gray-500 mb-4">
            Define the points awarded for each maturity level
          </p>
          
          <div className="space-y-3">
            {availableLevels.map(level => (
              <div key={level} className="flex items-center space-x-4">
                <div className={`w-24 text-sm font-medium ${
                  level === 0 ? 'text-gray-600' :
                  level === 1 ? 'text-blue-600' :
                  level === 2 ? 'text-green-600' : 'text-purple-600'
                }`}>
                  Level {level}: {getLevelName(level)}
                </div>
                <input
                  type="number"
                  value={rule.levelPoints?.[level] || 0}
                  onChange={(e) => handleLevelPointsChange(level, parseInt(e.target.value) || 0)}
                  disabled={readOnly}
                  min="0"
                  step="0.1"
                  className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
                <span className="text-sm text-gray-500">points</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Percentage Range Scoring Configuration */}
      {rule.type === 'percentage-range' && (
        <div className="bg-white border rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-md font-medium text-gray-900">Percentage Thresholds</h4>
            {!readOnly && (
              <button
                onClick={handleAddThreshold}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Threshold
              </button>
            )}
          </div>
          
          <p className="text-sm text-gray-500 mb-4">
            Define percentage ranges and their corresponding maturity levels and points
          </p>

          <div className="space-y-3">
            {rule.percentageThresholds?.map((threshold, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 grid grid-cols-5 gap-2">
                  <div className="col-span-1">
                    <label className="block text-xs text-gray-500">Min %</label>
                    <input
                      type="number"
                      value={threshold.min}
                      onChange={(e) => handleThresholdChange(index, { min: parseFloat(e.target.value) || 0 })}
                      disabled={readOnly}
                      min="0"
                      max="100"
                      step="0.1"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs text-gray-500">Max %</label>
                    <input
                      type="number"
                      value={threshold.max === Infinity ? 100 : threshold.max}
                      onChange={(e) => handleThresholdChange(index, { max: parseFloat(e.target.value) || 0 })}
                      disabled={readOnly}
                      min="0"
                      max="100"
                      step="0.1"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs text-gray-500">Level</label>
                    <select
                      value={threshold.level}
                      onChange={(e) => handleThresholdChange(index, { level: parseInt(e.target.value) as MaturityLevel })}
                      disabled={readOnly}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                    >
                      {availableLevels.map(level => (
                        <option key={level} value={level}>
                          Level {level} - {getLevelName(level)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs text-gray-500">Points</label>
                    <input
                      type="number"
                      value={threshold.points}
                      onChange={(e) => handleThresholdChange(index, { points: parseFloat(e.target.value) || 0 })}
                      disabled={readOnly}
                      min="0"
                      step="0.1"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                    />
                  </div>
                  <div className="col-span-1 flex items-end">
                    {!readOnly && (
                      <button
                        onClick={() => handleDeleteThreshold(index)}
                        className="text-red-600 hover:text-red-800 p-1"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {(!rule.percentageThresholds || rule.percentageThresholds.length === 0) && (
              <div className="text-center py-6 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No percentage thresholds defined</p>
              </div>
            )}
          </div>

          {/* Preview */}
          {rule.percentageThresholds && rule.percentageThresholds.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <h5 className="text-sm font-medium text-blue-900 mb-2">Scoring Preview</h5>
              <div className="space-y-1 text-sm">
                {rule.percentageThresholds
                  .sort((a, b) => a.min - b.min)
                  .map((t, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{t.min}% - {t.max === Infinity ? '100%' : t.max + '%'}</span>
                      <span className="font-medium">Level {t.level}: {t.points} points</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Severity Index Scoring Configuration */}
      {rule.type === 'severity-index' && (
        <div className="space-y-6">
          {/* Severity Weights */}
          <div className="bg-white border rounded-lg p-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Severity Weights</h4>
            <p className="text-sm text-gray-500 mb-4">
              Define the severity points for each type of case
            </p>

            <div className="space-y-3">
              {[
                { caseType: 'conviction' as const, label: 'Conviction', defaultPoints: 3 },
                { caseType: 'prosecution' as const, label: 'Prosecution/OAG Referral', defaultPoints: 2 },
                { caseType: 'admin_action' as const, label: 'Administrative Action', defaultPoints: 1 }
              ].map(({ caseType, label, defaultPoints }) => {
                const weight = rule.severityWeights?.find(w => w.caseType === caseType);
                return (
                  <div key={caseType} className="flex items-center space-x-4">
                    <div className="w-48 text-sm font-medium">{label}</div>
                    <input
                      type="number"
                      value={weight?.points || defaultPoints}
                      onChange={(e) => handleSeverityWeightChange(caseType, parseInt(e.target.value) || 0)}
                      disabled={readOnly}
                      min="0"
                      step="0.1"
                      className="w-24 px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <span className="text-sm text-gray-500">points per case</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Severity Mapping */}
          <div className="bg-white border rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-md font-medium text-gray-900">Severity Score to Level Mapping</h4>
              {!readOnly && (
                <button
                  onClick={handleAddSeverityMapping}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Range
                </button>
              )}
            </div>
            
            <p className="text-sm text-gray-500 mb-4">
              Map total severity scores to maturity levels and points
            </p>

            <div className="space-y-3">
              {rule.severityMapping?.map((mapping, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 grid grid-cols-5 gap-2">
                    <div className="col-span-1">
                      <label className="block text-xs text-gray-500">Min Score</label>
                      <input
                        type="number"
                        value={mapping.minScore}
                        onChange={(e) => handleSeverityMappingChange(index, { minScore: parseInt(e.target.value) || 0 })}
                        disabled={readOnly}
                        min="0"
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-xs text-gray-500">Max Score</label>
                      <input
                        type="number"
                        value={mapping.maxScore === Infinity ? '' : mapping.maxScore}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleSeverityMappingChange(index, { 
                            maxScore: val === '' ? Infinity : parseInt(val) || 0 
                          });
                        }}
                        disabled={readOnly}
                        min="0"
                        placeholder="∞"
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-xs text-gray-500">Level</label>
                      <select
                        value={mapping.level}
                        onChange={(e) => handleSeverityMappingChange(index, { level: parseInt(e.target.value) as MaturityLevel })}
                        disabled={readOnly}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                      >
                        {availableLevels.map(level => (
                          <option key={level} value={level}>
                            Level {level} - {getLevelName(level)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-1">
                      <label className="block text-xs text-gray-500">Points</label>
                      <input
                        type="number"
                        value={mapping.points}
                        onChange={(e) => handleSeverityMappingChange(index, { points: parseInt(e.target.value) || 0 })}
                        disabled={readOnly}
                        min="0"
                        step="0.1"
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                      />
                    </div>
                    <div className="col-span-1 flex items-end">
                      {!readOnly && mapping.maxScore !== Infinity && (
                        <button
                          onClick={() => handleDeleteSeverityMapping(index)}
                          className="text-red-600 hover:text-red-800 p-1"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {(!rule.severityMapping || rule.severityMapping.length === 0) && (
                <div className="text-center py-6 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">No severity mapping defined</p>
                </div>
              )}
            </div>

            {/* Preview */}
            {rule.severityMapping && rule.severityMapping.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <h5 className="text-sm font-medium text-blue-900 mb-2">Scoring Preview</h5>
                <div className="space-y-1 text-sm">
                  {rule.severityMapping
                    .sort((a, b) => a.minScore - b.minScore)
                    .map((m, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>
                          {m.minScore} - {m.maxScore === Infinity ? '∞' : m.maxScore} severity points
                        </span>
                        <span className="font-medium">Level {m.level}: {m.points} points</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScoringRuleConfig;