// frontend/src/pages/admin/ConfigPage.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HomeIcon,
  CogIcon,
  DocumentTextIcon,
  ChartBarIcon,
  BeakerIcon,
  DocumentDuplicateIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  PencilIcon,
  PlusIcon,
  CalculatorIcon,
  TableCellsIcon,
  VariableIcon,
  ScaleIcon
} from '@heroicons/react/24/outline';
import IndicatorManager from '../../components/config/IndicatorManager';
import ParameterEditor from '../../components/config/ParameterEditor';
import FormBuilder from '../../components/config/FormBuilder';
import DynamicForm from '../../components/forms/DynamicForm';
import { configService } from '../../services/configService';
import { maturityService } from '../../services/maturityService';

// New maturity framework components
import ICCSConfig from '../../components/config/ICCSConfig';
import CodeOfConductConfig from '../../components/config/CodeOfConductConfig';
import CapacityBuildingConfig from '../../components/config/CapacityBuildingConfig';
import AssetDeclarationConfig from '../../components/config/AssetDeclarationConfig';
import CorruptionCasesConfig from '../../components/config/CorruptionCasesConfig';
import MaturityLevelEditor from '../../components/config/MaturityLevelEditor';
import { ScoringRulesTab } from '../../components/config/ScoringRulesTab';

import type { IntegrityThresholds, ApiResponse } from '../../types/config';

import type {
  FormTemplate,
  IndicatorDefinition,
  ConfigurationVersion,
  SystemConfigItem,
  TemplateType,
  ValidationResult,
  IndicatorCategory
} from '../../types/config';
import type {
  MaturityFramework,
  SubsystemDefinition,
} from '../../types/maturity';

type TabType = 'weights' | 'indicators' | 'parameters' | 'scoring-rules' | 'forms' | 'versions' | 'test' | 'configuration' | 'maturity';

