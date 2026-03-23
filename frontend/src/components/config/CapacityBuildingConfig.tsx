// frontend/src/components/config/CapacityBuildingConfig.tsx

import React, { useState, useEffect } from 'react';
import {
  AcademicCapIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ChartBarIcon,
  UsersIcon,
  CalculatorIcon
} from '@heroicons/react/24/outline';
import type {
  MaturityFramework,
  PercentageThreshold
} from '../../types/maturity';
import ScoringRuleConfig from './ScoringRuleConfig';
import { maturityService } from '../../services/maturityService';

interface CapacityBuildingConfigProps {
  /** Parent indicator ID */
  indicatorId: string;
  
  /** Initial framework configuration */
  initialFramework?: MaturityFramework;
  
  /** Callback when configuration is saved */
  onSave?: (framework: MaturityFramework) => void;
  
  /** Callback when configuration is cancelled */
  onCancel?: () => void;
  
  /** Is the config in read-only mode? */
  readOnly?: boolean;
}

// Default percentage thresholds for Capacity Building from Revised AIMS Framework
const DEFAULT_PERCENTAGE_THRESHOLDS: PercentageThreshold[] = [
  { min: 0, max: 49, level: 0, points: 0 },
  { min: 50, max: 69, level: 1, points: 10 },
  { min: 70, max: 84, level: 2, points: 18 },
  { min: 85, max: 100, level: 3, points: 24 }
];

// Default framework for Capacity Building
const DEFAULT_CAPACITY_FRAMEWORK: MaturityFramework = {
  enabled: true,
  levels: [
    {
      level: 0,
      name: 'Nascent',
      description: 'Less than 50% completion - urgent action needed',
      points: 0,
      parameters: [
        {
          id: 'capacity_0_1',
          code: '0.1',
          description: 'Completion rate below 50%',
          whatToLookFor: 'Less than half of employees have completed ACC e-Learning course',
          required: true,
          displayOrder: 0
        }
      ]
    },
    {
      level: 1,
      name: 'Foundational',
      description: '50-69% completion - basic training coverage',
      points: 10,
      parameters: [
        {
          id: 'capacity_1_1',
          code: '1.1',
          description: 'Training program established',
          whatToLookFor: 'ACC e-Learning course (or equivalent) is available to all employees',
          required: true,
          displayOrder: 0
        },
        {
          id: 'capacity_1_2',
          code: '1.2',
          description: 'Completion tracking',
          whatToLookFor: 'Agency tracks employee completion rates',
          required: true,
          displayOrder: 1
        },
        {
          id: 'capacity_1_3',
          code: '1.3',
          description: 'Basic coverage achieved',
          whatToLookFor: '50-69% of employees have completed training',
          required: true,
          displayOrder: 2
        }
      ]
    },
    {
      level: 2,
      name: 'Established',
      description: '70-84% completion - strong training culture',
      points: 18,
      parameters: [
        {
          id: 'capacity_2_1',
          code: '2.1',
          description: 'Regular training schedule',
          whatToLookFor: 'Training is offered regularly throughout the year',
          required: true,
          displayOrder: 0
        },
        {
          id: 'capacity_2_2',
          code: '2.2',
          description: 'New employee onboarding',
          whatToLookFor: 'All new employees complete training within probation period',
          required: true,
          displayOrder: 1
        },
        {
          id: 'capacity_2_3',
          code: '2.3',
          description: 'Reminder system',
          whatToLookFor: 'Agency has system to remind employees to complete training',
          required: true,
          displayOrder: 2
        },
        {
          id: 'capacity_2_4',
          code: '2.4',
          description: 'Strong coverage achieved',
          whatToLookFor: '70-84% of employees have completed training',
          required: true,
          displayOrder: 3
        },
        {
          id: 'capacity_2_5',
          code: '2.5',
          description: 'Management oversight',
          whatToLookFor: 'Division heads monitor completion rates for their teams',
          required: false,
          displayOrder: 4
        }
      ]
    },
    {
      level: 3,
      name: 'Advanced',
      description: '85%+ completion - exemplary training culture',
      points: 24,
      parameters: [
        {
          id: 'capacity_3_1',
          code: '3.1',
          description: 'Near-universal coverage',
          whatToLookFor: '85% or more of employees have completed training',
          required: true,
          displayOrder: 0
        },
        {
          id: 'capacity_3_2',
          code: '3.2',
          description: 'Training integrated into HR',
          whatToLookFor: 'Training completion is linked to performance management and career progression',
          required: true,
          displayOrder: 1
        },
        {
          id: 'capacity_3_3',
          code: '3.3',
          description: 'Supplementary training',
          whatToLookFor: 'Agency provides additional integrity training beyond e-Learning',
          required: true,
          displayOrder: 2
        },
        {
          id: 'capacity_3_4',
          code: '3.4',
          description: 'Training needs analysis',
          whatToLookFor: 'Agency analyzes training data to identify gaps and target interventions',
          required: true,
          displayOrder: 3
        },
        {
          id: 'capacity_3_5',
          code: '3.5',
          description: 'Knowledge assessment',
          whatToLookFor: 'Agency assesses whether training translates to understanding (e.g., quizzes, discussions)',
          required: false,
          displayOrder: 4
        },
        {
          id: 'capacity_3_6',
          code: '3.6',
          description: 'Peer learning',
          whatToLookFor: 'Agency facilitates knowledge sharing among staff on integrity topics',
          required: false,
          displayOrder: 5
        },
        {
          id: 'capacity_3_7',
          code: '3.7',
          description: 'Reporting to leadership',
          whatToLookFor: 'Regular reports on training completion and impact are submitted to leadership',
          required: true,
          displayOrder: 6
        }
      ]
    }
  ],
  scoringRule: {
    type: 'percentage-range',
    percentageThresholds: DEFAULT_PERCENTAGE_THRESHOLDS
  }
};

