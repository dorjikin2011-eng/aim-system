// frontend/src/components/config/MaturityLevelEditor.tsx

import React, { useState } from 'react';
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import type {
  MaturityLevel,
  MaturityLevelDefinition,
  MaturityParameter,
  MaturityFramework
} from '../../types/maturity';

interface MaturityLevelEditorProps {
  /** The maturity framework being edited */
  framework: MaturityFramework;
  
  /** Callback when framework changes */
  onChange: (framework: MaturityFramework) => void;
  
  /** Callback when save is requested */
  onSave?: () => void;
  
  /** Callback when cancel is requested */
  onCancel?: () => void;
  
  /** Is the editor in read-only mode? */
  readOnly?: boolean;
  
  /** Show validation warnings? */
  showValidation?: boolean;
}

interface EditingParameter {
  levelIndex: number;
  parameterIndex: number;
  parameter: MaturityParameter;
}

interface EditingLevel {
  index: number;
  name: string;
  description: string;
  points: number;
}

export const MaturityLevelEditor: React.FC<MaturityLevelEditorProps> = ({
  framework,
  onChange,
  onSave,
  onCancel,
  readOnly = false,
  showValidation = true
}) => {
  const [expandedLevels, setExpandedLevels] = useState<number[]>([1, 2, 3]); // Auto-expand levels 1-3 by default
  const [editingParameter, setEditingParameter] = useState<EditingParameter | null>(null);
  const [editingLevel, setEditingLevel] = useState<EditingLevel | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  // Toggle level expansion
  const toggleLevel = (level: number) => {
    setExpandedLevels(prev =>
      prev.includes(level)
        ? prev.filter(l => l !== level)
        : [...prev, level]
    );
  };

  // Update level details
  const handleLevelUpdate = (levelIndex: number, updates: Partial<MaturityLevelDefinition>) => {
    const newLevels = [...framework.levels];
    newLevels[levelIndex] = { ...newLevels[levelIndex], ...updates };
    onChange({ ...framework, levels: newLevels });
  };

  // Add a new parameter to a level
  const handleAddParameter = (levelIndex: number) => {
    const newLevels = [...framework.levels];
    const level = newLevels[levelIndex];
    const newParam: MaturityParameter = {
      id: `param_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      code: `${level.level}.${level.parameters.length + 1}`,
      description: '',
      whatToLookFor: '',
      required: true,
      displayOrder: level.parameters.length
    };
    level.parameters.push(newParam);
    onChange({ ...framework, levels: newLevels });
    
    // Auto-edit the new parameter
    setEditingParameter({
      levelIndex,
      parameterIndex: level.parameters.length - 1,
      parameter: newParam
    });
  };

  // Update a parameter
  const handleParameterUpdate = (
    levelIndex: number,
    parameterIndex: number,
    updates: Partial<MaturityParameter>
  ) => {
    const newLevels = [...framework.levels];
    const param = newLevels[levelIndex].parameters[parameterIndex];
    newLevels[levelIndex].parameters[parameterIndex] = { ...param, ...updates };
    onChange({ ...framework, levels: newLevels });

    // Update editing state if this is the currently edited parameter
    if (editingParameter && 
        editingParameter.levelIndex === levelIndex && 
        editingParameter.parameterIndex === parameterIndex) {
      setEditingParameter({
        ...editingParameter,
        parameter: { ...param, ...updates }
      });
    }
  };

  // Delete a parameter
  const handleDeleteParameter = (levelIndex: number, parameterIndex: number) => {
    if (!window.confirm('Are you sure you want to delete this parameter?')) return;

    const newLevels = [...framework.levels];
    newLevels[levelIndex].parameters.splice(parameterIndex, 1);
    
    // Reorder remaining parameter codes
    newLevels[levelIndex].parameters.forEach((param, idx) => {
      param.code = `${newLevels[levelIndex].level}.${idx + 1}`;
      param.displayOrder = idx;
    });
    
    onChange({ ...framework, levels: newLevels });
    
    if (editingParameter && 
        editingParameter.levelIndex === levelIndex && 
        editingParameter.parameterIndex === parameterIndex) {
      setEditingParameter(null);
    }
  };

  // Move parameter up/down
  const moveParameter = (levelIndex: number, parameterIndex: number, direction: 'up' | 'down') => {
    const newLevels = [...framework.levels];
    const params = newLevels[levelIndex].parameters;
    
    if (direction === 'up' && parameterIndex > 0) {
      [params[parameterIndex], params[parameterIndex - 1]] = [params[parameterIndex - 1], params[parameterIndex]];
    } else if (direction === 'down' && parameterIndex < params.length - 1) {
      [params[parameterIndex], params[parameterIndex + 1]] = [params[parameterIndex + 1], params[parameterIndex]];
    } else {
      return;
    }
    
    // Reorder codes
    params.forEach((param, idx) => {
      param.code = `${newLevels[levelIndex].level}.${idx + 1}`;
      param.displayOrder = idx;
    });
    
    onChange({ ...framework, levels: newLevels });
  };

  // Validate the framework
  const validateFramework = () => {
    const errors: Record<string, string[]> = {};
    
    framework.levels.forEach(level => {
      const levelErrors: string[] = [];
      
      if (!level.name) {
        levelErrors.push('Level name is required');
      }
      
      if (level.points <= 0) {
        levelErrors.push('Points must be greater than 0');
      }
      
      if (level.parameters.length === 0) {
        levelErrors.push('At least one parameter is required');
      }
      
      level.parameters.forEach((param, idx) => {
        if (!param.description) {
          levelErrors.push(`Parameter ${idx + 1}: Description required`);
        }
      });
      
      if (levelErrors.length > 0) {
        errors[`level_${level.level}`] = levelErrors;
      }
    });
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle save
  const handleSave = () => {
    if (validateFramework()) {
      onSave?.();
    }
  };

  // Get level name with points
  const getLevelHeader = (level: MaturityLevelDefinition) => {
    const names: Record<MaturityLevel, string> = {
      0: 'Nascent',
      1: 'Foundational',
      2: 'Established',
      3: 'Advanced'
    };
    return `${names[level.level]} (${level.points} points)`;
  };

  // Parameter Editor Component
  const ParameterEditor = ({ 
    levelIndex, 
    parameterIndex, 
    parameter 
  }: { 
    levelIndex: number; 
    parameterIndex: number; 
    parameter: MaturityParameter;
  }) => {
    const [localParam, setLocalParam] = useState(parameter);

    const handleSave = () => {
      handleParameterUpdate(levelIndex, parameterIndex, localParam);
      setEditingParameter(null);
    };

    const handleCancel = () => {
      setEditingParameter(null);
    };

    return (
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-3">
        <div className="flex justify-between items-center mb-3">
          <h5 className="text-sm font-medium text-blue-900">
            Edit Parameter {localParam.code}
          </h5>
          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              className="text-green-600 hover:text-green-800 p-1"
              title="Save"
            >
              <CheckIcon className="h-5 w-5" />
            </button>
            <button
              onClick={handleCancel}
              className="text-red-600 hover:text-red-800 p-1"
              title="Cancel"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Parameter Code
            </label>
            <input
              type="text"
              value={localParam.code}
              onChange={(e) => setLocalParam({ ...localParam, code: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 1.1"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Description
            </label>
            <input
              type="text"
              value={localParam.description}
              onChange={(e) => setLocalParam({ ...localParam, description: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Brief description of the parameter"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              What to Look For
            </label>
            <textarea
              value={localParam.whatToLookFor}
              onChange={(e) => setLocalParam({ ...localParam, whatToLookFor: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Detailed guidance on what to look for during assessment"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Evidence Examples (one per line)
            </label>
            <textarea
              value={localParam.evidenceExamples?.join('\n') || ''}
              onChange={(e) => setLocalParam({ 
                ...localParam, 
                evidenceExamples: e.target.value.split('\n').filter(line => line.trim())
              })}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Examples of evidence that would satisfy this parameter"
            />
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id={`required-${parameter.id}`}
              checked={localParam.required}
              onChange={(e) => setLocalParam({ ...localParam, required: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor={`required-${parameter.id}`} className="ml-2 text-sm text-gray-700">
              Required for this maturity level
            </label>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Maturity Levels Configuration</h3>
          <p className="text-sm text-gray-500">
            Define the maturity levels and their assessment parameters
          </p>
        </div>
        {!readOnly && (
          <div className="flex space-x-3">
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
            {onSave && (
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Framework
              </button>
            )}
          </div>
        )}
      </div>

      {/* Maturity Levels */}
      <div className="space-y-4">
        {framework?.levels && framework.levels.length > 0 ? (
          framework.levels
            .sort((a, b) => a.level - b.level)
            .map((level, levelIndex) => (
              <div key={level.level} className="border rounded-lg overflow-hidden">
                {/* Level Header */}
                <div
                  className={`px-6 py-4 flex justify-between items-center cursor-pointer ${
                    expandedLevels.includes(level.level) ? 'bg-gray-50 border-b' : 'bg-white'
                  }`}
                  onClick={() => toggleLevel(level.level)}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-medium ${
                      level.level === 0 ? 'bg-gray-400' :
                      level.level === 1 ? 'bg-blue-400' :
                      level.level === 2 ? 'bg-green-500' : 'bg-purple-600'
                    }`}>
                      {level.level}
                    </div>
                    <div>
                      <h4 className="text-lg font-medium text-gray-900">
                        {getLevelHeader(level)}
                      </h4>
                      <p className="text-sm text-gray-500">{level.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-500">
                      {level.parameters.length} parameters
                    </span>
                    {!readOnly && editingLevel?.index === levelIndex ? (
                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLevelUpdate(levelIndex, {
                              name: editingLevel.name,
                              description: editingLevel.description,
                              points: editingLevel.points
                            });
                            setEditingLevel(null);
                          }}
                          className="text-green-600 hover:text-green-800"
                        >
                          <CheckIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingLevel(null);
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </div>
                    ) : (
                      !readOnly && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingLevel({
                              index: levelIndex,
                              name: level.name,
                              description: level.description,
                              points: level.points
                            });
                          }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedLevels.includes(level.level) && (
                  <div className="p-6 bg-white">
                    {/* Level Edit Form */}
                    {editingLevel?.index === levelIndex ? (
                      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <h5 className="text-sm font-medium text-gray-900 mb-3">Edit Level Details</h5>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Level Name
                            </label>
                            <input
                              type="text"
                              value={editingLevel.name}
                              onChange={(e) => setEditingLevel({ ...editingLevel, name: e.target.value })}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                              placeholder="e.g., Nascent, Foundational, etc."
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Description
                            </label>
                            <input
                              type="text"
                              value={editingLevel.description}
                              onChange={(e) => setEditingLevel({ ...editingLevel, description: e.target.value })}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                              placeholder="Brief description of this maturity level"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Points
                            </label>
                            <input
                              type="number"
                              value={editingLevel.points}
                              onChange={(e) => setEditingLevel({ ...editingLevel, points: parseInt(e.target.value) || 0 })}
                              className="w-32 px-3 py-2 text-sm border border-gray-300 rounded-md"
                              min="0"
                            />
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* Validation Errors */}
                    {showValidation && validationErrors[`level_${level.level}`] && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start">
                          <InformationCircleIcon className="h-5 w-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
                          <div>
                            <h6 className="text-sm font-medium text-red-800">Validation Errors</h6>
                            <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                              {validationErrors[`level_${level.level}`].map((error, idx) => (
                                <li key={idx}>{error}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Parameters List */}
                    <div className="space-y-3">
                      {level.parameters
                        .sort((a, b) => a.displayOrder - b.displayOrder)
                        .map((parameter, paramIndex) => (
                          <div key={parameter.id}>
                            {editingParameter &&
                             editingParameter.levelIndex === levelIndex &&
                             editingParameter.parameterIndex === paramIndex ? (
                              <ParameterEditor
                                levelIndex={levelIndex}
                                parameterIndex={paramIndex}
                                parameter={parameter}
                              />
                            ) : (
                              <div className="border rounded-lg p-4 hover:bg-gray-50">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-3">
                                      <span className="font-mono text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                        {parameter.code}
                                      </span>
                                      <span className="font-medium text-gray-900">
                                        {parameter.description || 'Untitled Parameter'}
                                      </span>
                                      {parameter.required && (
                                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                                          Required
                                        </span>
                                      )}
                                    </div>
                                    {parameter.whatToLookFor && (
                                      <p className="mt-2 text-sm text-gray-600">
                                        <span className="font-medium">What to look for:</span>{' '}
                                        {parameter.whatToLookFor}
                                      </p>
                                    )}
                                    {parameter.evidenceExamples && parameter.evidenceExamples.length > 0 && (
                                      <div className="mt-2">
                                        <span className="text-xs font-medium text-gray-500">Evidence examples:</span>
                                        <ul className="mt-1 text-xs text-gray-600 list-disc list-inside">
                                          {parameter.evidenceExamples.slice(0, 2).map((example, idx) => (
                                            <li key={idx}>{example}</li>
                                          ))}
                                          {parameter.evidenceExamples.length > 2 && (
                                            <li className="text-gray-400">
                                              +{parameter.evidenceExamples.length - 2} more
                                            </li>
                                          )}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {!readOnly && (
                                    <div className="flex items-center space-x-2 ml-4">
                                      <button
                                        onClick={() => moveParameter(levelIndex, paramIndex, 'up')}
                                        disabled={paramIndex === 0}
                                        className={`p-1 ${
                                          paramIndex === 0
                                            ? 'text-gray-300 cursor-not-allowed'
                                            : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                        title="Move Up"
                                      >
                                        <ArrowUpIcon className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => moveParameter(levelIndex, paramIndex, 'down')}
                                        disabled={paramIndex === level.parameters.length - 1}
                                        className={`p-1 ${
                                          paramIndex === level.parameters.length - 1
                                            ? 'text-gray-300 cursor-not-allowed'
                                            : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                        title="Move Down"
                                      >
                                        <ArrowDownIcon className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => setEditingParameter({
                                          levelIndex,
                                          parameterIndex: paramIndex,
                                          parameter
                                        })}
                                        className="text-blue-600 hover:text-blue-800 p-1"
                                        title="Edit Parameter"
                                      >
                                        <PencilIcon className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteParameter(levelIndex, paramIndex)}
                                        className="text-red-600 hover:text-red-800 p-1"
                                        title="Delete Parameter"
                                      >
                                        <TrashIcon className="h-4 w-4" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>

                    {/* Add Parameter Button */}
                    {!readOnly && (
                      <div className="mt-4">
                        <button
                          onClick={() => handleAddParameter(levelIndex)}
                          className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                        >
                          <PlusIcon className="h-4 w-4 mr-1" />
                          Add Parameter for Level {level.level}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No maturity levels configured</p>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Framework Summary</h4>
        <div className="grid grid-cols-4 gap-4">
          {framework?.levels && framework.levels.length > 0 ? (
            framework.levels.sort((a, b) => a.level - b.level).map(level => (
              <div key={level.level} className="text-center">
                <div className={`text-lg font-semibold ${
                  level.level === 0 ? 'text-gray-600' :
                  level.level === 1 ? 'text-blue-600' :
                  level.level === 2 ? 'text-green-600' : 'text-purple-600'
                }`}>
                  Level {level.level}
                </div>
                <div className="text-sm font-medium">{level.name}</div>
                <div className="text-xs text-gray-500">{level.points} pts</div>
                <div className="text-xs text-gray-500">{level.parameters.length} params</div>
              </div>
            ))
          ) : (
            <div className="col-span-4 text-center text-gray-500 py-2">
              No levels to display
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MaturityLevelEditor;