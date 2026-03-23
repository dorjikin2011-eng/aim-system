// frontend/src/components/config/ParameterEditor.tsx
import React, { useState, useEffect } from 'react';
import type { 
  ParameterDefinition, 
  ParameterType, 
  CalculationConfig, 
  CalculationType,
  CalculationDetails,
  PercentageConfig
} from '../../types/config';
import { 
  PlusIcon, 
  TrashIcon, 
  PencilIcon, 
  ChevronUpIcon, 
  ChevronDownIcon,
  CalculatorIcon
} from '@heroicons/react/24/outline';

interface ParameterEditorProps {
  parameter?: ParameterDefinition;
  onSave: (parameter: ParameterDefinition) => Promise<void>;
  onCancel?: () => void;
  onDelete?: (parameterId?: string) => void;
}

export default function ParameterEditor({ 
  parameter, 
  onSave, 
  onCancel, 
  onDelete 
}: ParameterEditorProps) {
  const [formData, setFormData] = useState<Partial<ParameterDefinition>>(
    parameter || {
      code: '',
      label: '',
      type: 'text' as ParameterType,
      description: '',
      required: false,
      defaultValue: '',
      options: [],
      validation: {},
      uiSettings: {},
      calculationConfig: {
        calculationType: 'manual',
        autoCalculate: false,
        allowManualOverride: false,
        showCalculation: false
      },
      scoringRuleIds: [],
      dependencies: [],
      displayOrder: 0,
      isActive: true
    }
  );

  const [newOption, setNewOption] = useState({ label: '', value: '' });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [calculationDetails, setCalculationDetails] = useState<Partial<CalculationDetails>>({});

  const parameterTypes: { value: ParameterType; label: string; description?: string }[] = [
    { value: 'text', label: 'Text', description: 'Text input' },
    { value: 'number', label: 'Number', description: 'Numeric input' },
    { value: 'textarea', label: 'Text Area', description: 'Multi-line text' },
    { value: 'select', label: 'Select Dropdown', description: 'Dropdown selection' },
    { value: 'radio', label: 'Radio Buttons', description: 'Single choice buttons' },
    { value: 'checkbox', label: 'Checkbox', description: 'Checkbox input' },
    { value: 'date', label: 'Date', description: 'Date picker' },
    { value: 'file', label: 'File Upload', description: 'File upload field' },
    { value: 'range', label: 'Range Slider', description: 'Slider input' },
    { value: 'percentage', label: 'Percentage', description: 'Percentage input (0-100)' },
    { value: 'boolean', label: 'Yes/No', description: 'Boolean toggle' },
    { value: 'raw_number_pair', label: 'Number Pair', description: 'Two numbers for percentage calculation' },
    { value: 'case_count_set', label: 'Case Count Set', description: 'Multiple case types with weights' },
    { value: 'system_status_set', label: 'System Status', description: 'System existence and functioning' }
  ];

  const calculationTypes: { value: CalculationType; label: string; description: string }[] = [
    { value: 'manual', label: 'Manual', description: 'Manual data entry and scoring' },
    { value: 'auto', label: 'Auto', description: 'Fully automatic calculation' },
    { value: 'mixed', label: 'Mixed', description: 'Auto-calculation with manual override' },
    { value: 'percentage', label: 'Percentage', description: 'Calculate from numerator/denominator' },
    { value: 'weighted_sum', label: 'Weighted Sum', description: 'Weighted sum of values' },
    { value: 'boolean_logic', label: 'Boolean Logic', description: 'AND/OR logic calculation' },
    { value: 'formula', label: 'Formula', description: 'Custom formula calculation' },
    { value: 'system_status', label: 'System Status', description: 'System existence and functioning scoring' }
  ];

  useEffect(() => {
    if (parameter) {
      setFormData(parameter);
      if (parameter.calculationConfig?.calculationDetails) {
        setCalculationDetails(parameter.calculationConfig.calculationDetails);
      }
    }
  }, [parameter]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (name.startsWith('validation.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        validation: {
          ...prev.validation,
          [field]: type === 'number' ? parseFloat(value) || undefined : value
        }
      }));
    } else if (name.startsWith('uiSettings.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        uiSettings: {
          ...prev.uiSettings,
          [field]: type === 'number' ? parseFloat(value) || undefined : value
        }
      }));
    } else if (name.startsWith('calculationConfig.')) {
      const field = name.split('.')[1];
      if (field === 'calculationType') {
        setFormData(prev => ({
          ...prev,
          calculationConfig: {
            calculationType: value as CalculationType,
            calculationDetails: {},
            autoCalculate: prev.calculationConfig?.autoCalculate || false,
            allowManualOverride: prev.calculationConfig?.allowManualOverride || false,
            showCalculation: prev.calculationConfig?.showCalculation || false,
            validationRules: prev.calculationConfig?.validationRules
          }
        }));
        setCalculationDetails({});
      } else {
        const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
                        type === 'number' ? parseFloat(value) : value;
        
        setFormData(prev => ({
          ...prev,
          calculationConfig: {
            calculationType: prev.calculationConfig?.calculationType || 'manual',
            autoCalculate: field === 'autoCalculate' ? newValue as boolean : prev.calculationConfig?.autoCalculate || false,
            allowManualOverride: field === 'allowManualOverride' ? newValue as boolean : prev.calculationConfig?.allowManualOverride || false,
            showCalculation: field === 'showCalculation' ? newValue as boolean : prev.calculationConfig?.showCalculation || false,
            calculationDetails: prev.calculationConfig?.calculationDetails,
            validationRules: prev.calculationConfig?.validationRules
          }
        }));
      }
    } else if (name.startsWith('calculationDetails.')) {
      const field = name.split('.')[1];
      const newValue = type === 'number' ? parseFloat(value) : value;
      setCalculationDetails(prev => ({
        ...prev,
        [field]: newValue
      }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAddOption = () => {
    if (!newOption.label.trim() || !newOption.value.trim()) {
      setValidationErrors(['Option label and value are required']);
      return;
    }

    if (formData.options?.some(opt => opt.value === newOption.value)) {
      setValidationErrors(['Option value must be unique']);
      return;
    }

    setFormData(prev => ({
      ...prev,
      options: [...(prev.options || []), { ...newOption }]
    }));
    setNewOption({ label: '', value: '' });
    setValidationErrors([]);
  };

  const handleRemoveOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options?.filter((_, i) => i !== index) || []
    }));
  };

  const handleMoveOption = (index: number, direction: 'up' | 'down') => {
    const options = [...(formData.options || [])];
    if (direction === 'up' && index > 0) {
      [options[index], options[index - 1]] = [options[index - 1], options[index]];
    } else if (direction === 'down' && index < options.length - 1) {
      [options[index], options[index + 1]] = [options[index + 1], options[index]];
    }
    setFormData(prev => ({ ...prev, options }));
  };

  const renderCalculationConfigFields = () => {
    const calculationType = formData.calculationConfig?.calculationType || 'manual';
    
    switch (calculationType) {
      case 'percentage':
        return (
          <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900">Percentage Calculation Configuration</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Numerator Parameter Code *
                </label>
                <input
                  type="text"
                  name="calculationDetails.numeratorField"
                  value={(calculationDetails as PercentageConfig)?.numeratorField || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., employees_completed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Numerator Label
                </label>
                <input
                  type="text"
                  name="calculationDetails.numeratorLabel"
                  value={(calculationDetails as PercentageConfig)?.numeratorLabel || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., Employees Completed e-Learning"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Denominator Parameter Code *
                </label>
                <input
                  type="text"
                  name="calculationDetails.denominatorField"
                  value={(calculationDetails as PercentageConfig)?.denominatorField || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., total_employees"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Denominator Label
                </label>
                <input
                  type="text"
                  name="calculationDetails.denominatorLabel"
                  value={(calculationDetails as PercentageConfig)?.denominatorLabel || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., Total Employees"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit
                </label>
                <input
                  type="text"
                  name="calculationDetails.unit"
                  value={(calculationDetails as PercentageConfig)?.unit || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., employees, officials, ATRs"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Decimal Precision
                </label>
                <input
                  type="number"
                  name="calculationDetails.precision"
                  value={(calculationDetails as PercentageConfig)?.precision || 2}
                  onChange={handleInputChange}
                  min="0"
                  max="4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>
        );

      case 'weighted_sum':
        return (
          <div className="space-y-4 p-4 bg-green-50 rounded-lg">
            <h4 className="text-sm font-medium text-green-900">Weighted Sum Configuration</h4>
            <div className="text-sm text-gray-600 mb-3">
              Define different case types with their weights
            </div>
            {/* Dynamic case type configuration would go here */}
          </div>
        );

      case 'system_status':
        return (
          <div className="space-y-4 p-4 bg-purple-50 rounded-lg">
            <h4 className="text-sm font-medium text-purple-900">System Status Configuration</h4>
            <div className="text-sm text-gray-600 mb-3">
              Define systems with existence and functioning fields
            </div>
            {/* Dynamic system configuration would go here */}
          </div>
        );

      default:
        return null;
    }
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!formData.code?.trim()) {
      errors.push('Parameter code is required');
    } else if (!/^[a-z][a-z0-9_]*$/.test(formData.code)) {
      errors.push('Parameter code must be lowercase with underscores (e.g., employee_count)');
    }

    if (!formData.label?.trim()) {
      errors.push('Parameter label is required');
    }

    if (!formData.type) {
      errors.push('Parameter type is required');
    }

    if (['select', 'radio'].includes(formData.type || '') && (!formData.options || formData.options.length === 0)) {
      errors.push('Select/Radio type requires at least one option');
    }

    if (formData.validation?.min !== undefined && formData.validation?.max !== undefined && 
        formData.validation.min > formData.validation.max) {
      errors.push('Min value cannot be greater than max value');
    }

    if (formData.validation?.minLength !== undefined && formData.validation?.maxLength !== undefined && 
        formData.validation.minLength > formData.validation.maxLength) {
      errors.push('Min length cannot be greater than max length');
    }

    // Validate calculation config for specific types
    const calcType = formData.calculationConfig?.calculationType;
    if (calcType === 'percentage') {
      const percentageConfig = calculationDetails as PercentageConfig;
      if (!percentageConfig?.numeratorField?.trim()) {
        errors.push('Numerator field is required for percentage calculation');
      }
      if (!percentageConfig?.denominatorField?.trim()) {
        errors.push('Denominator field is required for percentage calculation');
      }
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      // Build calculation config with details
      const calculationConfig: CalculationConfig = {
        calculationType: formData.calculationConfig?.calculationType || 'manual',
        autoCalculate: formData.calculationConfig?.autoCalculate || false,
        allowManualOverride: formData.calculationConfig?.allowManualOverride || false,
        showCalculation: formData.calculationConfig?.showCalculation || false,
        validationRules: formData.calculationConfig?.validationRules
      };

      // Add calculation details if they exist and are valid
      if (Object.keys(calculationDetails).length > 0) {
        // Clean up undefined values
        const cleanedDetails = Object.fromEntries(
  Object.entries(calculationDetails).filter(([_, v]) => v !== undefined)
);
        if (Object.keys(cleanedDetails).length > 0) {
          calculationConfig.calculationDetails = cleanedDetails as CalculationDetails;
        }
      }

      // Convert to proper ParameterDefinition
      const parameterToSave: ParameterDefinition = {
        id: formData.id,
        code: formData.code!,
        label: formData.label!,
        type: formData.type!,
        description: formData.description || '',
        required: formData.required || false,
        defaultValue: formData.defaultValue,
        options: formData.options || [],
        validation: formData.validation || {},
        uiSettings: formData.uiSettings || {},
        calculationConfig,
        scoringRuleIds: formData.scoringRuleIds || [],
        dependencies: formData.dependencies || [],
        displayOrder: formData.displayOrder || 0,
        isActive: formData.isActive !== false,
        weight: formData.weight,
        metadata: formData.metadata || {}
      };
      
      await onSave(parameterToSave);
      if (!parameter && onCancel) {
        onCancel();
      }
    } catch (error) {
      setValidationErrors([error instanceof Error ? error.message : 'Failed to save parameter']);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    if (parameter) {
      setFormData(parameter);
      setCalculationDetails(parameter.calculationConfig?.calculationDetails || {});
    } else {
      setFormData({
        code: '',
        label: '',
        type: 'text' as ParameterType,
        description: '',
        required: false,
        defaultValue: '',
        options: [],
        validation: {},
        uiSettings: {},
        calculationConfig: {
          calculationType: 'manual',
          autoCalculate: false,
          allowManualOverride: false,
          showCalculation: false
        },
        scoringRuleIds: [],
        dependencies: [],
        displayOrder: 0,
        isActive: true
      });
      setCalculationDetails({});
    }
    setValidationErrors([]);
  };

  const renderTypeSpecificFields = () => {
    switch (formData.type) {
      case 'select':
      case 'radio':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Options *
              </label>
              <div className="space-y-2">
                {formData.options?.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2 bg-gray-50 p-2 rounded">
                    <span className="text-sm text-gray-500 w-8">{index + 1}.</span>
                    <span className="flex-1 text-sm">{option.label}</span>
                    <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded border">
                      {option.value}
                    </span>
                    <div className="flex space-x-1">
                      <button
                        type="button"
                        onClick={() => handleMoveOption(index, 'up')}
                        disabled={index === 0}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      >
                        <ChevronUpIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveOption(index, 'down')}
                        disabled={index === (formData.options?.length || 0) - 1}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      >
                        <ChevronDownIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(index)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex space-x-2">
                <input
                  type="text"
                  placeholder="Option label"
                  value={newOption.label}
                  onChange={(e) => setNewOption(prev => ({ ...prev, label: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                <input
                  type="text"
                  placeholder="Option value"
                  value={newOption.value}
                  onChange={(e) => setNewOption(prev => ({ ...prev, value: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        );

      case 'number':
      case 'percentage':
      case 'range':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Value
              </label>
              <input
                type="number"
                name="validation.min"
                value={formData.validation?.min || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maximum Value
              </label>
              <input
                type="number"
                name="validation.max"
                value={formData.validation?.max || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Step
              </label>
              <input
                type="number"
                name="uiSettings.step"
                value={formData.uiSettings?.step || ''}
                onChange={handleInputChange}
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            {formData.type === 'range' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Range Display
                </label>
                <input
                  type="text"
                  name="uiSettings.rangeDisplay"
                  value={formData.uiSettings?.rangeDisplay || ''}
                  onChange={handleInputChange}
                  placeholder="e.g., 0-100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          {parameter ? 'Edit Parameter' : 'Add New Parameter'}
        </h3>
        {parameter && onDelete && (
          <button
            onClick={() => onDelete(parameter.id)}
            className="text-red-600 hover:text-red-900"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {validationErrors.length > 0 && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <ul className="text-sm text-red-700 list-disc list-inside">
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Parameter Code *
            </label>
            <input
              type="text"
              name="code"
              value={formData.code || ''}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
              pattern="^[a-z][a-z0-9_]*$"
              title="Lowercase with underscores (e.g., employee_count)"
            />
            <p className="mt-1 text-xs text-gray-500">
              Used in formulas and database. Lowercase with underscores.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Label *
            </label>
            <input
              type="text"
              name="label"
              value={formData.label || ''}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Field Type *
            </label>
            <select
              name="type"
              value={formData.type || 'text'}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
            >
              {parameterTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label} {type.description && `- ${type.description}`}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              name="required"
              checked={formData.required || false}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-gray-700">
              Required field
            </label>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description || ''}
            onChange={handleInputChange}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Help text shown to users"
          />
        </div>

        {/* Default Value */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Default Value
          </label>
          <input
            type="text"
            name="defaultValue"
            value={formData.defaultValue || ''}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Pre-filled value (optional)"
          />
        </div>

        {/* Type-specific fields */}
        {renderTypeSpecificFields()}

        {/* Calculation Configuration */}
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900 flex items-center">
              <CalculatorIcon className="h-5 w-5 mr-2 text-blue-600" />
              Auto-Scoring Configuration
            </h4>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="calculationConfig.showCalculation"
                checked={formData.calculationConfig?.showCalculation || false}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="text-sm text-gray-700">
                Show calculation in UI
              </label>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Calculation Type *
              </label>
              <select
                name="calculationConfig.calculationType"
                value={formData.calculationConfig?.calculationType || 'manual'}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                {calculationTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label} - {type.description}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="calculationConfig.autoCalculate"
                  checked={formData.calculationConfig?.autoCalculate || false}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Auto-calculate
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="calculationConfig.allowManualOverride"
                  checked={formData.calculationConfig?.allowManualOverride || false}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Allow manual override
                </label>
              </div>
            </div>
          </div>

          {/* Calculation-specific configuration */}
          {formData.calculationConfig?.calculationType !== 'manual' && (
            <div className="mt-4">
              {renderCalculationConfigFields()}
            </div>
          )}
        </div>

        {/* UI Settings */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-900">UI Settings</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Placeholder Text
              </label>
              <input
                type="text"
                name="uiSettings.placeholder"
                value={formData.uiSettings?.placeholder || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Enter employee name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Help Text
              </label>
              <input
                type="text"
                name="uiSettings.helpText"
                value={formData.uiSettings?.helpText || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Additional guidance for users"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Width (% or px)
              </label>
              <input
                type="text"
                name="uiSettings.width"
                value={formData.uiSettings?.width || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 100% or 300px"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                name="uiSettings.disabled"
                checked={formData.uiSettings?.disabled || false}
                onChange={(e) => {
                  const { checked } = e.target;
                  setFormData(prev => ({
                    ...prev,
                    uiSettings: {
                      ...prev.uiSettings,
                      disabled: checked
                    }
                  }));
                }}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Disabled (read-only)
              </label>
            </div>
          </div>
        </div>

        {/* Additional Properties */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-900">Additional Properties</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Order
              </label>
              <input
                type="number"
                name="displayOrder"
                value={formData.displayOrder || 0}
                onChange={handleInputChange}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Weight (for scoring)
              </label>
              <input
                type="number"
                name="weight"
                value={formData.weight || ''}
                onChange={handleInputChange}
                min="0"
                max="100"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dependencies (comma-separated parameter codes)
              </label>
              <input
                type="text"
                name="dependencies"
                value={formData.dependencies?.join(', ') || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  const dependencies = value.split(',').map(s => s.trim()).filter(s => s);
                  setFormData(prev => ({ ...prev, dependencies }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., department, employment_type"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Linked Scoring Rules (comma-separated rule IDs)
              </label>
              <input
                type="text"
                name="scoringRuleIds"
                value={formData.scoringRuleIds?.join(', ') || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  const scoringRuleIds = value.split(',').map(s => s.trim()).filter(s => s);
                  setFormData(prev => ({ ...prev, scoringRuleIds }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., rule_123, rule_456"
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          {onCancel && (
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
          >
            {parameter ? (
              <>
                <PencilIcon className="h-4 w-4 mr-2" />
                Update Parameter
              </>
            ) : (
              <>
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Parameter
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}