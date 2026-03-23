// frontend/src/components/config/CorruptionCasesConfig.tsx

import React, { useState, useEffect } from 'react';
import {
  ScaleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  //ChartBarIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ShieldExclamationIcon
} from '@heroicons/react/24/outline';
import type {
  MaturityFramework,
  SeverityWeight,
  SeverityMapping
} from '../../types/maturity';
import ScoringRuleConfig from './ScoringRuleConfig';
import { maturityService } from '../../services/maturityService';

interface CorruptionCasesConfigProps {
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

// Default severity weights from Revised AIMS Framework
const DEFAULT_SEVERITY_WEIGHTS: SeverityWeight[] = [
  { 
    caseType: 'conviction', 
    points: 3, 
    description: 'Criminal conviction in court' 
  },
  { 
    caseType: 'prosecution', 
    points: 2, 
    description: 'Referred to OAG for prosecution' 
  },
  { 
    caseType: 'admin_action', 
    points: 1, 
    description: 'ACC-confirmed administrative action' 
  }
];

// Default severity mapping from Revised AIMS Framework
const DEFAULT_SEVERITY_MAPPING: SeverityMapping[] = [
  { minScore: 0, maxScore: 0, level: 3, points: 20 },
  { minScore: 1, maxScore: 2, level: 2, points: 12 },
  { minScore: 3, maxScore: 4, level: 1, points: 6 },
  { minScore: 5, maxScore: Infinity, level: 0, points: 0 }
];

// Default framework for Corruption Cases
const DEFAULT_CASES_FRAMEWORK: MaturityFramework = {
  enabled: true,
  levels: [
    {
      level: 0,
      name: 'Nascent',
      description: 'Severity score of 5 or more - critical concern',
      points: 0,
      parameters: [
        {
          id: 'cases_0_1',
          code: '0.1',
          description: 'High severity score',
          whatToLookFor: 'Agency has severity score of 5 or more points from cases',
          required: true,
          displayOrder: 0
        },
        {
          id: 'cases_0_2',
          code: '0.2',
          description: 'Multiple serious cases',
          whatToLookFor: 'Multiple convictions or prosecutions in the fiscal year',
          required: true,
          displayOrder: 1
        }
      ]
    },
    {
      level: 1,
      name: 'Foundational',
      description: 'Severity score of 3-4 - moderate concern',
      points: 6,
      parameters: [
        {
          id: 'cases_1_1',
          code: '1.1',
          description: 'Moderate severity score',
          whatToLookFor: 'Agency has severity score of 3-4 points from cases',
          required: true,
          displayOrder: 0
        },
        {
          id: 'cases_1_2',
          code: '1.2',
          description: 'Cases documented',
          whatToLookFor: 'All cases are properly documented and tracked',
          required: true,
          displayOrder: 1
        },
        {
          id: 'cases_1_3',
          code: '1.3',
          description: 'Cooperation with ACC',
          whatToLookFor: 'Agency cooperates with ACC on investigations',
          required: true,
          displayOrder: 2
        },
        {
          id: 'cases_1_4',
          code: '1.4',
          description: 'Disciplinary action taken',
          whatToLookFor: 'Administrative action taken where appropriate',
          required: true,
          displayOrder: 3
        }
      ]
    },
    {
      level: 2,
      name: 'Established',
      description: 'Severity score of 1-2 - minimal concern',
      points: 12,
      parameters: [
        {
          id: 'cases_2_1',
          code: '2.1',
          description: 'Low severity score',
          whatToLookFor: 'Agency has severity score of 1-2 points from cases',
          required: true,
          displayOrder: 0
        },
        {
          id: 'cases_2_2',
          code: '2.2',
          description: 'Timely action',
          whatToLookFor: 'Agency takes timely action on all cases',
          required: true,
          displayOrder: 1
        },
        {
          id: 'cases_2_3',
          code: '2.3',
          description: 'Preventive measures',
          whatToLookFor: 'Agency implements measures to prevent recurrence',
          required: true,
          displayOrder: 2
        },
        {
          id: 'cases_2_4',
          code: '2.4',
          description: 'Reporting to leadership',
          whatToLookFor: 'Regular reports on cases submitted to leadership',
          required: true,
          displayOrder: 3
        },
        {
          id: 'cases_2_5',
          code: '2.5',
          description: 'Staff awareness',
          whatToLookFor: 'Staff are aware of consequences of corruption',
          required: false,
          displayOrder: 4
        },
        {
          id: 'cases_2_6',
          code: '2.6',
          description: 'Case tracking system',
          whatToLookFor: 'Agency maintains comprehensive case tracking system',
          required: true,
          displayOrder: 5
        }
      ]
    },
    {
      level: 3,
      name: 'Advanced',
      description: 'Severity score of 0 - no cases',
      points: 20,
      parameters: [
        {
          id: 'cases_3_1',
          code: '3.1',
          description: 'Zero severity score',
          whatToLookFor: 'Agency has no substantiated corruption cases in fiscal year',
          required: true,
          displayOrder: 0
        },
        {
          id: 'cases_3_2',
          code: '3.2',
          description: 'Strong preventive culture',
          whatToLookFor: 'Agency demonstrates strong corruption prevention culture',
          required: true,
          displayOrder: 1
        },
        {
          id: 'cases_3_3',
          code: '3.3',
          description: 'Early warning system',
          whatToLookFor: 'Agency has systems to detect and address issues early',
          required: true,
          displayOrder: 2
        },
        {
          id: 'cases_3_4',
          code: '3.4',
          description: 'Learning from others',
          whatToLookFor: 'Agency learns from cases in other agencies to strengthen prevention',
          required: true,
          displayOrder: 3
        },
        {
          id: 'cases_3_5',
          code: '3.5',
          description: 'Whistleblower protection',
          whatToLookFor: 'Agency has strong whistleblower protection mechanisms',
          required: true,
          displayOrder: 4
        },
        {
          id: 'cases_3_6',
          code: '3.6',
          description: 'Risk assessments',
          whatToLookFor: 'Regular corruption risk assessments conducted',
          required: true,
          displayOrder: 5
        },
        {
          id: 'cases_3_7',
          code: '3.7',
          description: 'Integrity training',
          whatToLookFor: 'All staff complete corruption prevention training',
          required: false,
          displayOrder: 6
        },
        {
          id: 'cases_3_8',
          code: '3.8',
          description: 'Public reporting',
          whatToLookFor: 'Agency publishes corruption prevention achievements',
          required: false,
          displayOrder: 7
        }
      ]
    }
  ],
  scoringRule: {
    type: 'severity-index',
    severityWeights: DEFAULT_SEVERITY_WEIGHTS,
    severityMapping: DEFAULT_SEVERITY_MAPPING
  }
};

export const CorruptionCasesConfig: React.FC<CorruptionCasesConfigProps> = ({
  indicatorId,
  initialFramework,
  onSave,
  onCancel,
  readOnly = false
}) => {
  const [framework, setFramework] = useState<MaturityFramework>(DEFAULT_CASES_FRAMEWORK);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Preview state
  const [previewConvictions, setPreviewConvictions] = useState<number>(0);
  const [previewProsecutions, setPreviewProsecutions] = useState<number>(0);
  const [previewAdminActions, setPreviewAdminActions] = useState<number>(0);

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
        setSuccess('Corruption Cases framework saved successfully');
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

  // Calculate severity score
  const calculateSeverityScore = (): number => {
    const weights = framework.scoringRule.severityWeights || DEFAULT_SEVERITY_WEIGHTS;
    
    const convictionWeight = weights.find(w => w.caseType === 'conviction')?.points || 3;
    const prosecutionWeight = weights.find(w => w.caseType === 'prosecution')?.points || 2;
    const adminWeight = weights.find(w => w.caseType === 'admin_action')?.points || 1;
    
    return (previewConvictions * convictionWeight) +
           (previewProsecutions * prosecutionWeight) +
           (previewAdminActions * adminWeight);
  };

  // Calculate score based on severity
  const calculateScore = (): { level: number; points: number; severityScore: number } => {
    const severityScore = calculateSeverityScore();
    const mapping = framework.scoringRule.severityMapping || DEFAULT_SEVERITY_MAPPING;
    
    const matching = mapping.find(m => 
      severityScore >= m.minScore && severityScore <= m.maxScore
    );
    
    if (matching && matching.level !== undefined && matching.points !== undefined) {
      return { 
        level: matching.level, 
        points: matching.points,
        severityScore 
      };
    }
    
    // Fallback
    if (severityScore === 0) return { level: 3, points: 20, severityScore };
    if (severityScore <= 2) return { level: 2, points: 12, severityScore };
    if (severityScore <= 4) return { level: 1, points: 6, severityScore };
    return { level: 0, points: 0, severityScore };
  };

  const previewResult = calculateScore();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <ArrowPathIcon className="h-8 w-8 text-blue-600 animate-spin" />
        <span className="ml-3 text-gray-600">Loading Corruption Cases configuration...</span>
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
              Corruption Cases Configuration
            </h2>
            <p className="text-gray-600">
              Configure severity scoring for substantiated corruption cases
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <ScaleIcon className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-700">Max Points</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">20</span>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              For zero cases
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <ShieldExclamationIcon className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-gray-700">Conviction</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">3 pts</span>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Per case
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <DocumentTextIcon className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-sm font-medium text-gray-700">Prosecution</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">2 pts</span>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Per case
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <UserGroupIcon className="h-5 w-5 text-orange-600 mr-2" />
                <span className="text-sm font-medium text-gray-700">Admin Action</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">1 pt</span>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Per case
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
          <h3 className="text-lg font-medium text-gray-900">Severity Scoring Configuration</h3>
          <p className="text-sm text-gray-500">
            Define weights for different case types and map severity scores to levels
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
          Adjust case counts to see how different scenarios translate to scores
        </p>

        <div className="space-y-6">
          {/* Case Count Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Convictions (3 pts each)
              </label>
              <input
                type="number"
                min="0"
                value={previewConvictions}
                onChange={(e) => setPreviewConvictions(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                disabled={readOnly}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prosecutions (2 pts each)
              </label>
              <input
                type="number"
                min="0"
                value={previewProsecutions}
                onChange={(e) => setPreviewProsecutions(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                disabled={readOnly}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Admin Actions (1 pt each)
              </label>
              <input
                type="number"
                min="0"
                value={previewAdminActions}
                onChange={(e) => setPreviewAdminActions(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                disabled={readOnly}
              />
            </div>
          </div>

          {/* Severity Score Display */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium text-gray-700">Total Severity Score:</span>
              <span className="text-3xl font-bold text-blue-600">{previewResult.severityScore}</span>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Calculation: ({previewConvictions} × 3) + ({previewProsecutions} × 2) + ({previewAdminActions} × 1) = {previewResult.severityScore}
            </div>
          </div>

          {/* Result */}
          <div className={`p-6 rounded-lg ${
            previewResult.level === 0 ? 'bg-gray-100' :
            previewResult.level === 1 ? 'bg-blue-100' :
            previewResult.level === 2 ? 'bg-green-100' : 'bg-purple-100'
          }`}>
            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm font-medium text-gray-700">Result:</span>
                <span className="ml-2 text-xl font-semibold">
                  Level {previewResult.level} - {
                    previewResult.level === 0 ? 'Nascent' :
                    previewResult.level === 1 ? 'Foundational' :
                    previewResult.level === 2 ? 'Established' : 'Advanced'
                  }
                </span>
              </div>
              <span className="text-3xl font-bold text-gray-900">{previewResult.points} / 20</span>
            </div>
          </div>

          {/* Score breakdown */}
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center p-3 bg-gray-100 rounded">
              <div className="text-xs text-gray-600">Score ≥5</div>
              <div className="font-semibold">0 pts</div>
              <div className="text-xs text-gray-500">Nascent</div>
            </div>
            <div className="text-center p-3 bg-blue-100 rounded">
              <div className="text-xs text-blue-800">Score 3-4</div>
              <div className="font-semibold text-blue-900">6 pts</div>
              <div className="text-xs text-blue-700">Foundational</div>
            </div>
            <div className="text-center p-3 bg-green-100 rounded">
              <div className="text-xs text-green-800">Score 1-2</div>
              <div className="font-semibold text-green-900">12 pts</div>
              <div className="text-xs text-green-700">Established</div>
            </div>
            <div className="text-center p-3 bg-purple-100 rounded">
              <div className="text-xs text-purple-800">Score 0</div>
              <div className="font-semibold text-purple-900">20 pts</div>
              <div className="text-xs text-purple-700">Advanced</div>
            </div>
          </div>
        </div>
      </div>

      {/* Guidance Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">About Corruption Cases Scoring</h4>
        <p className="text-sm text-blue-800">
          This indicator measures the weighted severity of substantiated corruption cases involving 
          agency staff within the Fiscal Year. A lower severity score yields a higher AIMS score.
        </p>
        <ul className="mt-2 text-sm text-blue-800 list-disc list-inside">
          <li><span className="font-medium">Conviction:</span> 3 points per case</li>
          <li><span className="font-medium">Prosecution/OAG referral:</span> 2 points per case</li>
          <li><span className="font-medium">ACC-confirmed administrative action:</span> 1 point per case</li>
        </ul>
        <p className="mt-2 text-sm text-blue-800">
          <span className="font-medium">Scoring:</span> Severity Score = 0 → 20 pts | 1-2 → 12 pts | 3-4 → 6 pts | ≥5 → 0 pts
        </p>
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

export default CorruptionCasesConfig;