export const CapacityBuildingConfig: React.FC<CapacityBuildingConfigProps> = ({
  indicatorId,
  initialFramework,
  onSave,
  onCancel,
  readOnly = false
}) => {
  const [framework, setFramework] = useState<MaturityFramework>(DEFAULT_CAPACITY_FRAMEWORK);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewPercentage, setPreviewPercentage] = useState<number>(75);

  // Load initial data
  useEffect(() => {
    const loadFramework = async () => {
      if (initialFramework) {
        setFramework(initialFramework);
        return;
      }

      setLoading(true);
      try {
        const response = await maturityService.getIndicatorFramework(indicatorId);
        if (response.success && response.data) {
          setFramework(response.data);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load framework');
      } finally {
        setLoading(false);
      }
    };

    loadFramework();
  }, [indicatorId, initialFramework]);

  // Handle scoring rule changes
  const handleScoringRuleChange = (updatedRule: any) => {
    setFramework({
      ...framework,
      scoringRule: updatedRule
    });
  };

  // Handle save
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await maturityService.updateIndicatorFramework(indicatorId, framework);
      if (response.success) {
        setSuccess('Capacity Building framework saved successfully');
        onSave?.(framework);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.error || 'Failed to save framework');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

    // Calculate score based on percentage
  const calculateScore = (percentage: number): { level: number; points: number } => {
    const thresholds = framework.scoringRule.percentageThresholds || DEFAULT_PERCENTAGE_THRESHOLDS;
    const matching = thresholds.find(t => percentage >= t.min && percentage <= t.max);
    
    if (matching && matching.level !== undefined && matching.points !== undefined) {
      return { level: matching.level, points: matching.points };
    }
    
    // Fallback with explicit number values
    if (percentage >= 85) return { level: 3, points: 24 };
    if (percentage >= 70) return { level: 2, points: 18 };
    if (percentage >= 50) return { level: 1, points: 10 };
    return { level: 0, points: 0 };
  };

  const previewResult = calculateScore(previewPercentage);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <ArrowPathIcon className="h-8 w-8 text-blue-600 animate-spin" />
        <span className="ml-3 text-gray-600">Loading Capacity Building configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Integrity Capacity Building Configuration
            </h2>
            <p className="text-gray-600">
              Configure scoring for employee completion of ACC e-Learning course
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <AcademicCapIcon className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-700">Total Points</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">24</span>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Maximum achievable score
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <UsersIcon className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-gray-700">Target</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">All employees</span>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              All staff must complete training
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <ChartBarIcon className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-sm font-medium text-gray-700">Thresholds</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">4 levels</span>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              0-49% | 50-69% | 70-84% | 85-100%
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CalculatorIcon className="h-5 w-5 text-orange-600 mr-2" />
                <span className="text-sm font-medium text-gray-700">Weight</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">24%</span>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Of total AIMS score
            </div>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mt-4 bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <p className="ml-3 text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mt-4 bg-green-50 border-l-4 border-green-500 p-4 rounded">
            <div className="flex">
              <CheckCircleIcon className="h-5 w-5 text-green-400" />
              <p className="ml-3 text-sm text-green-700">{success}</p>
            </div>
          </div>
        )}
      </div>

      {/* Scoring Rule Configuration */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900">Scoring Configuration</h3>
          <p className="text-sm text-gray-500">
            Define percentage thresholds and corresponding points
          </p>
        </div>

        <ScoringRuleConfig
          rule={framework.scoringRule}
          onChange={handleScoringRuleChange}
          readOnly={readOnly}
          showValidation={true}
        />
      </div>

      {/* Scoring Preview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Scoring Preview</h3>
        <p className="text-sm text-gray-500 mb-4">
          Adjust the slider to see how different completion percentages translate to scores
        </p>

        <div className="space-y-6">
          {/* Slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Training Completion Rate:</span>
              <span className="text-lg font-semibold text-blue-600">{previewPercentage}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={previewPercentage}
              onChange={(e) => setPreviewPercentage(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              disabled={readOnly}
            />
            
            {/* Threshold markers */}
            <div className="flex justify-between mt-1 text-xs text-gray-500">
              <span>0%</span>
              <span>50%</span>
              <span>70%</span>
              <span>85%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Result */}
          <div className={`p-4 rounded-lg ${
            previewResult.level === 0 ? 'bg-gray-100' :
            previewResult.level === 1 ? 'bg-blue-100' :
            previewResult.level === 2 ? 'bg-green-100' : 'bg-purple-100'
          }`}>
            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm font-medium text-gray-700">Result:</span>
                <span className="ml-2 text-lg font-semibold">
                  Level {previewResult.level} - {
                    previewResult.level === 0 ? 'Nascent' :
                    previewResult.level === 1 ? 'Foundational' :
                    previewResult.level === 2 ? 'Established' : 'Advanced'
                  }
                </span>
              </div>
              <span className="text-2xl font-bold text-gray-900">{previewResult.points} / 24</span>
            </div>
          </div>

          {/* Score breakdown */}
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center p-2 bg-gray-100 rounded">
              <div className="text-xs text-gray-600">0-49%</div>
              <div className="font-semibold">0 pts</div>
              <div className="text-xs text-gray-500">Nascent</div>
            </div>
            <div className="text-center p-2 bg-blue-100 rounded">
              <div className="text-xs text-blue-800">50-69%</div>
              <div className="font-semibold text-blue-900">10 pts</div>
              <div className="text-xs text-blue-700">Foundational</div>
            </div>
            <div className="text-center p-2 bg-green-100 rounded">
              <div className="text-xs text-green-800">70-84%</div>
              <div className="font-semibold text-green-900">18 pts</div>
              <div className="text-xs text-green-700">Established</div>
            </div>
            <div className="text-center p-2 bg-purple-100 rounded">
              <div className="text-xs text-purple-800">85-100%</div>
              <div className="font-semibold text-purple-900">24 pts</div>
              <div className="text-xs text-purple-700">Advanced</div>
            </div>
          </div>
        </div>
      </div>

      {/* Guidance Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">About Capacity Building Scoring</h4>
        <p className="text-sm text-blue-800">
          This indicator measures the agency's investment in building integrity capabilities, 
          measured by the percentage of employees who have completed ACC's e-Learning course 
          (or equivalent) within the Fiscal Year.
        </p>
        <ul className="mt-2 text-sm text-blue-800 list-disc list-inside">
          <li><span className="font-medium">Level 0 (Nascent):</span> Less than 50% completion - urgent action needed</li>
          <li><span className="font-medium">Level 1 (Foundational):</span> 50-69% completion - basic training coverage</li>
          <li><span className="font-medium">Level 2 (Established):</span> 70-84% completion - strong training culture</li>
          <li><span className="font-medium">Level 3 (Advanced):</span> 85%+ completion - exemplary training culture</li>
        </ul>
      </div>

      {/* Action Buttons */}
      {!readOnly && (
        <div className="flex justify-end space-x-3">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {saving ? (
              <>
                <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Configuration'
            )}
          </button>
        </div>
      )}

      {/* Save Status */}
      {saving && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center">
          <ArrowPathIcon className="h-5 w-5 animate-spin mr-2" />
          Saving configuration...
        </div>
      )}
    </div>
  );
};

export default CapacityBuildingConfig;