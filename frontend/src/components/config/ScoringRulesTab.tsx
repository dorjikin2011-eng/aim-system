// frontend/src/components/config/ScoringRulesTab.tsx

import React, { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  CalculatorIcon,
  ScaleIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface ScoringRule {
  id: string;
  indicatorId: string;
  indicatorName: string;
  weight: number;
  scoringType: 'maturity-level' | 'percentage-range' | 'severity-index';
  rules: any;
}

export const ScoringRulesTab: React.FC = () => {
  const [rules, setRules] = useState<ScoringRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIndicator, setExpandedIndicator] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  useEffect(() => {
    loadScoringRules();
  }, []);

  const loadScoringRules = async () => {
    setLoading(true);
    // This would fetch from your API
    const mockRules: ScoringRule[] = [
      {
        id: '1',
        indicatorId: 'ind_iccs_v3',
        indicatorName: 'Internal Corruption Control Systems (ICCS)',
        weight: 32,
        scoringType: 'maturity-level',
        rules: {
          levels: [
            { level: 0, points: 0, name: 'Nascent', description: 'No formal system' },
            { level: 1, points: 4, name: 'Foundational', description: 'Basic system exists' },
            { level: 2, points: 6, name: 'Established', description: 'System operational' },
            { level: 3, points: 8, name: 'Advanced', description: 'System embedded' }
          ],
          appliesTo: ['Complaint', 'CoI', 'Gift', 'Proactive']
        }
      },
      {
        id: '2',
        indicatorId: 'ind_training_v3',
        indicatorName: 'Integrity Capacity Building',
        weight: 24,
        scoringType: 'percentage-range',
        rules: {
          thresholds: [
            { min: 0, max: 49, level: 0, points: 0, name: 'Nascent' },
            { min: 50, max: 69, level: 1, points: 10, name: 'Foundational' },
            { min: 70, max: 84, level: 2, points: 18, name: 'Established' },
            { min: 85, max: 100, level: 3, points: 24, name: 'Advanced' }
          ]
        }
      },
      {
        id: '3',
        indicatorId: 'ind_ad_v3',
        indicatorName: 'Asset Declaration Compliance',
        weight: 14,
        scoringType: 'percentage-range',
        rules: {
          thresholds: [
            { min: 0, max: 89, level: 0, points: 0, name: 'Nascent' },
            { min: 90, max: 94, level: 1, points: 5, name: 'Foundational' },
            { min: 95, max: 99, level: 2, points: 10, name: 'Established' },
            { min: 100, max: 100, level: 3, points: 14, name: 'Advanced' }
          ]
        }
      },
      {
        id: '4',
        indicatorId: 'ind_coc_v3',
        indicatorName: 'Code of Conduct',
        weight: 10,
        scoringType: 'maturity-level',
        rules: {
          levels: [
            { level: 0, points: 0, name: 'Nascent', description: 'No active promotion' },
            { level: 1, points: 4, name: 'Foundational', description: 'Code exists and accessible' },
            { level: 2, points: 7, name: 'Established', description: 'Actively communicated' },
            { level: 3, points: 10, name: 'Advanced', description: 'Embedded in culture' }
          ]
        }
      },
      {
        id: '5',
        indicatorId: 'ind_cases_v3',
        indicatorName: 'Corruption Cases',
        weight: 20,
        scoringType: 'severity-index',
        rules: {
          weights: [
            { type: 'Conviction', points: 3 },
            { type: 'Prosecution', points: 2 },
            { type: 'Admin Action', points: 1 }
          ],
          mapping: [
            { minScore: 0, maxScore: 0, level: 3, points: 20, name: 'Advanced' },
            { minScore: 1, maxScore: 2, level: 2, points: 12, name: 'Established' },
            { minScore: 3, maxScore: 4, level: 1, points: 6, name: 'Foundational' },
            { minScore: 5, maxScore: 999, level: 0, points: 0, name: 'Nascent' }
          ]
        }
      }
    ];
    setRules(mockRules);
    setLoading(false);
  };

  const handleEdit = (rule: ScoringRule) => {
    setEditingRule(rule.id);
    setEditForm(JSON.parse(JSON.stringify(rule))); // Deep copy
  };

  const handleSave = () => {
    // Save to API
    setEditingRule(null);
    setEditForm(null);
  };

  const handleCancel = () => {
    setEditingRule(null);
    setEditForm(null);
  };

  const renderMaturityLevelRules = (rule: ScoringRule, isEditing: boolean) => {
    if (isEditing && editForm) {
      return (
        <div className="space-y-3">
          {editForm.rules.levels.map((level: any, idx: number) => (
            <div key={idx} className="flex items-center space-x-3 p-2 bg-white rounded border">
              <span className="w-16 text-sm font-medium">Level {level.level}</span>
              <input
                type="text"
                value={level.name}
                onChange={(e) => {
                  const newLevels = [...editForm.rules.levels];
                  newLevels[idx].name = e.target.value;
                  setEditForm({
                    ...editForm,
                    rules: { ...editForm.rules, levels: newLevels }
                  });
                }}
                className="flex-1 px-2 py-1 text-sm border rounded"
                placeholder="Name"
              />
              <input
                type="number"
                value={level.points}
                onChange={(e) => {
                  const newLevels = [...editForm.rules.levels];
                  newLevels[idx].points = parseInt(e.target.value);
                  setEditForm({
                    ...editForm,
                    rules: { ...editForm.rules, levels: newLevels }
                  });
                }}
                className="w-20 px-2 py-1 text-sm border rounded"
                placeholder="Points"
              />
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {rule.rules.levels?.map((level: any, idx: number) => (
          <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-4">
              <span className={`w-20 text-sm font-medium ${
                level.level === 0 ? 'text-gray-500' :
                level.level === 1 ? 'text-blue-600' :
                level.level === 2 ? 'text-green-600' : 'text-purple-600'
              }`}>
                Level {level.level}
              </span>
              <span className="text-sm font-medium">{level.name}</span>
              <span className="text-xs text-gray-500">{level.description}</span>
            </div>
            <span className="text-sm font-semibold">{level.points} points</span>
          </div>
        ))}
        {rule.rules.appliesTo && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
            <span className="text-sm font-medium text-blue-800">Applies to: </span>
            <span className="text-sm text-blue-700">{rule.rules.appliesTo.join(' • ')}</span>
          </div>
        )}
      </div>
    );
  };

  const renderPercentageRules = (rule: ScoringRule, isEditing: boolean) => {
    if (isEditing && editForm) {
      return (
        <div className="space-y-3">
          {editForm.rules.thresholds.map((threshold: any, idx: number) => (
            <div key={idx} className="flex items-center space-x-3 p-2 bg-white rounded border">
              <input
                type="number"
                value={threshold.min}
                onChange={(e) => {
                  const newThresholds = [...editForm.rules.thresholds];
                  newThresholds[idx].min = parseInt(e.target.value);
                  setEditForm({
                    ...editForm,
                    rules: { ...editForm.rules, thresholds: newThresholds }
                  });
                }}
                className="w-16 px-2 py-1 text-sm border rounded"
                placeholder="Min"
              />
              <span>-</span>
              <input
                type="number"
                value={threshold.max}
                onChange={(e) => {
                  const newThresholds = [...editForm.rules.thresholds];
                  newThresholds[idx].max = parseInt(e.target.value);
                  setEditForm({
                    ...editForm,
                    rules: { ...editForm.rules, thresholds: newThresholds }
                  });
                }}
                className="w-16 px-2 py-1 text-sm border rounded"
                placeholder="Max"
              />
              <span className="text-sm">% → Level {threshold.level}</span>
              <input
                type="number"
                value={threshold.points}
                onChange={(e) => {
                  const newThresholds = [...editForm.rules.thresholds];
                  newThresholds[idx].points = parseInt(e.target.value);
                  setEditForm({
                    ...editForm,
                    rules: { ...editForm.rules, thresholds: newThresholds }
                  });
                }}
                className="w-20 px-2 py-1 text-sm border rounded"
                placeholder="Points"
              />
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {rule.rules.thresholds?.map((threshold: any, idx: number) => (
          <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-4">
              <span className="w-24 text-sm">
                {threshold.min}% - {threshold.max === 100 ? '100%' : threshold.max + '%'}
              </span>
              <span className={`text-sm font-medium ${
                threshold.level === 0 ? 'text-gray-500' :
                threshold.level === 1 ? 'text-blue-600' :
                threshold.level === 2 ? 'text-green-600' : 'text-purple-600'
              }`}>
                Level {threshold.level}: {threshold.name}
              </span>
            </div>
            <span className="text-sm font-semibold">{threshold.points} points</span>
          </div>
        ))}
      </div>
    );
  };

  const renderSeverityRules = (rule: ScoringRule, isEditing: boolean) => {
    if (isEditing && editForm) {
      return (
        <div className="space-y-4">
          <div className="p-3 bg-white rounded border">
            <h4 className="text-sm font-medium mb-2">Case Weights</h4>
            <div className="space-y-2">
              {editForm.rules.weights.map((weight: any, idx: number) => (
                <div key={idx} className="flex items-center space-x-3">
                  <span className="w-24 text-sm">{weight.type}</span>
                  <input
                    type="number"
                    value={weight.points}
                    onChange={(e) => {
                      const newWeights = [...editForm.rules.weights];
                      newWeights[idx].points = parseInt(e.target.value);
                      setEditForm({
                        ...editForm,
                        rules: { ...editForm.rules, weights: newWeights }
                      });
                    }}
                    className="w-20 px-2 py-1 text-sm border rounded"
                  />
                  <span className="text-sm">points per case</span>
                </div>
              ))}
            </div>
          </div>
          <div className="p-3 bg-white rounded border">
            <h4 className="text-sm font-medium mb-2">Score Mapping</h4>
            <div className="space-y-2">
              {editForm.rules.mapping.map((map: any, idx: number) => (
                <div key={idx} className="flex items-center space-x-3">
                  <input
                    type="number"
                    value={map.minScore}
                    onChange={(e) => {
                      const newMapping = [...editForm.rules.mapping];
                      newMapping[idx].minScore = parseInt(e.target.value);
                      setEditForm({
                        ...editForm,
                        rules: { ...editForm.rules, mapping: newMapping }
                      });
                    }}
                    className="w-16 px-2 py-1 text-sm border rounded"
                  />
                  <span>-</span>
                  <input
                    type="number"
                    value={map.maxScore === 999 ? '' : map.maxScore}
                    onChange={(e) => {
                      const val = e.target.value;
                      const newMapping = [...editForm.rules.mapping];
                      newMapping[idx].maxScore = val === '' ? 999 : parseInt(val);
                      setEditForm({
                        ...editForm,
                        rules: { ...editForm.rules, mapping: newMapping }
                      });
                    }}
                    className="w-16 px-2 py-1 text-sm border rounded"
                    placeholder="∞"
                  />
                  <span className="text-sm">→ Level {map.level}</span>
                  <input
                    type="number"
                    value={map.points}
                    onChange={(e) => {
                      const newMapping = [...editForm.rules.mapping];
                      newMapping[idx].points = parseInt(e.target.value);
                      setEditForm({
                        ...editForm,
                        rules: { ...editForm.rules, mapping: newMapping }
                      });
                    }}
                    className="w-20 px-2 py-1 text-sm border rounded"
                    placeholder="Points"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Case Weights</h4>
          <div className="grid grid-cols-3 gap-3">
            {rule.rules.weights?.map((weight: any, idx: number) => (
              <div key={idx} className="bg-white p-2 rounded-lg text-center shadow-sm">
                <div className="text-xs text-gray-500">{weight.type}</div>
                <div className="text-lg font-bold text-blue-600">{weight.points}</div>
                <div className="text-xs">points per case</div>
              </div>
            ))}
          </div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Score Mapping</h4>
          <div className="space-y-2">
            {rule.rules.mapping?.map((map: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-lg">
                <span className="text-sm">
                  {map.minScore} - {map.maxScore === 999 ? '∞' : map.maxScore} points
                </span>
                <span className={`text-sm font-medium ${
                  map.level === 0 ? 'text-gray-500' :
                  map.level === 1 ? 'text-blue-600' :
                  map.level === 2 ? 'text-green-600' : 'text-purple-600'
                }`}>
                  Level {map.level}: {map.points} points
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <ArrowPathIcon className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Scoring Rules</h2>
            <p className="text-gray-600">Maturity-based scoring rules for all AIMS indicators</p>
          </div>
          <div className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
            {rules.length} Indicators Configured
          </div>
        </div>

        <div className="space-y-4">
          {rules.map(rule => (
            <div key={rule.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <div
                className="bg-gray-50 px-6 py-4 flex justify-between items-center cursor-pointer hover:bg-gray-100"
                onClick={() => setExpandedIndicator(expandedIndicator === rule.id ? null : rule.id)}
              >
                <div className="flex items-center space-x-4">
                  {rule.scoringType === 'maturity-level' && <ScaleIcon className="h-5 w-5 text-blue-600" />}
                  {rule.scoringType === 'percentage-range' && <ChartBarIcon className="h-5 w-5 text-green-600" />}
                  {rule.scoringType === 'severity-index' && <CalculatorIcon className="h-5 w-5 text-purple-600" />}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{rule.indicatorName}</h3>
                    <div className="flex items-center space-x-3 mt-1">
                      <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                        Weight: {rule.weight}%
                      </span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded capitalize">
                        {rule.scoringType.replace('-', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {editingRule !== rule.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(rule);
                      }}
                      className="p-1 text-gray-400 hover:text-blue-600"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                  )}
                  <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform ${
                    expandedIndicator === rule.id ? 'rotate-180' : ''
                  }`} />
                </div>
              </div>

              {expandedIndicator === rule.id && (
                <div className="p-6 border-t border-gray-200">
                  {editingRule === rule.id ? (
                    <div className="space-y-4">
                      {rule.scoringType === 'maturity-level' && renderMaturityLevelRules(rule, true)}
                      {rule.scoringType === 'percentage-range' && renderPercentageRules(rule, true)}
                      {rule.scoringType === 'severity-index' && renderSeverityRules(rule, true)}
                      
                      <div className="flex justify-end space-x-3 pt-4 border-t">
                        <button
                          onClick={handleCancel}
                          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center"
                        >
                          <XMarkIcon className="h-4 w-4 mr-1" />
                          Cancel
                        </button>
                        <button
                          onClick={handleSave}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                        >
                          <CheckIcon className="h-4 w-4 mr-1" />
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {rule.scoringType === 'maturity-level' && renderMaturityLevelRules(rule, false)}
                      {rule.scoringType === 'percentage-range' && renderPercentageRules(rule, false)}
                      {rule.scoringType === 'severity-index' && renderSeverityRules(rule, false)}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};