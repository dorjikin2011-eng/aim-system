// frontend/src/components/config/AssetDeclarationConfig.tsx

import React, { useState, useEffect } from 'react';
import {
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ChartBarIcon,
  ClockIcon,
  //CalculatorIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import type {
  MaturityFramework,
  PercentageThreshold
} from '../../types/maturity';
import ScoringRuleConfig from './ScoringRuleConfig';
import { maturityService } from '../../services/maturityService';

interface AssetDeclarationConfigProps {
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

// Default percentage thresholds for Asset Declaration from Revised AIMS Framework
const DEFAULT_PERCENTAGE_THRESHOLDS: PercentageThreshold[] = [
  { min: 0, max: 89, level: 0, points: 0 },
  { min: 90, max: 94, level: 1, points: 5 },
  { min: 95, max: 99, level: 2, points: 10 },
  { min: 100, max: 100, level: 3, points: 14 }
];

// Default framework for Asset Declaration
const DEFAULT_ASSET_FRAMEWORK: MaturityFramework = {
  enabled: true,
  levels: [
    {
      level: 0,
      name: 'Nascent',
      description: 'Less than 90% compliance - urgent action needed',
      points: 0,
      parameters: [
        {
          id: 'asset_0_1',
          code: '0.1',
          description: 'Compliance rate below 90%',
          whatToLookFor: 'Less than 90% of covered officials submit declarations on time',
          required: true,
          displayOrder: 0
        },
        {
          id: 'asset_0_2',
          code: '0.2',
          description: 'No tracking system',
          whatToLookFor: 'Agency lacks system to track declaration submissions',
          required: true,
          displayOrder: 1
        }
      ]
    },
    {
      level: 1,
      name: 'Foundational',
      description: '90-94% compliance - basic compliance',
      points: 5,
      parameters: [
        {
          id: 'asset_1_1',
          code: '1.1',
          description: 'Declaration system established',
          whatToLookFor: 'Agency has system for collecting annual asset declarations',
          required: true,
          displayOrder: 0
        },
        {
          id: 'asset_1_2',
          code: '1.2',
          description: 'Covered officials identified',
          whatToLookFor: 'Agency maintains accurate list of covered officials required to declare',
          required: true,
          displayOrder: 1
        },
        {
          id: 'asset_1_3',
          code: '1.3',
          description: 'Basic compliance achieved',
          whatToLookFor: '90-94% of covered officials submit declarations on time',
          required: true,
          displayOrder: 2
        },
        {
          id: 'asset_1_4',
          code: '1.4',
          description: 'Reminders sent',
          whatToLookFor: 'Agency sends reminders to officials before deadline',
          required: false,
          displayOrder: 3
        }
      ]
    },
    {
      level: 2,
      name: 'Established',
      description: '95-99% compliance - strong compliance culture',
      points: 10,
      parameters: [
        {
          id: 'asset_2_1',
          code: '2.1',
          description: 'Strong compliance achieved',
          whatToLookFor: '95-99% of covered officials submit declarations on time',
          required: true,
          displayOrder: 0
        },
        {
          id: 'asset_2_2',
          code: '2.2',
          description: 'Follow-up on non-compliance',
          whatToLookFor: 'Agency follows up with non-compliant officials and escalates as needed',
          required: true,
          displayOrder: 1
        },
        {
          id: 'asset_2_3',
          code: '2.3',
          description: 'Declaration review',
          whatToLookFor: 'Agency reviews declarations for completeness and flags issues',
          required: true,
          displayOrder: 2
        },
        {
          id: 'asset_2_4',
          code: '2.4',
          description: 'Management oversight',
          whatToLookFor: 'Division heads monitor compliance for their teams',
          required: true,
          displayOrder: 3
        },
        {
          id: 'asset_2_5',
          code: '2.5',
          description: 'Deadline tracking',
          whatToLookFor: 'Agency tracks submission deadlines and maintains records',
          required: true,
          displayOrder: 4
        },
        {
          id: 'asset_2_6',
          code: '2.6',
          description: 'New officials onboarding',
          whatToLookFor: 'New covered officials are informed of declaration requirements during onboarding',
          required: false,
          displayOrder: 5
        }
      ]
    },
    {
      level: 3,
      name: 'Advanced',
      description: '100% compliance - exemplary compliance culture',
      points: 14,
      parameters: [
        {
          id: 'asset_3_1',
          code: '3.1',
          description: 'Perfect compliance achieved',
          whatToLookFor: '100% of covered officials submit declarations on time',
          required: true,
          displayOrder: 0
        },
        {
          id: 'asset_3_2',
          code: '3.2',
          description: 'Quality review',
          whatToLookFor: 'Agency reviews declarations for quality and accuracy, not just submission',
          required: true,
          displayOrder: 1
        },
        {
          id: 'asset_3_3',
          code: '3.3',
          description: 'Risk-based analysis',
          whatToLookFor: 'Agency analyzes declaration data to identify potential conflicts or risks',
          required: true,
          displayOrder: 2
        },
        {
          id: 'asset_3_4',
          code: '3.4',
          description: 'Integration with CoI',
          whatToLookFor: 'Declaration data is used to inform Conflict of Interest management',
          required: true,
          displayOrder: 3
        },
        {
          id: 'asset_3_5',
          code: '3.5',
          description: 'Training and guidance',
          whatToLookFor: 'Agency provides training and guidance to officials on completing declarations',
          required: true,
          displayOrder: 4
        },
        {
          id: 'asset_3_6',
          code: '3.6',
          description: 'Automated reminders',
          whatToLookFor: 'Agency has automated system for reminders and tracking',
          required: false,
          displayOrder: 5
        },
        {
          id: 'asset_3_7',
          code: '3.7',
          description: 'Reporting to leadership',
          whatToLookFor: 'Regular reports on declaration compliance and findings are submitted to leadership',
          required: true,
          displayOrder: 6
        },
        {
          id: 'asset_3_8',
          code: '3.8',
          description: 'Continuous improvement',
          whatToLookFor: 'Agency regularly reviews and improves declaration process based on lessons learned',
          required: false,
          displayOrder: 7
        }
      ]
    }
  ],
  scoringRule: {
    type: 'percentage-range',
    percentageThresholds: DEFAULT_PERCENTAGE_THRESHOLDS
  }
};

export const AssetDeclarationConfig: React.FC<AssetDeclarationConfigProps> = ({
  indicatorId,
  initialFramework,
  onSave,
  onCancel,
  readOnly = false
}) => {
  const [framework, setFramework] = useState<MaturityFramework>(DEFAULT_ASSET_FRAMEWORK);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewPercentage, setPreviewPercentage] = useState<number>(95);

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
        setSuccess('Asset Declaration framework saved successfully');
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
    if (percentage >= 100) return { level: 3, points: 14 };
    if (percentage >= 95) return { level: 2, points: 10 };
    if (percentage >= 90) return { level: 1, points: 5 };
    return { level: 0, points: 0 };
  };

  const previewResult = calculateScore(previewPercentage);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <ArrowPathIcon className="h-8 w-8 text-blue-600 animate-spin" />
        <span className="ml-3 text-gray-600">Loading Asset Declaration configuration...</span>
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
              Asset Declaration Compliance Configuration
            </h2>
            <p className="text-gray-600">
              Configure scoring for percentage of covered officials submitting declarations on time
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <DocumentTextIcon className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-700">Total Points</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">14</span>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Maximum achievable score
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <UserGroupIcon className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-gray-700">Target</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">Covered officials</span>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              All required officials must declare
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
              &lt;90% | 90-94% | 95-99% | 100%
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <ClockIcon className="h-5 w-5 text-orange-600 mr-2" />
                <span className="text-sm font-medium text-gray-700">Weight</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">14%</span>
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
          Adjust the slider to see how different compliance percentages translate to scores
        </p>

        <div className="space-y-6">
          {/* Slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Compliance Rate:</span>
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
              <span>90%</span>
              <span>95%</span>
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
              <span className="text-2xl font-bold text-gray-900">{previewResult.points} / 14</span>
            </div>
          </div>

          {/* Score breakdown */}
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center p-2 bg-gray-100 rounded">
              <div className="text-xs text-gray-600">{'<90%'}</div>
              <div className="font-semibold">0 pts</div>
              <div className="text-xs text-gray-500">Nascent</div>
            </div>
            <div className="text-center p-2 bg-blue-100 rounded">
              <div className="text-xs text-blue-800">90-94%</div>
              <div className="font-semibold text-blue-900">5 pts</div>
              <div className="text-xs text-blue-700">Foundational</div>
            </div>
            <div className="text-center p-2 bg-green-100 rounded">
              <div className="text-xs text-green-800">95-99%</div>
              <div className="font-semibold text-green-900">10 pts</div>
              <div className="text-xs text-green-700">Established</div>
            </div>
            <div className="text-center p-2 bg-purple-100 rounded">
              <div className="text-xs text-purple-800">100%</div>
              <div className="font-semibold text-purple-900">14 pts</div>
              <div className="text-xs text-purple-700">Advanced</div>
            </div>
          </div>
        </div>
      </div>

      {/* Guidance Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">About Asset Declaration Scoring</h4>
        <p className="text-sm text-blue-800">
          This indicator measures the integrity of the asset declaration process, measured by the 
          percentage of covered officials submitting their declarations on time.
        </p>
        <ul className="mt-2 text-sm text-blue-800 list-disc list-inside">
          <li><span className="font-medium">Level 0 (Nascent):</span> Less than 90% compliance → 0 points</li>
          <li><span className="font-medium">Level 1 (Foundational):</span> 90-94% compliance → 5 points</li>
          <li><span className="font-medium">Level 2 (Established):</span> 95-99% compliance → 10 points</li>
          <li><span className="font-medium">Level 3 (Advanced):</span> 100% compliance → 14 points</li>
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

export default AssetDeclarationConfig;