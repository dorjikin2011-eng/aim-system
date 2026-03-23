// frontend/src/components/config/CodeOfConductConfig.tsx

import React, { useState, useEffect } from 'react';
import {
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  UserGroupIcon,
  AcademicCapIcon,
  ScaleIcon
} from '@heroicons/react/24/outline';
import type {
  MaturityFramework,
  MaturityLevel
} from '../../types/maturity';
import MaturityLevelEditor from './MaturityLevelEditor';
import { maturityService } from '../../services/maturityService';

interface CodeOfConductConfigProps {
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

// Default maturity framework for Code of Conduct from Revised AIMS Framework
const DEFAULT_COC_FRAMEWORK: MaturityFramework = {
  enabled: true,
  levels: [
    {
      level: 0,
      name: 'Nascent',
      description: 'No formal Code of Conduct or awareness programs',
      points: 0,
      parameters: [
        {
          id: 'coc_0_1',
          code: '0.1',
          description: 'Code of Conduct exists',
          whatToLookFor: 'Agency has not developed or adopted a formal Code of Conduct',
          required: true,
          displayOrder: 0
        },
        {
          id: 'coc_0_2',
          code: '0.2',
          description: 'Staff awareness',
          whatToLookFor: 'Staff are generally unaware of ethical expectations or reporting mechanisms',
          required: true,
          displayOrder: 1
        }
      ]
    },
    {
      level: 1,
      name: 'Foundational',
      description: 'Code exists, is accessible, and basic awareness is created',
      points: 4,
      parameters: [
        {
          id: 'coc_1_1',
          code: '1.1',
          description: 'Agency-Specific Code Exists',
          whatToLookFor: 'The agency has developed and/or adopted its own Code of Conduct tailored to its mandate, functions, and specific requirements.',
          required: true,
          displayOrder: 0
        },
        {
          id: 'coc_1_2',
          code: '1.2',
          description: 'Formal Approval',
          whatToLookFor: 'The Code has been formally approved by the Head of Agency or appropriate governing body.',
          required: true,
          displayOrder: 1
        },
        {
          id: 'coc_1_3',
          code: '1.3',
          description: 'Accessibility',
          whatToLookFor: 'The Code is accessible to all public servants in the agency (e.g., on intranet, noticeboards, shared drives).',
          required: true,
          displayOrder: 2
        },
        {
          id: 'coc_1_4',
          code: '1.4',
          description: 'New Employee Induction',
          whatToLookFor: 'New employees receive the Code and acknowledge receipt/understanding during induction.',
          required: true,
          displayOrder: 3
        },
        {
          id: 'coc_1_5',
          code: '1.5',
          description: 'Basic Awareness',
          whatToLookFor: 'Staff are generally aware that a Code of Conduct exists and outlines expected behaviors.',
          required: true,
          displayOrder: 4
        }
      ]
    },
    {
      level: 2,
      name: 'Established',
      description: 'Code is actively communicated and integrated into operations',
      points: 7,
      parameters: [
        {
          id: 'coc_2_1',
          code: '2.1',
          description: 'Regular Training Conducted',
          whatToLookFor: 'The agency conducts regular training or awareness sessions on the Code of Conduct for all staff (not just new employees).',
          required: true,
          displayOrder: 0
        },
        {
          id: 'coc_2_2',
          code: '2.2',
          description: 'Code Integrated into HR Processes',
          whatToLookFor: 'The Code is referenced in employment contracts, performance agreements, or annual performance reviews as part of behavioral expectations.',
          required: true,
          displayOrder: 1
        },
        {
          id: 'coc_2_3',
          code: '2.3',
          description: 'Standing Agenda Item',
          whatToLookFor: 'The Code of Conduct is a standing agenda item in team meetings, divisional meetings, or agency-wide gatherings, at least occasionally.',
          required: true,
          displayOrder: 2
        },
        {
          id: 'coc_2_4',
          code: '2.4',
          description: 'Management Reference Code',
          whatToLookFor: 'Managers and supervisors actively reference the Code when providing guidance on ethical issues or addressing behavioral concerns.',
          required: true,
          displayOrder: 3
        },
        {
          id: 'coc_2_5',
          code: '2.5',
          description: 'Complaint Mechanism Established',
          whatToLookFor: 'The agency has established a mechanism for receiving and handling complaints about Code breaches.',
          required: true,
          displayOrder: 4
        },
        {
          id: 'coc_2_6',
          code: '2.6',
          description: 'Basic Data Collection',
          whatToLookFor: 'The agency collects basic data on Code breaches, complaints received, and disciplinary actions taken.',
          required: true,
          displayOrder: 5
        },
        {
          id: 'coc_2_7',
          code: '2.7',
          description: 'Acknowledgment of Receipt Maintained',
          whatToLookFor: 'The agency maintains records of employee acknowledgment of the Code (initial and upon any revisions).',
          required: true,
          displayOrder: 6
        }
      ]
    },
    {
      level: 3,
      name: 'Advanced',
      description: 'Code is embedded in culture and used for organizational learning',
      points: 10,
      parameters: [
        {
          id: 'coc_3_1',
          code: '3.1',
          description: 'Proactive Risk Analysis',
          whatToLookFor: 'The agency analyzes data on Code breaches, complaints, and inquiries to identify patterns, systemic risks, or recurring issues.',
          required: true,
          displayOrder: 0
        },
        {
          id: 'coc_3_2',
          code: '3.2',
          description: 'Targeted Interventions',
          whatToLookFor: 'Based on risk analysis, the agency develops targeted interventions such as additional training for specific divisions, revised procedures, or enhanced controls.',
          required: true,
          displayOrder: 1
        },
        {
          id: 'coc_3_3',
          code: '3.3',
          description: 'Use of Case Studies',
          whatToLookFor: 'The agency uses real-world examples and anonymized case studies relevant to its work to discuss the Code in team meetings, training, or communications.',
          required: true,
          displayOrder: 2
        },
        {
          id: 'coc_3_4',
          code: '3.4',
          description: 'Staff Demonstrate Deep Understanding',
          whatToLookFor: 'Staff at all levels can articulate key provisions of the Code, understand their obligations, and apply ethical reasoning to workplace situations.',
          required: true,
          displayOrder: 3
        },
        {
          id: 'coc_3_5',
          code: '3.5',
          description: 'Ethical Advice-Seeking',
          whatToLookFor: 'Staff feel confident seeking advice on ethical dilemmas without fear of reprisal, and such advice is documented and tracked.',
          required: true,
          displayOrder: 4
        },
        {
          id: 'coc_3_6',
          code: '3.6',
          description: 'Consistent and Fair Enforcement',
          whatToLookFor: 'Disciplinary actions for Code breaches are applied consistently, with clear documentation of the inquiry process and rationale for sanctions.',
          required: true,
          displayOrder: 5
        },
        {
          id: 'coc_3_7',
          code: '3.7',
          description: 'Learning from Breaches',
          whatToLookFor: 'Breaches are used as learning opportunities—lessons are communicated to staff (anonymized) and used to strengthen systems or clarify expectations.',
          required: true,
          displayOrder: 6
        },
        {
          id: 'coc_3_8',
          code: '3.8',
          description: 'Periodic Review and Update',
          whatToLookFor: 'The Code is periodically reviewed and updated to reflect changes in mandate, emerging risks, legal developments, or lessons learned.',
          required: true,
          displayOrder: 7
        },
        {
          id: 'coc_3_9',
          code: '3.9',
          description: 'Integration with Other Integrity Systems',
          whatToLookFor: 'The Code is cross-referenced with other integrity tools—CoI declarations, gift rules, asset declarations—and used as the overarching ethical framework.',
          required: true,
          displayOrder: 8
        },
        {
          id: 'coc_3_10',
          code: '3.10',
          description: 'Reporting to Leadership',
          whatToLookFor: 'Regular reports on Code compliance, breaches, disciplinary actions, and lessons learned are submitted to agency leadership.',
          required: true,
          displayOrder: 9
        }
      ]
    }
  ],
  scoringRule: {
    type: 'maturity-level',
    levelPoints: {
      0: 0,
      1: 4,
      2: 7,
      3: 10
    }
  }
};

export const CodeOfConductConfig: React.FC<CodeOfConductConfigProps> = ({
  indicatorId,
  initialFramework,
  onSave,
  onCancel,
  readOnly = false
}) => {
  const [framework, setFramework] = useState<MaturityFramework>(DEFAULT_COC_FRAMEWORK);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
        } else {
          // Use default framework
          setFramework(DEFAULT_COC_FRAMEWORK);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load framework');
      } finally {
        setLoading(false);
      }
    };

    loadFramework();
  }, [indicatorId, initialFramework]);

  // Handle framework changes
  const handleFrameworkChange = (updatedFramework: MaturityFramework) => {
    setFramework(updatedFramework);
  };

  // Handle save
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await maturityService.updateIndicatorFramework(indicatorId, framework);
      if (response.success) {
        setSuccess('Code of Conduct framework saved successfully');
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

  // Get parameter counts by level
  const getParameterCounts = () => {
    const counts: Record<MaturityLevel, number> = {
      0: 0,
      1: 0,
      2: 0,
      3: 0
    };
    
    framework.levels.forEach(level => {
      counts[level.level] = level.parameters.length;
    });
    
    return counts;
  };

  const paramCounts = getParameterCounts();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <ArrowPathIcon className="h-8 w-8 text-blue-600 animate-spin" />
        <span className="ml-3 text-gray-600">Loading Code of Conduct configuration...</span>
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
              Code of Conduct Configuration
            </h2>
            <p className="text-gray-600">
              Configure maturity framework for Code of Conduct Awareness & Application
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
              <span className="text-lg font-semibold text-gray-900">10</span>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Maximum achievable score
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AcademicCapIcon className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-gray-700">Parameters</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">
                {Object.values(paramCounts).reduce((a, b) => a + b, 0)}
              </span>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Total assessment criteria
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <UserGroupIcon className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-sm font-medium text-gray-700">Level 3</span>
              </div>
              <span className="text-lg font-semibold text-purple-600">{paramCounts[3]}</span>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Advanced parameters
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <ScaleIcon className="h-5 w-5 text-orange-600 mr-2" />
                <span className="text-sm font-medium text-gray-700">Weight</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">10%</span>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Of total AIMS score
            </div>
          </div>
        </div>

        {/* Level Summary */}
        <div className="mt-6 grid grid-cols-4 gap-4">
          <div className="p-3 bg-gray-100 rounded-lg">
            <div className="text-xs font-medium text-gray-600">Level 0 - Nascent</div>
            <div className="text-lg font-semibold text-gray-900">{paramCounts[0]} params</div>
            <div className="text-xs text-gray-500">0 points</div>
          </div>
          <div className="p-3 bg-blue-100 rounded-lg">
            <div className="text-xs font-medium text-blue-800">Level 1 - Foundational</div>
            <div className="text-lg font-semibold text-blue-900">{paramCounts[1]} params</div>
            <div className="text-xs text-blue-700">4 points</div>
          </div>
          <div className="p-3 bg-green-100 rounded-lg">
            <div className="text-xs font-medium text-green-800">Level 2 - Established</div>
            <div className="text-lg font-semibold text-green-900">{paramCounts[2]} params</div>
            <div className="text-xs text-green-700">7 points</div>
          </div>
          <div className="p-3 bg-purple-100 rounded-lg">
            <div className="text-xs font-medium text-purple-800">Level 3 - Advanced</div>
            <div className="text-lg font-semibold text-purple-900">{paramCounts[3]} params</div>
            <div className="text-xs text-purple-700">10 points</div>
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

      {/* Maturity Level Editor */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900">Maturity Levels Configuration</h3>
          <p className="text-sm text-gray-500">
            Define the parameters for each maturity level of Code of Conduct implementation
          </p>
        </div>

        <MaturityLevelEditor
          framework={framework}
          onChange={handleFrameworkChange}
          onSave={handleSave}
          onCancel={onCancel}
          readOnly={readOnly}
          showValidation={true}
        />
      </div>

      {/* Guidance Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">About Code of Conduct Scoring</h4>
        <p className="text-sm text-blue-800">
          The Code of Conduct indicator measures how well the agency's Code is more than just a document. 
          It assesses its visibility, integration into people management, and its use as a living guide for 
          ethical decision-making. The maturity levels progress from basic existence (Level 1) to cultural 
          embedding and organizational learning (Level 3).
        </p>
        <ul className="mt-2 text-sm text-blue-800 list-disc list-inside">
          <li><span className="font-medium">Level 1 (Foundational):</span> Code exists and is accessible</li>
          <li><span className="font-medium">Level 2 (Established):</span> Code is actively communicated and integrated into operations</li>
          <li><span className="font-medium">Level 3 (Advanced):</span> Code is embedded in culture and used for learning</li>
        </ul>
      </div>

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

export default CodeOfConductConfig;