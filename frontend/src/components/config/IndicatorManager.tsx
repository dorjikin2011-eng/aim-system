
// frontend/src/components/config/IndicatorManager.tsx - CORRECTED VERSION
import React, { useState, useEffect } from 'react';
import { useIndicatorConfig } from '../../hooks/useIndicatorConfig';
import type { 
  IndicatorDefinition, 
  ParameterDefinition, 
  ScoringRule,
  CreateIndicatorInput,
  UpdateIndicatorInput,
  IndicatorCategory,
  ScoringMethod
} from '../../types/config';
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon, EyeSlashIcon, ArrowUpIcon, ArrowDownIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { INDICATOR_CATEGORIES, SCORING_METHODS } from '../../types/config';

interface IndicatorManagerProps {
  onIndicatorSelect?: (indicator: IndicatorDefinition) => void;
  onParameterEdit?: (indicatorId: string, parameter: ParameterDefinition) => void;
  onRuleEdit?: (indicatorId: string, rule: ScoringRule) => void;
}

export default function IndicatorManager({ 
  onIndicatorSelect, 
}: IndicatorManagerProps) {
  const { 
    indicators,  
    loading, 
    error, 
    validationResult,
    loadIndicators, 
    createIndicator, 
    updateIndicator, 
    deleteIndicator,
    reorderIndicators,
    clearError,
    clearValidation 
  } = useIndicatorConfig();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showInactive, setShowInactive] = useState(false);
  const [editingIndicator, setEditingIndicator] = useState<IndicatorDefinition | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<Partial<IndicatorDefinition>>({
    name: '',
    code: '',
    description: '',
    category: 'compliance' as IndicatorCategory,
    weight: 0,
    scoringMethod: 'sum' as ScoringMethod,
    parameters: [],
    scoringRules: [],
    isActive: true,
    displayOrder: 0,
    maxScore: 100,
    uiConfig: {},
    metadata: {}
  });

  const categories = [
    { value: 'all', label: 'All Categories' },
    ...INDICATOR_CATEGORIES.map(cat => ({
      value: cat.value,
      label: cat.label
    }))
  ];

  useEffect(() => {
    loadIndicators({ 
      activeOnly: !showInactive,
      includeParameters: true,
      includeRules: true 
    });
  }, [showInactive]);

  const filteredIndicators = selectedCategory === 'all' 
    ? indicators
    : indicators.filter(ind => ind.category === selectedCategory);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const generateCodeFromName = () => {
    if (formData.name && !formData.code) {
      const code = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_');
      setFormData(prev => ({ ...prev, code }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    clearValidation();

    if (isCreating) {
      // Prepare create input - includes all required properties from IndicatorDefinition except omitted ones
      const createInput: CreateIndicatorInput = {
        name: formData.name!,
        code: formData.code!,
        description: formData.description || '',
        category: formData.category! as IndicatorCategory,
        weight: formData.weight!,
        scoringMethod: formData.scoringMethod! as ScoringMethod,
        parameters: formData.parameters || [],
        scoringRules: formData.scoringRules || [],
        isActive: formData.isActive !== undefined ? formData.isActive : true,
        displayOrder: formData.displayOrder || 0,
        maxScore: formData.maxScore || 100,
        uiConfig: formData.uiConfig || {},
        metadata: formData.metadata || {},
        createdBy: 'admin' // createdBy is part of CreateIndicatorInput based on the type definition
      };
      
      await createIndicator(createInput);
      if (!validationResult?.errors?.length) {
        setIsCreating(false);
        resetForm();
      }
    } else if (editingIndicator) {
      // Prepare update input - updatedBy is required
      const updateInput: UpdateIndicatorInput = {
        updatedBy: 'admin', // Required field for updates
        ...(formData.name !== undefined && { name: formData.name }),
        ...(formData.code !== undefined && { code: formData.code }),
        ...(formData.description !== undefined && { description: formData.description }),
        ...(formData.category !== undefined && { category: formData.category as IndicatorCategory }),
        ...(formData.weight !== undefined && { weight: formData.weight }),
        ...(formData.scoringMethod !== undefined && { scoringMethod: formData.scoringMethod as ScoringMethod }),
        ...(formData.parameters !== undefined && { parameters: formData.parameters }),
        ...(formData.scoringRules !== undefined && { scoringRules: formData.scoringRules }),
        ...(formData.isActive !== undefined && { isActive: formData.isActive }),
        ...(formData.displayOrder !== undefined && { displayOrder: formData.displayOrder }),
        ...(formData.maxScore !== undefined && { maxScore: formData.maxScore }),
        ...(formData.uiConfig !== undefined && { uiConfig: formData.uiConfig }),
        ...(formData.metadata !== undefined && { metadata: formData.metadata })
      };
      
      await updateIndicator(editingIndicator.id, updateInput);
      if (!validationResult?.errors?.length) {
        setEditingIndicator(null);
        resetForm();
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      category: 'compliance' as IndicatorCategory,
      weight: 0,
      scoringMethod: 'sum' as ScoringMethod,
      parameters: [],
      scoringRules: [],
      isActive: true,
      displayOrder: 0,
      maxScore: 100,
      uiConfig: {},
      metadata: {}
    });
  };

  const handleEdit = (indicator: IndicatorDefinition) => {
    setEditingIndicator(indicator);
    setIsCreating(false);
    setFormData({
      name: indicator.name,
      code: indicator.code,
      description: indicator.description,
      category: indicator.category,
      weight: indicator.weight,
      scoringMethod: indicator.scoringMethod,
      parameters: indicator.parameters || [],
      scoringRules: indicator.scoringRules || [],
      isActive: indicator.isActive,
      displayOrder: indicator.displayOrder,
      maxScore: indicator.maxScore || 100,
      uiConfig: indicator.uiConfig || {},
      metadata: indicator.metadata || {}
    });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this indicator?')) {
      await deleteIndicator(id, false);
    }
  };

  const handleToggleActive = async (indicator: IndicatorDefinition) => {
    const updateInput: UpdateIndicatorInput = {
      isActive: !indicator.isActive,
      updatedBy: 'admin' // Required field for updates
    };
    
    await updateIndicator(indicator.id, updateInput);
  };

  const handleReorder = async (indicatorId: string, direction: 'up' | 'down') => {
    const indicator = indicators.find(ind => ind.id === indicatorId);
    if (!indicator) return;

    const categoryIndicators = indicators
      .filter(ind => ind.category === indicator.category && ind.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);

    const currentIndex = categoryIndicators.findIndex(ind => ind.id === indicatorId);
    if (currentIndex === -1) return;

    let newIndex;
    if (direction === 'up' && currentIndex > 0) {
      newIndex = currentIndex - 1;
    } else if (direction === 'down' && currentIndex < categoryIndicators.length - 1) {
      newIndex = currentIndex + 1;
    } else {
      return;
    }

    // Swap display orders
    const tempOrder = categoryIndicators[currentIndex].displayOrder;
    categoryIndicators[currentIndex].displayOrder = categoryIndicators[newIndex].displayOrder;
    categoryIndicators[newIndex].displayOrder = tempOrder;

    // Create ordered IDs for the reorder API
    const orderedIds = categoryIndicators.map(ind => ind.id);
    
    await reorderIndicators(indicator.category, orderedIds);
  };

  const totalWeight = filteredIndicators.reduce((sum, ind) => sum + ind.weight, 0);

  if (loading && indicators.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Indicator Management</h2>
          <p className="text-gray-600">Manage scoring indicators and their parameters</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          New Indicator
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-lg shadow">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="showInactive"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="showInactive" className="ml-2 text-sm text-gray-700">
            Show inactive indicators
          </label>
        </div>
        <div className="ml-auto">
          <div className="text-sm font-medium">
            Total Weight: <span className={Math.abs(totalWeight - 100) < 0.01 ? 'text-green-600' : 'text-red-600'}>
              {totalWeight.toFixed(1)}%
            </span>
            {Math.abs(totalWeight - 100) > 0.01 && (
              <span className="text-red-500 text-xs ml-2">
                (Must equal 100%)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <XMarkIcon className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={clearError}
                className="text-red-500 hover:text-red-700"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Validation Errors */}
      {validationResult && validationResult.errors.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <h3 className="text-sm font-medium text-red-800">Validation Errors</h3>
          <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
            {validationResult.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
          {validationResult.warnings && validationResult.warnings.length > 0 && (
            <>
              <h3 className="text-sm font-medium text-yellow-800 mt-3">Warnings</h3>
              <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
                {validationResult.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {/* Create/Edit Form */}
      {(isCreating || editingIndicator) && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {isCreating ? 'Create New Indicator' : 'Edit Indicator'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  onBlur={generateCodeFromName}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code *
                </label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                  pattern="^[a-z][a-z0-9_]*$"
                  title="Lowercase with underscores (e.g., iccs_framework)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {categories.filter(c => c.value !== 'all').map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weight (%) *
                </label>
                <input
                  type="number"
                  name="weight"
                  value={formData.weight}
                  onChange={handleInputChange}
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Score *
                </label>
                <input
                  type="number"
                  name="maxScore"
                  value={formData.maxScore || 100}
                  onChange={handleInputChange}
                  min="0"
                  step="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scoring Method *
                </label>
                <select
                  name="scoringMethod"
                  value={formData.scoringMethod}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {SCORING_METHODS.map(method => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Active
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setEditingIndicator(null);
                  resetForm();
                  clearValidation();
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {isCreating ? 'Create' : 'Update'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Indicators List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name / Code
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Weight
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scoring Method
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Parameters
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredIndicators.map((indicator) => (
                <tr key={indicator.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {indicator.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {indicator.code}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {INDICATOR_CATEGORIES.find(c => c.value === indicator.category)?.label || indicator.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {indicator.weight}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="capitalize">
                      {SCORING_METHODS.find(m => m.value === indicator.scoringMethod)?.label || indicator.scoringMethod}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex flex-wrap gap-1">
                      {indicator.parameters?.slice(0, 3).map(param => (
                        <span key={param.code} className="px-2 py-1 text-xs bg-gray-100 rounded">
                          {param.code}
                        </span>
                      ))}
                      {indicator.parameters && indicator.parameters.length > 3 && (
                        <span className="px-2 py-1 text-xs bg-gray-100 rounded">
                          +{indicator.parameters.length - 3} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      indicator.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {indicator.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleToggleActive(indicator)}
                        className="text-gray-400 hover:text-gray-600"
                        title={indicator.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {indicator.isActive ? (
                          <EyeSlashIcon className="h-5 w-5" />
                        ) : (
                          <EyeIcon className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleReorder(indicator.id, 'up')}
                        className="text-gray-400 hover:text-gray-600"
                        title="Move up"
                      >
                        <ArrowUpIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleReorder(indicator.id, 'down')}
                        className="text-gray-400 hover:text-gray-600"
                        title="Move down"
                      >
                        <ArrowDownIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleEdit(indicator)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(indicator.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                      {onIndicatorSelect && (
                        <button
                          onClick={() => onIndicatorSelect(indicator)}
                          className="text-green-600 hover:text-green-900"
                          title="Select"
                        >
                          <CheckIcon className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredIndicators.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-2">
              <PlusIcon className="h-12 w-12 mx-auto" />
            </div>
            <p className="text-gray-500">No indicators found</p>
            {!showInactive && (
              <p className="text-sm text-gray-400 mt-1">
                Try enabling "Show inactive indicators" or create a new indicator
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}