// Configuration Version Manager Component
const ConfigurationVersionManager: React.FC<{
  versions: ConfigurationVersion[];
  onCreateVersion: (versionData: any) => Promise<void>;
  onApplyVersion: (versionId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  loading: boolean;
}> = ({
  versions,
  onCreateVersion,
  onApplyVersion,
  onRefresh,
  loading
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newVersion, setNewVersion] = useState({
    versionName: '',
    versionNumber: '',
    description: ''
  });

  const handleCreateVersion = async () => {
    if (!newVersion.versionName || !newVersion.versionNumber) {
      alert('Please fill in version name and number');
      return;
    }

    try {
      await onCreateVersion({
        version_name: newVersion.versionName,
        version_number: newVersion.versionNumber,
        description: newVersion.description,
        is_active: false,
        created_by: 'admin'
      });
      setShowCreateForm(false);
      setNewVersion({ versionName: '', versionNumber: '', description: '' });
    } catch (error) {
      console.error('Failed to create version:', error);
      alert('Failed to create version. Please check console for details.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Configuration Versions</h2>
          <p className="text-gray-600">Manage and apply configuration snapshots</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowPathIcon className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create New Version
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Configuration Version</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Version Name *
              </label>
              <input
                type="text"
                value={newVersion.versionName}
                onChange={(e) => setNewVersion(prev => ({ ...prev, versionName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g., AIMS Baseline Configuration"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Version Number *
              </label>
              <input
                type="text"
                value={newVersion.versionNumber}
                onChange={(e) => setNewVersion(prev => ({ ...prev, versionNumber: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g., 1.0.0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={newVersion.description}
                onChange={(e) => setNewVersion(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
                placeholder="Describe what this version includes..."
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateVersion}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create Version
              </button>
            </div>
          </div>
        </div>
      )}

      {versions.length > 0 ? (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Available Versions</h3>
              <div className="text-sm text-gray-500">
                {versions.length} version(s)
              </div>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {versions.map(version => (
              <div key={version.id} className="p-6 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">
                      {version.versionName}
                      {version.isActive && (
                        <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          Active
                        </span>
                      )}
                    </h4>
                    <p className="mt-1 text-sm text-gray-600">Version: {version.versionNumber}</p>
                    {version.description && (
                      <p className="mt-1 text-sm text-gray-600">{version.description}</p>
                    )}
                    <div className="mt-2 text-sm text-gray-500">
                      <span>Created: {new Date(version.createdAt).toLocaleDateString()}</span>
                      {version.appliedAt && (
                        <span className="ml-4">
                          Applied: {new Date(version.appliedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    {!version.isActive && (
                      <button
                        onClick={() => onApplyVersion(version.id!)}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        disabled={loading}
                      >
                        Apply
                      </button>
                    )}
                    <button
                      onClick={() => window.alert(`Version ID: ${version.id}\nCreated: ${version.createdAt}\nStatus: ${version.isActive ? 'Active' : 'Inactive'}`)}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <DocumentDuplicateIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No configuration versions created yet</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create First Version
          </button>
        </div>
      )}
    </div>
  );
};

// Parameters Tab Component
const ParametersTab: React.FC<{
  indicators: IndicatorDefinition[];
  onParameterUpdate: () => Promise<void>;
  loading: boolean;
}> = ({ indicators, onParameterUpdate, loading }) => {
  const [selectedIndicator, setSelectedIndicator] = useState<IndicatorDefinition | null>(null);
  const [selectedParameter, setSelectedParameter] = useState<any | null>(null);
  const [editingParameter, setEditingParameter] = useState<boolean>(false);

  const allParameters = indicators.flatMap(indicator =>
    (indicator.parameters || []).map(param => ({
      ...param,
      indicatorId: indicator.id,
      indicatorName: indicator.name
    }))
  );

  const handleSaveParameter = async (parameter: any) => {
    try {
      const indicator = selectedIndicator || indicators.find(ind =>
        ind.parameters?.some(p => p.id === parameter.id)
      );

      if (indicator) {
        const updatedParameters = indicator.parameters?.map(p =>
          p.id === parameter.id ? parameter : p
        ) || [parameter];
        
        const updateData = {
          parameters: updatedParameters,
          updatedBy: 'admin'
        };

        await configService.updateIndicator(indicator.id, updateData);
        await onParameterUpdate();
        setEditingParameter(false);
        setSelectedParameter(null);
      }
    } catch (error) {
      console.error('Failed to save parameter:', error);
      alert('Failed to save parameter. Please check console for details.');
    }
  };

  const handleDeleteParameter = async (parameterId?: string) => {
    if (!parameterId || !selectedIndicator) return;
    
    if (window.confirm('Are you sure you want to delete this parameter?')) {
      try {
        const updatedParameters = selectedIndicator.parameters?.filter(p => p.id !== parameterId) || [];
        
        await configService.updateIndicator(selectedIndicator.id, {
          parameters: updatedParameters,
          updatedBy: 'admin'
        });
        
        await onParameterUpdate();
        setEditingParameter(false);
        setSelectedParameter(null);
      } catch (error) {
        console.error('Failed to delete parameter:', error);
        alert('Failed to delete parameter. Please check console for details.');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Parameter Management</h2>
        <p className="text-gray-600 mb-6">
          Manage parameters across all indicators. Parameters are the data points collected for scoring.
        </p>

        {editingParameter ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <button
                onClick={() => {
                  setEditingParameter(false);
                  setSelectedParameter(null);
                }}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                ← Back to Parameters List
              </button>
              <div className="text-sm text-gray-500">
                {selectedParameter ? 'Editing Parameter' : 'Creating New Parameter'}
              </div>
            </div>
            <ParameterEditor
              parameter={selectedParameter || undefined}
              onSave={handleSaveParameter}
              onCancel={() => {
                setEditingParameter(false);
                setSelectedParameter(null);
              }}
              onDelete={selectedParameter ? handleDeleteParameter : undefined}
            />
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-4">
                <div>
                  <span className="text-sm font-medium text-gray-700">Total Parameters:</span>
                  <span className="ml-2 text-lg font-semibold text-gray-900">
                    {allParameters.length}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">Indicators:</span>
                  <span className="ml-2 text-lg font-semibold text-gray-900">
                    {indicators.length}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setEditingParameter(true);
                  setSelectedParameter(null);
                  setSelectedIndicator(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                New Parameter
              </button>
            </div>

            <div className="space-y-6">
              {indicators.map(indicator => (
                <div key={indicator.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {indicator.name}
                        </h3>
                        <p className="text-sm text-gray-600">{indicator.description}</p>
                      </div>
                      <span className="text-sm text-gray-500">
                        {indicator.parameters?.length || 0} parameters
                      </span>
                    </div>
                  </div>

                  {indicator.parameters && indicator.parameters.length > 0 ? (
                    <div className="divide-y divide-gray-200">
                      {indicator.parameters.map(parameter => (
                        <div key={parameter.id} className="px-6 py-4 hover:bg-gray-50">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="flex items-center space-x-3">
                                <h4 className="font-medium text-gray-900">{parameter.label}</h4>
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  {parameter.code}
                                </span>
                                <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                                  {parameter.type}
                                </span>
                                {parameter.required && (
                                  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                                    Required
                                  </span>
                                )}
                              </div>
                              {parameter.description && (
                                <p className="mt-1 text-sm text-gray-600">{parameter.description}</p>
                              )}
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedParameter(parameter);
                                  setSelectedIndicator(indicator);
                                  setEditingParameter(true);
                                }}
                                className="text-blue-600 hover:text-blue-900"
                                title="Edit Parameter"
                              >
                                <PencilIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleDeleteParameter(parameter.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Delete Parameter"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-6 py-8 text-center">
                      <VariableIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500">No parameters defined for this indicator</p>
                      <button
                        onClick={() => {
                          setSelectedIndicator(indicator);
                          setEditingParameter(true);
                        }}
                        className="mt-3 text-sm text-blue-600 hover:text-blue-800"
                      >
                        Add Parameter
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Maturity Framework Tab Component
const MaturityFrameworkTab: React.FC<{
  indicators: IndicatorDefinition[];
  onFrameworkUpdate: () => Promise<void>;
  loading: boolean;
}> = ({ indicators, onFrameworkUpdate, loading }) => {
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<string | null>(null);
  const [maturityFramework, setMaturityFramework] = useState<MaturityFramework | null>(null);
  const [subsystems, setSubsystems] = useState<SubsystemDefinition[]>([]);
  const [loadingFramework, setLoadingFramework] = useState(false);

  const selectedIndicator = indicators.find(i => i.id === selectedIndicatorId);

  useEffect(() => {
    if (!selectedIndicatorId) return;

    const loadFramework = async () => {
      setLoadingFramework(true);
      try {
        if (selectedIndicatorId === 'ind_iccs_v3') {
          const response = await maturityService.getSubsystems(selectedIndicatorId);
          console.log('ICCS subsystems response:', response);
          if (response.success && response.data) {
            setSubsystems(response.data);
          }
        } else {
          const response = await maturityService.getIndicatorFramework(selectedIndicatorId);
          console.log(`Framework for ${selectedIndicatorId}:`, response);
          console.log(`Framework data:`, response.data);
          
          if (response.success && response.data) {
            let frameworkData = response.data;
            
            if (!frameworkData.levels || !frameworkData.scoringRule) {
              console.log('Transforming framework data for', selectedIndicatorId);
              
              if (selectedIndicatorId === 'ind_ad_v3') {
                frameworkData = {
                  enabled: true,
                  levels: [
                    { level: 0, name: 'Nascent', points: 0, description: '<90% compliance', parameters: [] },
                    { level: 1, name: 'Foundational', points: 5, description: '90-94% compliance', parameters: [] },
                    { level: 2, name: 'Established', points: 10, description: '95-99% compliance', parameters: [] },
                    { level: 3, name: 'Advanced', points: 14, description: '100% compliance', parameters: [] }
                  ],
                  scoringRule: {
                    type: 'percentage-range',
                    percentageThresholds: [
                      { min: 0, max: 89, level: 0, points: 0 },
                      { min: 90, max: 94, level: 1, points: 5 },
                      { min: 95, max: 99, level: 2, points: 10 },
                      { min: 100, max: 100, level: 3, points: 14 }
                    ]
                  }
                };
              }
              else if (selectedIndicatorId === 'ind_training_v3') {
                frameworkData = {
                  enabled: true,
                  levels: [
                    { level: 0, name: 'Nascent', points: 0, description: '<50% completion', parameters: [] },
                    { level: 1, name: 'Foundational', points: 10, description: '50-69% completion', parameters: [] },
                    { level: 2, name: 'Established', points: 18, description: '70-84% completion', parameters: [] },
                    { level: 3, name: 'Advanced', points: 24, description: '≥85% completion', parameters: [] }
                  ],
                  scoringRule: {
                    type: 'percentage-range',
                    percentageThresholds: [
                      { min: 0, max: 49, level: 0, points: 0 },
                      { min: 50, max: 69, level: 1, points: 10 },
                      { min: 70, max: 84, level: 2, points: 18 },
                      { min: 85, max: 100, level: 3, points: 24 }
                    ]
                  }
                };
              }
              else if (selectedIndicatorId === 'ind_cases_v3') {
                frameworkData = {
                  enabled: true,
                  levels: [
                    { level: 0, name: 'Nascent', points: 0, description: '≥5 cases', parameters: [] },
                    { level: 1, name: 'Foundational', points: 6, description: '3-4 cases', parameters: [] },
                    { level: 2, name: 'Established', points: 12, description: '1-2 cases', parameters: [] },
                    { level: 3, name: 'Advanced', points: 20, description: '0 cases', parameters: [] }
                  ],
                  scoringRule: {
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
                      { minScore: 5, maxScore: 999, level: 0, points: 0 }
                    ]
                  }
                };
              }
              else if (selectedIndicatorId === 'ind_coc_v3') {
                frameworkData = {
                  enabled: true,
                  levels: [
                    { level: 0, name: 'Nascent', points: 0, description: 'No active promotion', parameters: [] },
                    { level: 1, name: 'Foundational', points: 4, description: 'Code exists and accessible', parameters: [] },
                    { level: 2, name: 'Established', points: 7, description: 'Actively communicated', parameters: [] },
                    { level: 3, name: 'Advanced', points: 10, description: 'Embedded in culture', parameters: [] }
                  ],
                  scoringRule: {
                    type: 'maturity-level',
                    levelPoints: { 0: 0, 1: 4, 2: 7, 3: 10 }
                  }
                };
              }
            }
            
            setMaturityFramework(frameworkData);
          } else {
            setMaturityFramework(null);
          }
        }
      } catch (error) {
        console.error('Failed to load maturity framework:', error);
      } finally {
        setLoadingFramework(false);
      }
    };

    loadFramework();
  }, [selectedIndicatorId]);

  const handleFrameworkChange = (updatedFramework: MaturityFramework) => {
    setMaturityFramework(updatedFramework);
  };

  const handleFrameworkSave = async () => {
    if (!selectedIndicatorId) return;

    try {
      if (selectedIndicatorId === 'ind_iccs_v3') {
        await maturityService.updateSubsystems(selectedIndicatorId, subsystems);
      } else if (maturityFramework) {
        await maturityService.updateIndicatorFramework(selectedIndicatorId, maturityFramework);
      }
      await onFrameworkUpdate();
      alert('Maturity framework saved successfully');
    } catch (error) {
      console.error('Failed to save maturity framework:', error);
      alert('Failed to save maturity framework');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Maturity Framework Configuration</h2>
        <p className="text-gray-600 mb-6">
          Configure maturity levels, parameters, and scoring rules for each indicator based on the Revised AIMS Framework Ver-3.
        </p>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Indicator
          </label>
          <select
            value={selectedIndicatorId || ''}
            onChange={(e) => setSelectedIndicatorId(e.target.value || null)}
            className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Choose an indicator...</option>
            {indicators.map(indicator => (
              <option key={indicator.id} value={indicator.id}>
                {indicator.name} ({indicator.weight}%)
              </option>
            ))}
          </select>
        </div>

        {selectedIndicatorId && selectedIndicator && (
          <div className="mt-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-medium text-blue-900 mb-2">{selectedIndicator.name}</h3>
              <p className="text-blue-800">{selectedIndicator.description}</p>
              <div className="mt-2 flex items-center space-x-4">
                <span className="text-sm bg-blue-200 text-blue-800 px-2 py-1 rounded">
                  Weight: {selectedIndicator.weight}%
                </span>
                <span className="text-sm bg-blue-200 text-blue-800 px-2 py-1 rounded">
                  Max Score: {selectedIndicator.maxScore}
                </span>
              </div>
            </div>

            {loadingFramework && (
              <div className="flex justify-center items-center py-12">
                <ArrowPathIcon className="h-8 w-8 text-blue-600 animate-spin" />
              </div>
            )}

            {!loadingFramework && selectedIndicatorId === 'ind_iccs_v3' && (
              <ICCSConfig
                indicatorId={selectedIndicatorId}
                initialSubsystems={subsystems}
                onSave={() => handleFrameworkSave()}
                onCancel={() => setSelectedIndicatorId(null)}
                readOnly={false}
              />
            )}

            {!loadingFramework && selectedIndicatorId === 'ind_coc_v3' && (
              <CodeOfConductConfig
                indicatorId={selectedIndicatorId}
                initialFramework={maturityFramework || undefined}
                onSave={() => handleFrameworkSave()}
                onCancel={() => setSelectedIndicatorId(null)}
                readOnly={false}
              />
            )}

            {!loadingFramework && selectedIndicatorId === 'ind_training_v3' && (
              <CapacityBuildingConfig
                indicatorId={selectedIndicatorId}
                initialFramework={maturityFramework || undefined}
                onSave={() => handleFrameworkSave()}
                onCancel={() => setSelectedIndicatorId(null)}
                readOnly={false}
              />
            )}

            {!loadingFramework && selectedIndicatorId === 'ind_ad_v3' && (
              <AssetDeclarationConfig
                indicatorId={selectedIndicatorId}
                initialFramework={maturityFramework || undefined}
                onSave={() => handleFrameworkSave()}
                onCancel={() => setSelectedIndicatorId(null)}
                readOnly={false}
              />
            )}

            {!loadingFramework && selectedIndicatorId === 'ind_cases_v3' && (
              <CorruptionCasesConfig
                indicatorId={selectedIndicatorId}
                initialFramework={maturityFramework || undefined}
                onSave={() => handleFrameworkSave()}
                onCancel={() => setSelectedIndicatorId(null)}
                readOnly={false}
              />
            )}

            {!loadingFramework && 
             selectedIndicatorId !== 'ind_iccs_v3' && 
             selectedIndicatorId !== 'ind_coc_v3' && 
             selectedIndicatorId !== 'ind_training_v3' && 
             selectedIndicatorId !== 'ind_ad_v3' && 
             selectedIndicatorId !== 'ind_cases_v3' && (
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Generic Maturity Framework</h3>
                {maturityFramework ? (
                  <MaturityLevelEditor
                    framework={maturityFramework}
                    onChange={handleFrameworkChange}
                    onSave={handleFrameworkSave}
                    onCancel={() => setSelectedIndicatorId(null)}
                    showValidation={true}
                  />
                ) : (
                  <button
                    onClick={() => {
                      const defaultFramework: MaturityFramework = {
                        enabled: true,
                        levels: [
                          { level: 0, name: 'Nascent', description: 'No systems established', points: 0, parameters: [] },
                          { level: 1, name: 'Foundational', description: 'Basic systems exist', points: 0, parameters: [] },
                          { level: 2, name: 'Established', description: 'Systems operational', points: 0, parameters: [] },
                          { level: 3, name: 'Advanced', description: 'Systems embedded', points: 0, parameters: [] }
                        ],
                        scoringRule: { type: 'maturity-level', levelPoints: { 0: 0, 1: 0, 2: 0, 3: 0 } }
                      };
                      setMaturityFramework(defaultFramework);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Initialize Maturity Framework
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {!selectedIndicatorId && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <ScaleIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Select an indicator to configure its maturity framework</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default function ConfigPage() {
  const emptyInitialData = React.useMemo(() => ({}), []);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('weights');
  const [systemConfig, setSystemConfig] = useState<Record<string, any>>({});
  const [indicators, setIndicators] = useState<IndicatorDefinition[]>([]);
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [configurationVersions, setConfigurationVersions] = useState<ConfigurationVersion[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);

  useEffect(() => {
    loadInitialData();
  }, [activeTab]);

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (activeTab === 'weights' || activeTab === 'configuration') {
        const configRes = await configService.getSystemConfig();
        if (configRes.success) setSystemConfig(configRes.data || {});

        const configItemsRes = await configService.getSystemConfig();
        if (configItemsRes.success && configItemsRes.data) {
          const configItems = configItemsRes.data;
          const configObj: Record<string, any> = {};
          Object.entries(configItems).forEach(([key, value]) => {
            if (typeof value === 'string' && !isNaN(Number(value))) {
              configObj[key] = Number(value);
            } else if (value === 'true' || value === 'false') {
              configObj[key] = value === 'true';
            } else {
              configObj[key] = value;
            }
          });
          setSystemConfig(prev => ({ ...prev, ...configObj }));
        }
      }

      if (activeTab === 'indicators' || activeTab === 'weights' || activeTab === 'parameters' || activeTab === 'scoring-rules' || activeTab === 'maturity' || activeTab === 'forms') {
        const indicatorsRes = await configService.getIndicators({
          includeParameters: true,
          includeRules: true,
          activeOnly: false
        });
        
        if (indicatorsRes.success) {
          const fixedIndicators = (indicatorsRes.data || []).map(indicator => {
            const isActiveValue = (indicator as any).isActive;
            return {
              ...indicator,
              isActive: isActiveValue === true || isActiveValue === 1 || isActiveValue === '1'
            };
          });
          setIndicators(fixedIndicators);
        } else {
          console.error('Failed to load indicators:', indicatorsRes.error);
          setError(indicatorsRes.error || 'Failed to load indicators');
        }
      }

      if (activeTab === 'forms' || activeTab === 'test') {
        try {
          const templatesRes = await configService.getFormTemplates();
          if (templatesRes.success) {
            setTemplates(templatesRes.data || []);
          } else {
            console.error('Failed to load templates:', templatesRes.error);
            setError(templatesRes.error || 'Failed to load templates');
          }
        } catch (templateError) {
          console.error('Error loading templates:', templateError);
          setTemplates([]);
        }
      }

      if (activeTab === 'versions') {
        try {
          const versionsRes = await configService.getConfigurationVersions();
          if (versionsRes.success) {
            setConfigurationVersions(versionsRes.data || []);
          } else {
            console.error('Failed to load configuration versions:', versionsRes.error);
            setError(versionsRes.error || 'Failed to load configuration versions');
          }
        } catch (versionError) {
          console.error('Error loading configuration versions:', versionError);
          setConfigurationVersions([]);
        }
      }
    } catch (err: any) {
      console.error('Failed to load config data:', err);
      setError(err.message || 'Unable to load system configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (field: string, value: any) => {
    setSystemConfig(prev => ({
      ...prev,
      [field]: value
    }));
    setSuccess(null);
  };

  const getTotalWeight = () => {
    return indicators
      .filter(ind => ind.isActive)
      .reduce((total, indicator) => total + (indicator.weight || 0), 0);
  };

  const handleSystemConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!systemConfig) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const configItems: SystemConfigItem[] = [];

      configItems.push({
        configKey: 'high_integrity_min',
        configValue: String(systemConfig.high_integrity_min || 80),
        configType: 'number',
        category: 'thresholds',
        description: 'Minimum score for high integrity classification',
        isPublic: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      configItems.push({
        configKey: 'medium_integrity_min',
        configValue: String(systemConfig.medium_integrity_min || 50),
        configType: 'number',
        category: 'thresholds',
        description: 'Minimum score for medium integrity classification',
        isPublic: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      if (systemConfig.default_assessment_year) {
        configItems.push({
          configKey: 'default_assessment_year',
          configValue: String(systemConfig.default_assessment_year),
          configType: 'number',
          category: 'system',
          description: 'Default assessment year',
          isPublic: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      if (systemConfig.max_file_size_mb) {
        configItems.push({
          configKey: 'max_file_size_mb',
          configValue: String(systemConfig.max_file_size_mb),
          configType: 'number',
          category: 'system',
          description: 'Maximum file size for uploads in MB',
          isPublic: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      if (systemConfig.enable_auto_scoring !== undefined) {
        configItems.push({
          configKey: 'enable_auto_scoring',
          configValue: String(systemConfig.enable_auto_scoring),
          configType: 'boolean',
          category: 'system',
          description: 'Enable automatic scoring for assessments',
          isPublic: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      const updatedConfig: IntegrityThresholds = { 
        ...systemConfig,
        highIntegrityMin: systemConfig.high_integrity_min || 80,
        mediumIntegrityMin: systemConfig.medium_integrity_min || 50,
        updatedAt: new Date().toISOString(),
        updatedBy: 'admin'
      };

      const updateRes: ApiResponse = await configService.updateSystemConfig(updatedConfig);

      if (!updateRes.success) {
        setError(updateRes.error || 'Failed to save system configuration.');
      } else {
        setSuccess('System configuration saved successfully!');
        setTimeout(() => setSuccess(null), 3000);
      }

    } catch (err: any) {
      console.error('Save error:', err);
      setError(err.message || 'Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleTemplateSave = async (template: FormTemplate): Promise<void> => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      let result;

      if (template.id && template.id.startsWith('tpl_')) {
        const { id, createdAt, updatedAt, version, createdBy, updatedBy, ...templateData } = template;
        result = await configService.updateFormTemplate(template.id, {
          ...templateData,
          updatedBy: 'admin'
        });
      } else {
        const { id, createdAt, updatedAt, version, createdBy, updatedBy, ...templateData } = template;
        result = await configService.createFormTemplate({
          ...templateData,
          isActive: true,
          createdBy: 'admin',
          updatedBy: 'admin'
        });
      }

      if (result.success) {
        const templatesRes = await configService.getFormTemplates();
        if (templatesRes.success) {
          setTemplates(templatesRes.data || []);
        }
        setSelectedTemplate(null);
        setSuccess('Template saved successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Failed to save template');
      }
    } catch (error: any) {
      console.error('Template save error:', error);
      setError(error.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleTemplateDelete = async (templateId: string) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;

    try {
      const result = await configService.deleteFormTemplate(templateId);
      if (result.success) {
        setTemplates(prev => prev.filter(t => t.id !== templateId));
        setSelectedTemplate(null);
        setSuccess('Template deleted successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Failed to delete template');
      }
    } catch (error: any) {
      console.error('Template delete error:', error);
      setError(error.message || 'Failed to delete template');
    }
  };

  const handleTemplateDuplicate = async (template: FormTemplate) => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { id, createdAt, updatedAt, createdBy, updatedBy, ...templateData } = template;
      const result = await configService.createFormTemplate({
        ...templateData,
        name: `${template.name} (Copy)`,
        isActive: false,
        createdBy: 'admin',
        updatedBy: 'admin'
      });

      if (result.success) {
        const templatesRes = await configService.getFormTemplates();
        if (templatesRes.success) {
          setTemplates(templatesRes.data || []);
        }
        setSuccess('Template duplicated successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Failed to duplicate template');
      }
    } catch (error: any) {
      console.error('Template duplicate error:', error);
      setError(error.message || 'Failed to duplicate template');
    } finally {
      setSaving(false);
    }
  };

  const handleFormSubmit = async (formData: any) => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('Form submission started with data:', formData);

      const testAgencyId = `test-agency-${Date.now()}`;
      const isAIMSForm = selectedTemplate?.name?.includes('AIMS') ||
        selectedTemplate?.description?.includes('AIMS') ||
        (selectedTemplate?.indicatorIds && selectedTemplate.indicatorIds.length > 1);

      if (isAIMSForm) {
        console.log('Saving complete AIMS assessment form...');
        
        const indicatorScores: Record<string, number> = {};
        const responseData: Record<string, any> = {};

        // ICCS - maturity levels (UPDATED ID)
        if (selectedTemplate?.indicatorIds?.includes('ind_iccs_v3') || 
            formData.complaint_level !== undefined) {
          responseData['ind_iccs_v3'] = {
            complaint_level: formData.complaint_level,
            coi_level: formData.coi_level,
            gift_level: formData.gift_level,
            proactive_level: formData.proactive_level
          };
          
          const levelPoints: Record<number, number> = {0:0, 1:4, 2:6, 3:8};
          const iccsScore = (levelPoints[formData.complaint_level] || 0) +
                            (levelPoints[formData.coi_level] || 0) +
                            (levelPoints[formData.gift_level] || 0) +
                            (levelPoints[formData.proactive_level] || 0);
          indicatorScores['ind_iccs_v3'] = iccsScore;
        }

        // Capacity Building (UPDATED ID)
        if (selectedTemplate?.indicatorIds?.includes('ind_training_v3') || 
            formData.total_employees !== undefined) {
          responseData['ind_training_v3'] = {
            total_employees: formData.total_employees,
            completed_employees: formData.completed_employees
          };
          
          const total = Number(formData.total_employees) || 0;
          const completed = Number(formData.completed_employees) || 0;
          let trainingScore = 0;
          if (total > 0) {
            const percentage = (completed / total) * 100;
            if (percentage >= 85) trainingScore = 24;
            else if (percentage >= 70) trainingScore = 18;
            else if (percentage >= 50) trainingScore = 10;
          }
          indicatorScores['ind_training_v3'] = trainingScore;
        }

        // Asset Declaration (UPDATED ID)
        if (selectedTemplate?.indicatorIds?.includes('ind_ad_v3') || 
            formData.total_covered_officials !== undefined) {
          responseData['ind_ad_v3'] = {
            total_covered_officials: formData.total_covered_officials,
            officials_submitted_on_time: formData.officials_submitted_on_time
          };
          
          const total = Number(formData.total_covered_officials) || 0;
          const submitted = Number(formData.officials_submitted_on_time) || 0;
          let adScore = 0;
          if (total > 0) {
            const percentage = (submitted / total) * 100;
            if (percentage >= 100) adScore = 14;
            else if (percentage >= 95) adScore = 10;
            else if (percentage >= 90) adScore = 5;
          }
          indicatorScores['ind_ad_v3'] = adScore;
        }

        // Code of Conduct (UPDATED ID)
        if (selectedTemplate?.indicatorIds?.includes('ind_coc_v3') || 
            formData.coc_level !== undefined) {
          responseData['ind_coc_v3'] = {
            coc_level: formData.coc_level
          };
          
          const levelPoints: Record<number, number> = {0:0, 1:4, 2:7, 3:10};
          const cocScore = levelPoints[formData.coc_level] || 0;
          indicatorScores['ind_coc_v3'] = cocScore;
        }

        // Corruption Cases (UPDATED ID)
        if (selectedTemplate?.indicatorIds?.includes('ind_cases_v3') || 
            formData.conviction_cases !== undefined) {
          responseData['ind_cases_v3'] = {
            conviction_cases: formData.conviction_cases,
            prosecution_cases: formData.prosecution_cases,
            admin_action_cases: formData.admin_action_cases
          };
          
          const convictions = Number(formData.conviction_cases) || 0;
          const prosecutions = Number(formData.prosecution_cases) || 0;
          const adminActions = Number(formData.admin_action_cases) || 0;
          const severityScore = (convictions * 3) + (prosecutions * 2) + (adminActions * 1);
          
          let casesScore = 0;
          if (severityScore === 0) casesScore = 20;
          else if (severityScore <= 2) casesScore = 12;
          else if (severityScore <= 4) casesScore = 6;
          indicatorScores['ind_cases_v3'] = casesScore;
        }

        const result = await configService.saveAllAssessments({
          agencyId: testAgencyId,
          indicatorScores,
          responseData,
          status: 'DRAFT'
        });

        if (result.success) {
          const totalScore = Object.values(indicatorScores).reduce((a, b) => a + b, 0);
          setSuccess(`Complete AIMS assessment saved successfully! Score: ${totalScore.toFixed(1)}/100`);
        } else {
          setError(result.error || 'Failed to save complete assessment');
        }
      } else {
        console.log('Saving single indicator test form...');

        let indicatorId = selectedTemplate?.indicatorIds?.[0];
        if (!indicatorId) {
          if (formData.total_employees !== undefined) indicatorId = 'ind_training_v3';
          else if (formData.total_covered_officials !== undefined) indicatorId = 'ind_ad_v3';
          else if (formData.conviction_cases !== undefined) indicatorId = 'ind_cases_v3';
          else if (formData.complaint_level !== undefined) indicatorId = 'ind_iccs_v3';
          else if (formData.coc_level !== undefined) indicatorId = 'ind_coc_v3';
          else indicatorId = 'unknown';
        }

        const responseData: Record<string, any> = {};
        Object.keys(formData).forEach(key => {
          if (!key.startsWith('_')) {
            responseData[key] = formData[key];
          }
        });

        const score = formData._totalScore || 
                      formData._scores?.[Object.keys(formData._scores || {})[0]] || 
                      0;

        const result = await configService.saveIndicatorAssessment({
          agencyId: testAgencyId,
          indicatorId,
          responseData,
          score,
          templateId: selectedTemplate?.id
        });

        if (result.success) {
          const scoringData = result.data?.scoring || result.data;
          const finalScore = scoringData?.finalScore || score;
          setSuccess(`Test assessment saved successfully! Score: ${finalScore}`);
        } else {
          setError(result.error || 'Failed to save test assessment');
        }
      }
    } catch (error: any) {
      console.error('Form submission error:', error);
      setError(error.message || 'An unexpected error occurred while saving the assessment');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateConfigurationVersion = async (versionData: any) => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const indicatorsRes = await configService.getCompleteConfiguration();
      if (!indicatorsRes.success) {
        throw new Error('Failed to get current configuration');
      }

      const formTemplatesRes = await configService.getFormTemplates();
      if (!formTemplatesRes.success) {
        throw new Error('Failed to get form templates');
      }

      const versionPayload = {
        ...versionData,
        indicators: indicatorsRes.data,
        form_templates: formTemplatesRes.data,
        parameters: [],
        scoring_rules: []
      };

      const result = await configService.createConfigurationVersion(versionPayload);
      if (result.success) {
        setSuccess('Configuration version created successfully!');
        await loadInitialData();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Failed to create configuration version');
      }
    } catch (error: any) {
      console.error('Create version error:', error);
      setError(error.message || 'Failed to create configuration version');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyConfigurationVersion = async (versionId: string) => {
    if (!window.confirm('Are you sure you want to apply this configuration version? This will update all indicators and templates.')) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await configService.applyConfigurationVersion(versionId);
      if (result.success) {
        setSuccess('Configuration version applied successfully!');
        await loadInitialData();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Failed to apply configuration version');
      }
    } catch (error: any) {
      console.error('Apply version error:', error);
      setError(error.message || 'Failed to apply configuration version');
    } finally {
      setSaving(false);
    }
  };

  const handleValidateIndicators = async () => {
    setLoading(true);
    setError(null);
    setValidationResults([]);

    try {
      const validationPromises = indicators.map(async (indicator) => {
        const result = await configService.validateIndicator(indicator);
        return {
          isValid: result.success && result.data?.isValid === true,
          errors: result.data?.errors || [],
          warnings: result.data?.warnings || []
        } as ValidationResult;
      });

      const results = await Promise.all(validationPromises);
      setValidationResults(results);

      const invalidCount = results.filter(r => !r.isValid).length;
      if (invalidCount > 0) {
        setError(`${invalidCount} indicators have validation errors`);
      } else {
        setSuccess('All indicators are valid!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (error: any) {
      console.error('Validation error:', error);
      setError('Failed to validate indicators');
    } finally {
      setLoading(false);
    }
  };

  // Helper to create AIMS assessment template - UPDATED WITH CORRECT INDICATOR IDs
  const createAssessmentTemplate = (type: 'aims' | 'iccs-only' | 'cases-only'): FormTemplate => {
    const indicatorIds = type === 'aims' ? 
      ['ind_iccs_v3', 'ind_training_v3', 'ind_ad_v3', 'ind_coc_v3', 'ind_cases_v3'] :
      type === 'iccs-only' ? ['ind_iccs_v3'] : ['ind_cases_v3'];
    
    const baseTemplate: FormTemplate = {
      id: '',
      name: type === 'aims' ? 'AIMS Full Assessment' : 
            type === 'iccs-only' ? 'ICCS Assessment' : 'Corruption Cases Assessment',
      description: type === 'aims' ? 'Complete AIMS assessment covering all 5 indicators' :
                   type === 'iccs-only' ? 'Assessment of Internal Corruption Control Systems only' :
                   'Assessment of corruption case severity',
      templateType: 'assessment' as TemplateType,
      indicatorIds: indicatorIds,
      sections: [],
      validationRules: {},
      uiConfig: {
        show_progress_bar: true,
        show_section_numbers: true,
        submit_button_text: 'Submit Assessment'
      },
      version: '1.0.0',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'admin',
      updatedBy: 'admin'
    };

    if (type === 'aims' || type === 'iccs-only') {
      baseTemplate.sections = [
        {
          id: `section_${Date.now()}_1`,
          title: 'Internal Corruption Control Systems (ICCS)',
          description: 'Assess the maturity of your four core integrity systems',
          columns: 1,
          displayOrder: 0,
          fields: [
            {
              id: `field_${Date.now()}_complaint`,
              indicatorId: 'ind_iccs_v3',
              parameterCode: 'complaint_level',
              label: 'Complaint Management Mechanism',
              type: 'select',
              required: true,
              displayOrder: 0,
              uiSettings: {
                help_text: 'Select the maturity level of your complaint management system',
                options: [
                  { label: 'Level 0: Nascent - No formal system (0 points)', value: 0 },
                  { label: 'Level 1: Foundational - Basic system exists (4 points)', value: 1 },
                  { label: 'Level 2: Established - System operational (6 points)', value: 2 },
                  { label: 'Level 3: Advanced - System embedded (8 points)', value: 3 }
                ]
              }
            },
            {
              id: `field_${Date.now()}_coi`,
              indicatorId: 'ind_iccs_v3',
              parameterCode: 'coi_level',
              label: 'Conflict of Interest Management',
              type: 'select',
              required: true,
              displayOrder: 1,
              uiSettings: {
                help_text: 'Select the maturity level of your CoI management',
                options: [
                  { label: 'Level 0: Nascent - No formal system (0 points)', value: 0 },
                  { label: 'Level 1: Foundational - Basic policy exists (4 points)', value: 1 },
                  { label: 'Level 2: Established - Active management (6 points)', value: 2 },
                  { label: 'Level 3: Advanced - Embedded in culture (8 points)', value: 3 }
                ]
              }
            },
            {
              id: `field_${Date.now()}_gift`,
              indicatorId: 'ind_iccs_v3',
              parameterCode: 'gift_level',
              label: 'Gift Management System',
              type: 'select',
              required: true,
              displayOrder: 2,
              uiSettings: {
                help_text: 'Select the maturity level of your gift management',
                options: [
                  { label: 'Level 0: Nascent - No formal system (0 points)', value: 0 },
                  { label: 'Level 1: Foundational - Register exists (4 points)', value: 1 },
                  { label: 'Level 2: Established - Active management (6 points)', value: 2 },
                  { label: 'Level 3: Advanced - Proactive analysis (8 points)', value: 3 }
                ]
              }
            },
            {
              id: `field_${Date.now()}_proactive`,
              indicatorId: 'ind_iccs_v3',
              parameterCode: 'proactive_level',
              label: 'Proactive Integrity Enhancements',
              type: 'select',
              required: true,
              displayOrder: 3,
              uiSettings: {
                help_text: 'Select the maturity level of your proactive integrity efforts',
                options: [
                  { label: 'Level 0: Nascent - No initiatives (0 points)', value: 0 },
                  { label: 'Level 1: Foundational - Planned initiatives (2-3 points)', value: 1 },
                  { label: 'Level 2: Established - Implemented initiatives (5-6 points)', value: 2 },
                  { label: 'Level 3: Advanced - Systematic program (8 points)', value: 3 }
                ]
              }
            }
          ]
        }
      ];
    }

    if (type === 'aims') {
      baseTemplate.sections = [
        ...(baseTemplate.sections || []),
        {
          id: `section_${Date.now()}_2`,
          title: 'Integrity Capacity Building',
          description: 'Staff completion of ACC e-Learning course',
          columns: 2,
          displayOrder: 1,
          fields: [
            {
              id: `field_${Date.now()}_total_employees`,
              indicatorId: 'ind_training_v3',
              parameterCode: 'total_employees',
              label: 'Total Employees',
              type: 'number',
              required: true,
              displayOrder: 0,
              uiSettings: {
                min: 0,
                help_text: 'Total number of employees in your agency'
              }
            },
            {
              id: `field_${Date.now()}_completed_employees`,
              indicatorId: 'ind_training_v3',
              parameterCode: 'completed_employees',
              label: 'Employees Who Completed Training',
              type: 'number',
              required: true,
              displayOrder: 1,
              uiSettings: {
                min: 0,
                help_text: 'Number of employees who completed ACC e-Learning'
              }
            }
          ]
        },
        {
          id: `section_${Date.now()}_3`,
          title: 'Asset Declaration Compliance',
          description: 'Percentage of covered officials submitting on time',
          columns: 2,
          displayOrder: 2,
          fields: [
            {
              id: `field_${Date.now()}_total_officials`,
              indicatorId: 'ind_ad_v3',
              parameterCode: 'total_covered_officials',
              label: 'Total Covered Officials',
              type: 'number',
              required: true,
              displayOrder: 0,
              uiSettings: {
                min: 0,
                help_text: 'Total number of officials required to declare'
              }
            },
            {
              id: `field_${Date.now()}_submitted_officials`,
              indicatorId: 'ind_ad_v3',
              parameterCode: 'officials_submitted_on_time',
              label: 'Officials Who Submitted on Time',
              type: 'number',
              required: true,
              displayOrder: 1,
              uiSettings: {
                min: 0,
                help_text: 'Number who submitted by the deadline'
              }
            }
          ]
        },
        {
          id: `section_${Date.now()}_4`,
          title: 'Code of Conduct',
          description: 'Awareness and application of Code of Conduct',
          columns: 1,
          displayOrder: 3,
          fields: [
            {
              id: `field_${Date.now()}_coc_level`,
              indicatorId: 'ind_coc_v3',
              parameterCode: 'coc_level',
              label: 'Code of Conduct Maturity Level',
              type: 'select',
              required: true,
              displayOrder: 0,
              uiSettings: {
                help_text: 'Select the maturity level of your Code of Conduct implementation',
                options: [
                  { label: 'Level 0: Nascent - No active promotion (0 points)', value: 0 },
                  { label: 'Level 1: Foundational - Code exists and accessible (4 points)', value: 1 },
                  { label: 'Level 2: Established - Actively communicated (7 points)', value: 2 },
                  { label: 'Level 3: Advanced - Embedded in culture (10 points)', value: 3 }
                ]
              }
            }
          ]
        },
        {
          id: `section_${Date.now()}_5`,
          title: 'Corruption Case Severity',
          description: 'Substantiated cases in the fiscal year',
          columns: 3,
          displayOrder: 4,
          fields: [
            {
              id: `field_${Date.now()}_convictions`,
              indicatorId: 'ind_cases_v3',
              parameterCode: 'conviction_cases',
              label: 'Convictions (3 pts each)',
              type: 'number',
              required: true,
              displayOrder: 0,
              uiSettings: {
                min: 0,
                help_text: 'Number of criminal convictions'
              }
            },
            {
              id: `field_${Date.now()}_prosecutions`,
              indicatorId: 'ind_cases_v3',
              parameterCode: 'prosecution_cases',
              label: 'Prosecutions (2 pts each)',
              type: 'number',
              required: true,
              displayOrder: 1,
              uiSettings: {
                min: 0,
                help_text: 'Number referred to OAG for prosecution'
              }
            },
            {
              id: `field_${Date.now()}_admin_actions`,
              indicatorId: 'ind_cases_v3',
              parameterCode: 'admin_action_cases',
              label: 'Admin Actions (1 pt each)',
              type: 'number',
              required: true,
              displayOrder: 2,
              uiSettings: {
                min: 0,
                help_text: 'Number of ACC-confirmed administrative actions'
              }
            }
          ]
        }
      ];
    }

    return baseTemplate;
  };

  const createEmptyTemplate = (): FormTemplate => {
    return {
      id: '',
      name: '',
      description: '',
      templateType: 'assessment' as TemplateType,
      indicatorIds: [],
      sections: [],
      validationRules: {},
      uiConfig: {
        show_progress_bar: true,
        show_section_numbers: true,
        submit_button_text: 'Submit'
      },
      version: '1.0.0',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'admin',
      updatedBy: 'admin'
    };
  };

  const totalWeight = getTotalWeight();
  const isWeightValid = Math.abs(totalWeight - 100) < 0.1;

  const aimsIndicators = [
    {
      id: 'ind_iccs_v3',
      name: 'Internal Corruption Control Systems (ICCS)',
      weight: 32,
      category: 'integrity_promotion' as IndicatorCategory,
      description: 'Functioning of the agency\'s four core integrity systems (Complaint, CoI, Gift, Proactive)',
      maxScore: 32,
      subsystems: ['Complaint', 'CoI', 'Gift', 'Proactive']
    },
    {
      id: 'ind_training_v3',
      name: 'Integrity Capacity Building',
      weight: 24,
      category: 'integrity_promotion' as IndicatorCategory,
      description: 'Staff completion of ACC\'s e-Learning course',
      maxScore: 24,
      scoringType: 'percentage-range'
    },
    {
      id: 'ind_ad_v3',
      name: 'Asset Declaration (AD) Compliance',
      weight: 14,
      category: 'integrity_promotion' as IndicatorCategory,
      description: '% of covered officials submitting AD on time',
      maxScore: 14,
      scoringType: 'percentage-range'
    },
    {
      id: 'ind_coc_v3',
      name: 'Code of Conduct Awareness & Application',
      weight: 10,
      category: 'integrity_promotion' as IndicatorCategory,
      description: 'Integration of Code of Conduct into agency culture',
      maxScore: 10
    },
    {
      id: 'ind_cases_v3',
      name: 'Corruption Case Severity & Resolution',
      weight: 20,
      category: 'corruption_accountability' as IndicatorCategory,
      description: 'Weighted severity of corruption cases involving agency staff',
      maxScore: 20,
      scoringType: 'severity-index'
    }
  ];

  const tabs = [
    { id: 'weights', label: 'Indicator Weights', icon: CalculatorIcon },
    { id: 'indicators', label: 'Indicators', icon: ChartBarIcon },
    { id: 'parameters', label: 'Parameters', icon: TableCellsIcon },
    { id: 'scoring-rules', label: 'Scoring Rules', icon: CogIcon },
    { id: 'maturity', label: 'Maturity Framework', icon: ScaleIcon },
    { id: 'forms', label: 'Form Templates', icon: DocumentTextIcon },
    { id: 'versions', label: 'Versions', icon: DocumentDuplicateIcon },
    { id: 'configuration', label: 'System Config', icon: CogIcon },
    { id: 'test', label: 'Test Forms', icon: BeakerIcon }
  ];

  const renderIntegrityThresholds = () => (
    <div className="bg-white rounded-lg shadow p-6 mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Integrity Level Thresholds</h2>
      <p className="text-sm text-gray-600 mb-4">
        Define score ranges for integrity classifications as per AIMS guidelines.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            High Integrity (≥)
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={systemConfig.high_integrity_min || 80}
            onChange={(e) => handleConfigChange('high_integrity_min', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            Agencies with score ≥ {systemConfig.high_integrity_min || 80}
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Medium Integrity (≥)
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={systemConfig.medium_integrity_min || 50}
            onChange={(e) => handleConfigChange('medium_integrity_min', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            Agencies with score ≥ {systemConfig.medium_integrity_min || 50} and &lt; {systemConfig.high_integrity_min || 80}
          </p>
        </div>
      </div>
      <div className="mt-4 p-3 bg-gray-50 rounded">
        <p className="text-sm text-gray-700">
          <span className="font-medium">Needs Improvement:</span> Score below {systemConfig.medium_integrity_min || 50}
        </p>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <HomeIcon className="h-4 w-4 mr-1" />
          Back to Dashboard
        </button>
        <h1 className="text-2xl font-bold text-gray-900">AIMS Configuration</h1>
        <div className="flex items-center space-x-2">
          <button
            onClick={loadInitialData}
            className="p-2 text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-100"
            title="Refresh data"
            disabled={loading || saving}
          >
            <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <p className="text-gray-600 mb-6">
        Configure AIMS scoring weights, indicators, maturity frameworks, parameters, rules, forms, and templates based on Revised Framework Ver-3.
      </p>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setError(null)}
                className="text-red-500 hover:text-red-700"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-5 w-5 text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as TabType);
                setError(null);
                setSuccess(null);
                setValidationResults([]);
              }}
              className={`
                flex items-center py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
              disabled={saving}
            >
              <tab.icon className="h-5 w-5 mr-2" />
              {tab.label}
              {(tab.id === 'weights' && !isWeightValid) && (
                <span className="ml-2 h-2 w-2 bg-red-500 rounded-full"></span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'weights' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Indicator Weight Summary</h2>
                  <p className="text-sm text-gray-600">
                    Total weight across all active indicators:
                    <b>{totalWeight.toFixed(1)}% / 100%</b>
                  </p>
                </div>
                <button
                  onClick={handleValidateIndicators}
                  disabled={loading || indicators.length === 0}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                  Validate All Indicators
                </button>
              </div>

              {validationResults.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-md font-semibold text-gray-900 mb-3">Validation Results</h3>
                  <div className="space-y-3">
                    {validationResults.map((result, index) => (
                      <div key={index} className={`p-4 rounded border ${result.isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-gray-900">{indicators[index]?.name}</h4>
                            <span className={`text-sm ${result.isValid ? 'text-green-700' : 'text-red-700'}`}>
                              {result.isValid ? '✓ Valid' : '✗ Invalid'}
                            </span>
                          </div>
                          {!result.isValid && (
                            <button
                              onClick={() => setActiveTab('indicators')}
                              className="text-sm text-blue-600 hover:text-blue-800"
                            >
                              Go to Edit
                            </button>
                          )}
                        </div>
                        {result.errors.length > 0 && (
                          <ul className="mt-2 text-sm text-red-700 list-disc pl-5">
                            {result.errors.map((error, idx) => (
                              <li key={idx}>{error}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!isWeightValid && totalWeight > 0 && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <div className="flex">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-2" />
                    <p className="text-sm text-yellow-800">
                      <strong>Warning:</strong> Total indicator weight is {totalWeight.toFixed(1)}%.
                      The sum should be exactly 100% for proper scoring.
                    </p>
                  </div>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-md font-semibold text-gray-900 mb-4">AIMS Revised Framework Ver-3 Indicators</h3>
                <div className="space-y-4">
                  {aimsIndicators.map(indicator => (
                    <div key={indicator.id} className="border border-gray-200 rounded p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium text-gray-900">{indicator.name}</h3>
                          <p className="text-sm text-gray-600">{indicator.description}</p>
                          <div className="mt-1 flex items-center space-x-2">
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {indicator.category.replace('_', ' ')}
                            </span>
                            {indicator.subsystems && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                {indicator.subsystems.length} subsystems
                              </span>
                            )}
                            {indicator.scoringType && (
                              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                                {indicator.scoringType}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold">{indicator.weight}%</div>
                          <div className="text-xs text-gray-500">Max Score: {indicator.maxScore}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-md font-semibold text-gray-900 mb-4">Currently Configured Indicators</h3>
                {indicators.length > 0 ? (
                  <div className="space-y-4">
                    {indicators
                      .filter(ind => ind.isActive)
                      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                      .map(indicator => (
                        <div key={indicator.id} className="border border-gray-200 rounded p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="font-medium text-gray-900">{indicator.name}</h3>
                              <p className="text-sm text-gray-600">{indicator.category}</p>
                              {indicator.code && (
                                <p className="text-xs text-gray-500">Code: {indicator.code}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-semibold">{indicator.weight}%</div>
                              <div className="text-xs text-gray-500">Max Score: {indicator.maxScore}</div>
                            </div>
                          </div>
                          {indicator.description && (
                            <p className="mt-2 text-sm text-gray-600">{indicator.description}</p>
                          )}
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded">
                    <p className="text-gray-500">No indicators configured yet</p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('indicators')}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                    >
                      Go to Indicators tab to configure
                    </button>
                  </div>
                )}
              </div>
            </div>

            {renderIntegrityThresholds()}
          </div>
        )}

        {activeTab === 'indicators' && (
          <IndicatorManager />
        )}

        {activeTab === 'parameters' && (
          <ParametersTab
            indicators={indicators}
            onParameterUpdate={loadInitialData}
            loading={loading}
          />
        )}

        {activeTab === 'scoring-rules' && (
          <ScoringRulesTab />
        )}

        {activeTab === 'maturity' && (
          <MaturityFrameworkTab
            indicators={indicators}
            onFrameworkUpdate={loadInitialData}
            loading={loading}
          />
        )}

        {activeTab === 'forms' && (
          <div className="space-y-6">
            {selectedTemplate ? (
              <>
                <div className="flex justify-between items-center">
                  <button
                    onClick={() => setSelectedTemplate(null)}
                    className="flex items-center text-gray-600 hover:text-gray-900"
                    disabled={saving}
                  >
                    ← Back to Templates
                  </button>
                  <div className="text-sm text-gray-500">
                    {selectedTemplate.id && selectedTemplate.id.startsWith('tpl_') ? 'Editing Template' : 'Creating New Template'}
                  </div>
                </div>
                <FormBuilder
                  template={selectedTemplate}
                  onSave={handleTemplateSave}
                  onCancel={() => setSelectedTemplate(null)}
                  onPreview={(template) => {
                    setSelectedTemplate(template);
                    setActiveTab('test');
                  }}
                />
              </>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Form Templates</h2>
                    <p className="text-gray-600">Create and manage form templates for AIMS assessments</p>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setSelectedTemplate(createAssessmentTemplate('aims'))}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
                    >
                      <DocumentTextIcon className="h-5 w-5 mr-2" />
                      New AIMS Assessment
                    </button>
                    <button
                      onClick={() => setSelectedTemplate(createEmptyTemplate())}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                    >
                      <PlusIcon className="h-5 w-5 mr-2" />
                      Custom Template
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-gray-900">Available Templates</h3>
                      <div className="text-sm text-gray-500">
                        {templates.length} template(s)
                      </div>
                    </div>
                  </div>

                  {templates.length > 0 ? (
                    <div className="divide-y divide-gray-200">
                      {templates.map(template => (
                        <div key={template.id} className="p-6 hover:bg-gray-50">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center">
                                <h4 className="text-lg font-medium text-gray-900">
                                  {template.name}
                                </h4>
                                {template.templateType === 'assessment' && (
                                  <span className="ml-3 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                    AIMS Assessment
                                  </span>
                                )}
                                {template.isActive && (
                                  <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                    Active
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-sm text-gray-600">{template.description}</p>
                              
                              {template.indicatorIds && template.indicatorIds.length > 0 && (
                                <div className="mt-3">
                                  <p className="text-xs font-medium text-gray-500 mb-1">Indicators:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {template.indicatorIds.map(id => {
                                      const indicator = indicators.find(i => i.id === id);
                                      return indicator ? (
                                        <span key={id} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200">
                                          {indicator.name} ({indicator.weight}%)
                                        </span>
                                      ) : null;
                                    })}
                                  </div>
                                </div>
                              )}
                              
                              <div className="mt-2 flex items-center text-sm text-gray-500">
                                <span className="bg-gray-100 px-2 py-1 rounded mr-2">
                                  {template.templateType}
                                </span>
                                <span>v{template.version}</span>
                                <span className="mx-2">•</span>
                                <span>{template.sections?.length || 0} sections</span>
                                <span className="mx-2">•</span>
                                <span>{template.sections?.reduce((acc, s) => acc + (s.fields?.length || 0), 0)} fields</span>
                              </div>
                            </div>
                            
                            <div className="flex space-x-3 ml-4">
                              <button
                                onClick={() => {
                                  setSelectedTemplate(template);
                                  setActiveTab('test');
                                }}
                                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center"
                                title="Test Template"
                              >
                                <BeakerIcon className="h-4 w-4 mr-1" />
                                Test
                              </button>
                              <button
                                onClick={() => handleTemplateDuplicate(template)}
                                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center"
                                title="Duplicate Template"
                              >
                                <DocumentDuplicateIcon className="h-4 w-4 mr-1" />
                                Duplicate
                              </button>
                              <button
                                onClick={() => setSelectedTemplate(template)}
                                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                                title="Edit Template"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleTemplateDelete(template.id!)}
                                className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                                title="Delete Template"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No templates created yet</p>
                      <div className="mt-4 flex justify-center space-x-3">
                        <button
                          onClick={() => setSelectedTemplate(createAssessmentTemplate('aims'))}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                        >
                          Create AIMS Assessment
                        </button>
                        <button
                          onClick={() => setSelectedTemplate(createEmptyTemplate())}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          Create Custom Template
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'versions' && (
          <ConfigurationVersionManager
            versions={configurationVersions}
            onCreateVersion={handleCreateConfigurationVersion}
            onApplyVersion={handleApplyConfigurationVersion}
            onRefresh={loadInitialData}
            loading={loading}
          />
        )}

        {activeTab === 'configuration' && (
          <form onSubmit={handleSystemConfigSubmit} className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">System Configuration</h2>
              <p className="text-sm text-gray-600 mb-4">
                Configure system-wide settings and thresholds for AIMS.
              </p>

              {renderIntegrityThresholds()}

              <div className="mt-6">
                <h3 className="text-md font-medium text-gray-900 mb-3">Other Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Default Assessment Year
                    </label>
                    <input
                      type="number"
                      value={systemConfig.default_assessment_year || new Date().getFullYear()}
                      onChange={(e) => handleConfigChange('default_assessment_year', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Maximum File Size (MB)
                    </label>
                    <input
                      type="number"
                      value={systemConfig.max_file_size_mb || 10}
                      onChange={(e) => handleConfigChange('max_file_size_mb', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      min="1"
                      max="100"
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="enable_auto_scoring"
                      checked={systemConfig.enable_auto_scoring !== false}
                      onChange={(e) => handleConfigChange('enable_auto_scoring', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="enable_auto_scoring" className="ml-2 block text-sm text-gray-900">
                      Enable Automatic Scoring
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={saving}
                  className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {saving ? (
                    <>
                      <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save System Configuration'
                  )}
                </button>
                <button
                  type="button"
                  onClick={loadInitialData}
                  className="ml-3 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  disabled={loading}
                >
                  Reset Changes
                </button>
              </div>
            </div>
          </form>
        )}

        {activeTab === 'test' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Test Form Templates</h2>
                <p className="text-gray-600">Preview and test AIMS form templates before deployment</p>
              </div>
              <button
                onClick={() => setActiveTab('forms')}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center"
                disabled={saving}
              >
                <DocumentTextIcon className="h-5 w-5 mr-2" />
                Back to Templates
              </button>
            </div>

            {selectedTemplate ? (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Testing: {selectedTemplate.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {selectedTemplate.description || 'No description provided'}
                      </p>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => {
                          setActiveTab('forms');
                          setSelectedTemplate(null);
                        }}
                        className="px-3 py-1 text-sm border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                        disabled={saving}
                      >
                        Back to Edit
                      </button>
                      <button
                        onClick={loadInitialData}
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center"
                        disabled={loading}
                      >
                        <ArrowPathIcon className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                        Reload
                      </button>
                    </div>
                  </div>

                  <div className="border rounded-lg p-6 bg-gray-50">
                    <h4 className="text-md font-medium text-gray-900 mb-4">Form Preview</h4>
                    <DynamicForm
                      template={selectedTemplate}
                      onSubmit={handleFormSubmit}
                      initialData={emptyInitialData}
                      mode="test"
                    />
                  </div>
                </div>
              </div>
            ) : templates.length > 0 ? (
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Select Template to Test</h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {templates.map(template => (
                    <div key={template.id} className="p-6 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-lg font-medium text-gray-900">{template.name}</h4>
                          <p className="mt-1 text-sm text-gray-600">{template.description}</p>
                          <div className="mt-2 flex items-center text-sm text-gray-500">
                            <span className="bg-gray-100 px-2 py-1 rounded mr-2">
                              {template.templateType}
                            </span>
                            <span>v{template.version}</span>
                            <span className="mx-2">•</span>
                            <span>{template.sections?.length || 0} sections</span>
                          </div>
                        </div>
                        <div className="flex space-x-3">
                          <button
                            onClick={() => {
                              setSelectedTemplate(template);
                            }}
                            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center"
                          >
                            <BeakerIcon className="h-4 w-4 mr-1" />
                            Test Template
                          </button>
                          <button
                            onClick={() => {
                              setActiveTab('forms');
                              setSelectedTemplate(template);
                            }}
                            className="px-3 py-1 text-sm border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <BeakerIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No templates available for testing</p>
                <button
                  onClick={() => setActiveTab('forms')}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Template First
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {(loading || saving) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center">
            <ArrowPathIcon className="h-8 w-8 text-blue-600 animate-spin mb-4" />
            <p className="text-gray-700">{saving ? 'Saving...' : 'Loading...'}</p>
          </div>
        </div>
      )}
    </div>
  );
}