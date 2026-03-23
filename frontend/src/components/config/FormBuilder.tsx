// frontend/src/components/config/FormBuilder.tsx

import React, { useState, useEffect, useRef } from 'react';
import { 
  PlusIcon, 
  TrashIcon, 
  EyeIcon, 
  DocumentDuplicateIcon,
  DocumentIcon,
  XMarkIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';
import { useIndicatorConfig } from '../../hooks/useIndicatorConfig';
import type { 
  FormTemplate, 
  FormSection, 
  FormField, 
  TemplateType,
  IndicatorDefinition 
} from '../../types/config';

interface FormBuilderProps {
  template?: FormTemplate;
  onSave: (template: FormTemplate) => Promise<void>;
  onCancel?: () => void;
  onPreview?: (template: FormTemplate) => void;
  mode?: 'create' | 'edit';
}

const templateTypes: { value: TemplateType; label: string }[] = [
  { value: 'assessment', label: 'Assessment Form' },
  { value: 'report', label: 'Report Template' },
  { value: 'data_collection', label: 'Data Collection Form' },
  { value: 'custom', label: 'Custom Template' }
];

const columnOptions = [
  { value: 1, label: '1 Column' },
  { value: 2, label: '2 Columns' },
  { value: 3, label: '3 Columns' }
];

export default function FormBuilder({ 
  template, 
  onSave, 
  onCancel, 
  onPreview,
  mode = 'create'
}: FormBuilderProps) {
  const { indicators, loadIndicators } = useIndicatorConfig();
  
  // Initialize form data with the exact FormTemplate structure
  const [formData, setFormData] = useState<FormTemplate>(
    template || {
      id: `tpl_${Date.now()}`,
      name: '',
      description: '',
      templateType: 'assessment',
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
      createdBy: '',
      updatedBy: ''
    }
  );

  const [selectedSection, setSelectedSection] = useState<FormSection | null>(null);
  const [selectedField, setSelectedField] = useState<FormField | null>(null);
  const [showFieldSelector, setShowFieldSelector] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [availableIndicators, setAvailableIndicators] = useState<IndicatorDefinition[]>([]);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  useEffect(() => {
    loadIndicators({ activeOnly: true, includeParameters: true });
  }, []);

  useEffect(() => {
    if (indicators.length > 0) {
      setAvailableIndicators(indicators);
    }
  }, [indicators]);

  useEffect(() => {
    if (template) {
      setFormData(template);
    }
  }, [template]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'templateType') {
      setFormData(prev => ({ ...prev, templateType: value as TemplateType }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAddSection = () => {
    // Calculate the next display order
    const nextDisplayOrder = formData.sections.length > 0 
      ? Math.max(...formData.sections.map(s => s.displayOrder || 0)) + 1
      : 1;
    
    const newSection: FormSection = {
      id: `section_${Date.now()}`,
      title: 'New Section',
      description: '',
      columns: 1,
      fields: [],
      displayOrder: nextDisplayOrder
    };
    
    setFormData(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));
    setSelectedSection(newSection);
  };

  const handleUpdateSection = (sectionId: string, updates: Partial<FormSection>) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map(section => 
        section.id === sectionId ? { ...section, ...updates } : section
      )
    }));
  };

  const handleDeleteSection = (sectionId: string) => {
    const updatedSections = formData.sections
      .filter(section => section.id !== sectionId)
      .map((section, index) => ({ ...section, displayOrder: index + 1 }));
    
    setFormData(prev => ({
      ...prev,
      sections: updatedSections
    }));
    
    if (selectedSection?.id === sectionId) {
      setSelectedSection(null);
    }
  };

  const handleDuplicateSection = (section: FormSection) => {
    // Calculate the next display order
    const nextDisplayOrder = formData.sections.length > 0 
      ? Math.max(...formData.sections.map(s => s.displayOrder || 0)) + 1
      : 1;
    
    const newSection: FormSection = {
      ...section,
      id: `section_${Date.now()}`,
      title: `${section.title} (Copy)`,
      fields: section.fields.map(field => ({
        ...field,
        id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        displayOrder: field.displayOrder // Keep the same display order within section
      })),
      displayOrder: nextDisplayOrder
    };
    
    setFormData(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));
  };

  const handleAddField = (indicator: IndicatorDefinition, parameterCode: string) => {
    if (!selectedSection) return;

    const parameter = indicator.parameters.find(p => p.code === parameterCode);
    if (!parameter) return;

    // Calculate the next display order within the section
    const nextDisplayOrder = selectedSection.fields.length > 0
      ? Math.max(...selectedSection.fields.map(f => f.displayOrder || 0)) + 1
      : 1;

    const newField: FormField = {
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      parameterCode: parameterCode,
      indicatorId: indicator.id,
      label: parameter.label,
      type: parameter.type,
      required: parameter.required || false,
      width: 100,
      displayOrder: nextDisplayOrder,
      uiSettings: parameter.uiSettings || {}
    };

    const updatedSections = formData.sections.map(section => 
      section.id === selectedSection.id 
        ? { 
            ...section, 
            fields: [...section.fields, newField].map((field, idx) => ({
              ...field,
              displayOrder: idx + 1
            }))
          }
        : section
    );

    setFormData(prev => ({
      ...prev,
      sections: updatedSections
    }));
    
    // Update selected section reference
    const updatedSection = updatedSections.find(s => s.id === selectedSection.id);
    if (updatedSection) {
      setSelectedSection(updatedSection);
    }
    
    setShowFieldSelector(false);
  };

  const handleUpdateField = (sectionId: string, fieldId: string, updates: Partial<FormField>) => {
    const updatedSections = formData.sections.map(section => {
      if (section.id !== sectionId) return section;
      
      return {
        ...section,
        fields: section.fields.map(field => 
          field.id === fieldId ? { ...field, ...updates } : field
        )
      };
    });

    setFormData(prev => ({ ...prev, sections: updatedSections }));
    
    // Update selected section reference
    const updatedSection = updatedSections.find(s => s.id === sectionId);
    if (updatedSection && selectedSection?.id === sectionId) {
      setSelectedSection(updatedSection);
    }
  };

  const handleDeleteField = (sectionId: string, fieldId: string) => {
    const updatedSections = formData.sections.map(section => {
      if (section.id !== sectionId) return section;
      
      const filteredFields = section.fields.filter(field => field.id !== fieldId);
      return {
        ...section,
        fields: filteredFields.map((field, idx) => ({
          ...field,
          displayOrder: idx + 1
        }))
      };
    });

    setFormData(prev => ({ ...prev, sections: updatedSections }));
    
    // Update selected section reference
    const updatedSection = updatedSections.find(s => s.id === sectionId);
    if (updatedSection && selectedSection?.id === sectionId) {
      setSelectedSection(updatedSection);
    }
    
    if (selectedField?.id === fieldId) {
      setSelectedField(null);
    }
  };

  const handleMoveField = (sectionId: string, fieldId: string, direction: 'up' | 'down') => {
    const section = formData.sections.find(s => s.id === sectionId);
    if (!section || section.fields.length <= 1) return;

    const fieldIndex = section.fields.findIndex(f => f.id === fieldId);
    if (
      (direction === 'up' && fieldIndex === 0) ||
      (direction === 'down' && fieldIndex === section.fields.length - 1)
    ) {
      return;
    }

    const newFields = [...section.fields];
    const swapIndex = direction === 'up' ? fieldIndex - 1 : fieldIndex + 1;
    
    // Swap positions
    [newFields[fieldIndex], newFields[swapIndex]] = [newFields[swapIndex], newFields[fieldIndex]];
    
    // Update display orders
    const updatedFields = newFields.map((field, idx) => ({
      ...field,
      displayOrder: idx + 1
    }));

    const updatedSections = formData.sections.map(s => 
      s.id === sectionId ? { ...s, fields: updatedFields } : s
    );

    setFormData(prev => ({ ...prev, sections: updatedSections }));
    
    // Update selected section reference
    const updatedSection = updatedSections.find(s => s.id === sectionId);
    if (updatedSection && selectedSection?.id === sectionId) {
      setSelectedSection(updatedSection);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragItem.current = index;
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    dragOverItem.current = index;
    e.preventDefault();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    
    if (dragItem.current === null || dragOverItem.current === null || 
        dragItem.current === dragOverItem.current) {
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }
    
    const sections = [...formData.sections];
    const draggedItem = sections[dragItem.current];
    
    sections.splice(dragItem.current, 1);
    sections.splice(dragOverItem.current, 0, draggedItem);
    
    // Update display orders
    const updatedSections = sections.map((section, index) => ({
      ...section,
      displayOrder: index + 1
    }));
    
    setFormData(prev => ({ ...prev, sections: updatedSections }));
    
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!formData.name.trim()) {
      errors.push('Template name is required');
    }

    if (!formData.templateType) {
      errors.push('Template type is required');
    }

    if (formData.sections.length === 0) {
      errors.push('At least one section is required');
    } else {
      formData.sections.forEach((section, index) => {
        if (!section.title.trim()) {
          errors.push(`Section ${index + 1}: Title is required`);
        }
        
        // Validate each field in the section
        section.fields.forEach((field, fieldIndex) => {
          if (!field.parameterCode) {
            errors.push(`Section ${index + 1}, Field ${fieldIndex + 1}: Parameter code is required`);
          }
          if (!field.label) {
            errors.push(`Section ${index + 1}, Field ${fieldIndex + 1}: Label is required`);
          }
          if (!field.type) {
            errors.push(`Section ${index + 1}, Field ${fieldIndex + 1}: Field type is required`);
          }
          if (field.width && (field.width < 1 || field.width > 100)) {
            errors.push(`Section ${index + 1}, Field ${fieldIndex + 1}: Width must be between 1 and 100`);
          }
        });
      });
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
      // Collect all indicator IDs from fields
      const indicatorIds = new Set<string>();
      formData.sections.forEach(section => {
        section.fields.forEach(field => {
          if (field.indicatorId) {
            indicatorIds.add(field.indicatorId);
          }
        });
      });

      // Ensure all sections and fields have proper displayOrder
      const processedSections = formData.sections.map((section, sectionIndex) => ({
        ...section,
        displayOrder: section.displayOrder || sectionIndex + 1,
        fields: section.fields.map((field, fieldIndex) => ({
          ...field,
          displayOrder: field.displayOrder || fieldIndex + 1,
          width: field.width || 100
        }))
      }));

      const finalTemplate: FormTemplate = {
        ...formData,
        sections: processedSections,
        indicatorIds: Array.from(indicatorIds),
        updatedAt: new Date().toISOString(),
        version: mode === 'edit' ? formData.version : '1.0.0'
      };

      await onSave(finalTemplate);
    } catch (error) {
      setValidationErrors([error instanceof Error ? error.message : 'Failed to save form template']);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    if (template) {
      setFormData(template);
    } else {
      setFormData({
        id: `tpl_${Date.now()}`,
        name: '',
        description: '',
        templateType: 'assessment',
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
        createdBy: '',
        updatedBy: ''
      });
    }
    setValidationErrors([]);
    setSelectedSection(null);
    setSelectedField(null);
  };

  const renderFieldPreview = (field: FormField) => {
    const indicator = availableIndicators.find(ind => ind.id === field.indicatorId);
    const parameter = indicator?.parameters.find(p => p.code === field.parameterCode);
    
    if (!parameter) {
      return (
        <div className="p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-sm text-red-600">Parameter not found: {field.parameterCode}</p>
        </div>
      );
    }

    const fieldUiSettings = field.uiSettings || {};
    const paramUiSettings = parameter.uiSettings || {};

    switch (parameter.type) {
      case 'text':
      case 'textarea':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            {parameter.type === 'textarea' ? (
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
                placeholder={fieldUiSettings.placeholder || paramUiSettings.placeholder || `Enter ${field.label.toLowerCase()}`}
                disabled
              />
            ) : (
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder={fieldUiSettings.placeholder || paramUiSettings.placeholder || `Enter ${field.label.toLowerCase()}`}
                disabled
              />
            )}
            {(fieldUiSettings.help_text || paramUiSettings.helpText) && (
              <p className="mt-1 text-xs text-gray-500">{fieldUiSettings.help_text || paramUiSettings.helpText}</p>
            )}
          </div>
        );

      case 'number':
      case 'percentage':
      case 'range':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <input
              type="number"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder={fieldUiSettings.placeholder || paramUiSettings.placeholder || `Enter ${field.label.toLowerCase()}`}
              disabled
            />
          </div>
        );

      case 'select':
      case 'radio':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <select 
              className="w-full px-3 py-2 border border-gray-300 rounded-md" 
              disabled
            >
              <option value="">Select an option</option>
              {parameter.options?.map((opt, idx) => (
                <option key={idx} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        );

      case 'checkbox':
      case 'boolean':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              disabled
            />
            <label className="ml-2 text-sm text-gray-700">
              {field.label}
            </label>
          </div>
        );

      case 'date':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              disabled
            />
          </div>
        );

      case 'file':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <input
              type="file"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              disabled
            />
          </div>
        );

      default:
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              disabled
            />
          </div>
        );
    }
  };

  const getIndicatorDisplayName = (indicatorId?: string) => {
    if (!indicatorId) return 'Unknown';
    const indicator = availableIndicators.find(ind => ind.id === indicatorId);
    return indicator ? indicator.name : 'Unknown Indicator';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {mode === 'edit' ? 'Edit Form Template' : 'Create Form Template'}
          </h2>
          <p className="text-gray-600">
            Build dynamic forms by adding sections and fields from available indicators
          </p>
        </div>
        <div className="flex space-x-3">
          {onPreview && (
            <button
              type="button"
              onClick={() => onPreview(formData)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center"
            >
              <EyeIcon className="h-5 w-5 mr-2" />
              Preview
            </button>
          )}
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
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {mode === 'edit' ? 'Update Template' : 'Create Template'}
          </button>
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <ul className="text-sm text-red-700 list-disc list-inside">
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Template Configuration */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Template Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Type *
            </label>
            <select
              name="templateType"
              value={formData.templateType}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
            >
              {templateTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description || ''}
              onChange={handleInputChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe the purpose of this form template"
            />
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
              Template is active
            </label>
          </div>
        </div>
      </div>

      {/* Sections Management */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Sections</h3>
            <button
              type="button"
              onClick={handleAddSection}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Section
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Drag and drop sections to reorder them
          </p>
        </div>

        {formData.sections.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {formData.sections
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((section, index) => (
                <div
                  key={section.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnter={(e) => handleDragEnter(e, index)}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  className={`p-6 hover:bg-gray-50 ${isDragging ? 'opacity-50' : ''} ${
                    selectedSection?.id === section.id ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedSection(section)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-500 mr-2">
                          {section.displayOrder}.
                        </span>
                        <h4 className="text-lg font-medium text-gray-900">
                          {section.title}
                        </h4>
                        {section.description && (
                          <p className="ml-4 text-sm text-gray-600">
                            {section.description}
                          </p>
                        )}
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500">
                        <DocumentIcon className="h-4 w-4 mr-1" />
                        <span>{section.fields.length} fields</span>
                        <span className="mx-2">•</span>
                        <span>{section.columns} column(s)</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateSection(section);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                        title="Duplicate section"
                      >
                        <DocumentDuplicateIcon className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSection(section.id);
                        }}
                        className="text-red-400 hover:text-red-600"
                        title="Delete section"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {selectedSection?.id === section.id && (
                    <div className="mt-4 space-y-4">
                      {/* Section Configuration */}
                      <div className="bg-gray-50 p-4 rounded-md">
                        <h5 className="text-sm font-medium text-gray-900 mb-3">
                          Section Configuration
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Title *
                            </label>
                            <input
                              type="text"
                              value={section.title}
                              onChange={(e) => handleUpdateSection(section.id, { title: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Columns
                            </label>
                            <select
                              value={section.columns}
                              onChange={(e) => handleUpdateSection(section.id, { columns: parseInt(e.target.value) })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            >
                              {columnOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Description
                            </label>
                            <textarea
                              value={section.description || ''}
                              onChange={(e) => handleUpdateSection(section.id, { description: e.target.value })}
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Optional section description"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Fields in Section */}
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <h5 className="text-sm font-medium text-gray-900">
                            Fields ({section.fields.length})
                          </h5>
                          <button
                            type="button"
                            onClick={() => setShowFieldSelector(true)}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 flex items-center"
                          >
                            <PlusIcon className="h-4 w-4 mr-1" />
                            Add Field
                          </button>
                        </div>

                        {section.fields.length > 0 ? (
                          <div className="space-y-3">
                            {section.fields
                              .sort((a, b) => a.displayOrder - b.displayOrder)
                              .map((field) => (
                                <div
                                  key={field.id}
                                  className={`border rounded-md p-4 ${
                                    selectedField?.id === field.id ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                                  }`}
                                  onClick={() => setSelectedField(field)}
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <div className="flex items-center">
                                        <span className="text-sm font-medium text-gray-900">
                                          {field.label}
                                        </span>
                                        {field.required && (
                                          <span className="ml-2 text-xs text-red-500">Required</span>
                                        )}
                                      </div>
                                      <div className="text-xs text-gray-500 mt-1">
                                        <span className="bg-gray-100 px-2 py-1 rounded mr-2">
                                          {field.type}
                                        </span>
                                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                          {getIndicatorDisplayName(field.indicatorId)}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex space-x-2">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleMoveField(section.id, field.id, 'up');
                                        }}
                                        className="text-gray-400 hover:text-gray-600"
                                        disabled={field.displayOrder === 1}
                                      >
                                        <ArrowUpIcon className="h-4 w-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleMoveField(section.id, field.id, 'down');
                                        }}
                                        className="text-gray-400 hover:text-gray-600"
                                        disabled={field.displayOrder === section.fields.length}
                                      >
                                        <ArrowDownIcon className="h-4 w-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteField(section.id, field.id);
                                        }}
                                        className="text-red-400 hover:text-red-600"
                                      >
                                        <TrashIcon className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>

                                  {selectedField?.id === field.id && (
                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                          <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Label
                                          </label>
                                          <input
                                            type="text"
                                            value={field.label}
                                            onChange={(e) => handleUpdateField(section.id, field.id, { label: e.target.value })}
                                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                          />
                                        </div>
                                        <div className="flex items-center">
                                          <input
                                            type="checkbox"
                                            checked={field.required}
                                            onChange={(e) => handleUpdateField(section.id, field.id, { required: e.target.checked })}
                                            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                                          />
                                          <label className="ml-2 text-xs text-gray-700">
                                            Required field
                                          </label>
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Width (%)
                                          </label>
                                          <input
                                            type="number"
                                            value={field.width || 100}
                                            onChange={(e) => handleUpdateField(section.id, field.id, { width: parseInt(e.target.value) })}
                                            min="1"
                                            max="100"
                                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  <div className="mt-3">
                                    {renderFieldPreview(field)}
                                  </div>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 bg-gray-50 rounded-md">
                            <DocumentIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-500">No fields added yet</p>
                            <button
                              type="button"
                              onClick={() => setShowFieldSelector(true)}
                              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                            >
                              Click here to add fields
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <DocumentIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No sections created yet</p>
            <button
              type="button"
              onClick={handleAddSection}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center mx-auto"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create First Section
            </button>
          </div>
        )}
      </div>

      {/* Field Selector Modal */}
      {showFieldSelector && selectedSection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Add Field to "{selectedSection.title}"
                </h3>
                <button
                  onClick={() => setShowFieldSelector(false)}
                  className="text-gray-400 hover:text-gray-600"
                  type="button"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Indicators List */}
                <div className="md:col-span-1">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Indicators</h4>
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {availableIndicators.map(indicator => (
                      <div
                        key={indicator.id}
                        className="p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer"
                        onClick={() => {
                          // Auto-select first parameter if only one exists
                          if (indicator.parameters.length === 1) {
                            handleAddField(indicator, indicator.parameters[0].code);
                          }
                        }}
                      >
                        <div className="font-medium text-gray-900">{indicator.name}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {indicator.parameters.length} parameters
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Parameters List */}
                <div className="md:col-span-2">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Parameters</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
                    {availableIndicators.flatMap(indicator =>
                      indicator.parameters.map(parameter => (
                        <div
                          key={`${indicator.id}-${parameter.code}`}
                          className="border border-gray-200 rounded-md p-4 hover:border-blue-300 hover:bg-blue-50 cursor-pointer"
                          onClick={() => handleAddField(indicator, parameter.code)}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium text-gray-900">
                                {parameter.label}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {parameter.code}
                              </div>
                            </div>
                            <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-800 rounded">
                              {parameter.type}
                            </span>
                          </div>
                          <div className="mt-2 text-xs text-gray-600">
                            From: <span className="font-medium">{indicator.name}</span>
                          </div>
                          {parameter.description && (
                            <p className="mt-2 text-xs text-gray-500">
                              {parameter.description}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowFieldSelector(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}