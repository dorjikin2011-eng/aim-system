// frontend/src/components/config/SubsystemManager.tsx

import React, { useState } from 'react';
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  BeakerIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import type { SubsystemDefinition, MaturityFramework, MaturityLevel } from '../../types/maturity';
import MaturityLevelEditor from './MaturityLevelEditor';

interface SubsystemManagerProps {
  /** Parent indicator ID (e.g., 'ind_iccs') */
  indicatorId: string;
  
  /** List of subsystems */
  subsystems: SubsystemDefinition[];
  
  /** Total weight available for all subsystems */
  totalWeight: number;
  
  /** Callback when subsystems change */
  onChange: (subsystems: SubsystemDefinition[]) => void;
  
  /** Callback when a subsystem's maturity framework is updated */
  onFrameworkChange: (subsystemId: string, framework: MaturityFramework) => void;
  
  /** Callback when save is requested */
  onSave?: () => void;
  
  /** Callback when cancel is requested */
  onCancel?: () => void;
  
  /** Is the manager in read-only mode? */
  readOnly?: boolean;
  
  /** Default maturity framework template for new subsystems */
  defaultFrameworkTemplate?: MaturityFramework;
}

interface EditingSubsystem {
  index: number;
  name: string;
  description: string;
  weight: number;
}

export const SubsystemManager: React.FC<SubsystemManagerProps> = ({
  //indicatorId, // Keep for potential future use
  subsystems,
  totalWeight,
  onChange,
  onFrameworkChange,
  onSave,
  onCancel,
  readOnly = false,
  defaultFrameworkTemplate
}) => {
  const [expandedSubsystem, setExpandedSubsystem] = useState<string | null>(
    subsystems.length > 0 ? subsystems[0].id : null
  );
  const [editingSubsystem, setEditingSubsystem] = useState<EditingSubsystem | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSubsystem, setNewSubsystem] = useState({
    name: '',
    description: '',
    weight: 0
  });
  const [weightError, setWeightError] = useState<string | null>(null);

  // Calculate total allocated weight
  const allocatedWeight = subsystems.reduce((sum, s) => sum + s.weight, 0);
  const remainingWeight = totalWeight - allocatedWeight;

  // Validate weight distribution
  const validateWeights = () => {
    if (Math.abs(allocatedWeight - totalWeight) > 0.1) {
      setWeightError(`Total weight (${allocatedWeight}) must equal ${totalWeight}`);
      return false;
    }
    setWeightError(null);
    return true;
  };

  // Toggle subsystem expansion
  const toggleSubsystem = (subsystemId: string) => {
    setExpandedSubsystem(expandedSubsystem === subsystemId ? null : subsystemId);
  };

  // Create default maturity framework
  const createDefaultFramework = (): MaturityFramework => {
    return {
      enabled: true,
      levels: [
        {
          level: 0 as MaturityLevel,
          name: 'Nascent',
          description: 'No formal systems established',
          points: 0,
          parameters: []
        },
        {
          level: 1 as MaturityLevel,
          name: 'Foundational',
          description: 'Basic systems exist',
          points: 4,
          parameters: []
        },
        {
          level: 2 as MaturityLevel,
          name: 'Established',
          description: 'Systems operational and consistently used',
          points: 6,
          parameters: []
        },
        {
          level: 3 as MaturityLevel,
          name: 'Advanced',
          description: 'Systems embedded in culture',
          points: 8,
          parameters: []
        }
      ],
      scoringRule: {
        type: 'maturity-level',
        levelPoints: {
          0: 0,
          1: 4,
          2: 6,
          3: 8
        }
      }
    };
  };

  // Add new subsystem
  const handleAddSubsystem = () => {
    if (!newSubsystem.name) {
      alert('Please enter a subsystem name');
      return;
    }

    if (newSubsystem.weight <= 0) {
      alert('Weight must be greater than 0');
      return;
    }

    if (newSubsystem.weight > remainingWeight + 0.1) {
      alert(`Weight cannot exceed remaining weight (${remainingWeight})`);
      return;
    }

    const newSubsystemDef: SubsystemDefinition = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: newSubsystem.name,
      description: newSubsystem.description,
      weight: newSubsystem.weight,
      maturityFramework: defaultFrameworkTemplate || createDefaultFramework(),
      displayOrder: subsystems.length,
      isActive: true
    };

    onChange([...subsystems, newSubsystemDef]);
    setShowAddForm(false);
    setNewSubsystem({ name: '', description: '', weight: 0 });
    setExpandedSubsystem(newSubsystemDef.id);
  };

  // Update subsystem
  const handleUpdateSubsystem = (index: number, updates: Partial<SubsystemDefinition>) => {
    const newSubsystems = [...subsystems];
    newSubsystems[index] = { ...newSubsystems[index], ...updates };
    onChange(newSubsystems);
    setEditingSubsystem(null);
  };

  // Delete subsystem
  const handleDeleteSubsystem = (index: number) => {
    if (!window.confirm('Are you sure you want to delete this subsystem?')) return;
    
    const newSubsystems = [...subsystems];
    newSubsystems.splice(index, 1);
    
    // Reorder remaining subsystems
    newSubsystems.forEach((sub, idx) => {
      sub.displayOrder = idx;
    });
    
    onChange(newSubsystems);
    
    if (expandedSubsystem === subsystems[index].id) {
      setExpandedSubsystem(null);
    }
  };

  // Move subsystem up/down
  const moveSubsystem = (index: number, direction: 'up' | 'down') => {
    const newSubsystems = [...subsystems];
    
    if (direction === 'up' && index > 0) {
      [newSubsystems[index], newSubsystems[index - 1]] = [newSubsystems[index - 1], newSubsystems[index]];
    } else if (direction === 'down' && index < subsystems.length - 1) {
      [newSubsystems[index], newSubsystems[index + 1]] = [newSubsystems[index + 1], newSubsystems[index]];
    } else {
      return;
    }
    
    // Update display orders
    newSubsystems.forEach((sub, idx) => {
      sub.displayOrder = idx;
    });
    
    onChange(newSubsystems);
  };

  // Handle save
  const handleSave = () => {
    if (validateWeights()) {
      onSave?.();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">ICCS Subsystems Management</h3>
          <p className="text-sm text-gray-500">
            Configure the four core integrity systems that make up the ICCS indicator
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
                Save All Subsystems
              </button>
            )}
          </div>
        )}
      </div>

      {/* Weight Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <span className="text-sm font-medium text-gray-700">Total Weight:</span>
              <span className="ml-2 text-lg font-semibold text-gray-900">{totalWeight}</span>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">Allocated:</span>
              <span className={`ml-2 text-lg font-semibold ${
                Math.abs(allocatedWeight - totalWeight) < 0.1
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}>
                {allocatedWeight.toFixed(1)}
              </span>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">Remaining:</span>
              <span className="ml-2 text-lg font-semibold text-gray-900">{remainingWeight.toFixed(1)}</span>
            </div>
          </div>
          {weightError && (
            <div className="flex items-center text-red-600">
              <InformationCircleIcon className="h-5 w-5 mr-1" />
              <span className="text-sm">{weightError}</span>
            </div>
          )}
        </div>
      </div>

      {/* Add New Subsystem Form */}
      {showAddForm && !readOnly && (
        <div className="bg-white border border-gray-300 rounded-lg p-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Add New Subsystem</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subsystem Name *
              </label>
              <input
                type="text"
                value={newSubsystem.name}
                onChange={(e) => setNewSubsystem({ ...newSubsystem, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Complaint Management Mechanism"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={newSubsystem.description}
                onChange={(e) => setNewSubsystem({ ...newSubsystem, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe what this subsystem measures..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Weight (points) *
              </label>
              <input
                type="number"
                value={newSubsystem.weight}
                onChange={(e) => setNewSubsystem({ ...newSubsystem, weight: parseFloat(e.target.value) || 0 })}
                min="0"
                max={remainingWeight}
                step="0.1"
                className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Max remaining weight: {remainingWeight.toFixed(1)}
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSubsystem}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Subsystem
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subsystems List */}
      <div className="space-y-4">
        {subsystems
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((subsystem, index) => (
            <div key={subsystem.id} className="border rounded-lg overflow-hidden">
              {/* Subsystem Header */}
              <div
                className={`px-6 py-4 flex justify-between items-center cursor-pointer ${
                  expandedSubsystem === subsystem.id ? 'bg-gray-50 border-b' : 'bg-white'
                }`}
                onClick={() => toggleSubsystem(subsystem.id)}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <BeakerIcon className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">
                      {subsystem.name}
                    </h4>
                    <p className="text-sm text-gray-500">{subsystem.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-semibold text-gray-900">
                    {subsystem.weight} pts
                  </span>
                  
                  {!readOnly && editingSubsystem?.index === index ? (
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateSubsystem(index, {
                            name: editingSubsystem.name,
                            description: editingSubsystem.description,
                            weight: editingSubsystem.weight
                          });
                        }}
                        className="text-green-600 hover:text-green-800"
                      >
                        <CheckIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSubsystem(null);
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  ) : (
                    !readOnly && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveSubsystem(index, 'up');
                          }}
                          disabled={index === 0}
                          className={`p-1 ${
                            index === 0
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          <ArrowUpIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveSubsystem(index, 'down');
                          }}
                          disabled={index === subsystems.length - 1}
                          className={`p-1 ${
                            index === subsystems.length - 1
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          <ArrowDownIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSubsystem({
                              index,
                              name: subsystem.name,
                              description: subsystem.description,
                              weight: subsystem.weight
                            });
                          }}
                          className="text-blue-600 hover:text-blue-800 p-1"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSubsystem(index);
                          }}
                          className="text-red-600 hover:text-red-800 p-1"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Expanded Content - Maturity Framework Editor */}
              {expandedSubsystem === subsystem.id && (
                <div className="p-6 bg-white">
                  {editingSubsystem?.index === index ? (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                      <h5 className="text-sm font-medium text-gray-900 mb-3">Edit Subsystem Details</h5>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Subsystem Name
                          </label>
                          <input
                            type="text"
                            value={editingSubsystem.name}
                            onChange={(e) => setEditingSubsystem({ ...editingSubsystem, name: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Description
                          </label>
                          <textarea
                            value={editingSubsystem.description}
                            onChange={(e) => setEditingSubsystem({ ...editingSubsystem, description: e.target.value })}
                            rows={2}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Weight
                          </label>
                          <input
                            type="number"
                            value={editingSubsystem.weight}
                            onChange={(e) => setEditingSubsystem({ ...editingSubsystem, weight: parseFloat(e.target.value) || 0 })}
                            min="0"
                            step="0.1"
                            className="w-32 px-3 py-2 text-sm border border-gray-300 rounded-md"
                          />
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <MaturityLevelEditor
                    framework={subsystem.maturityFramework}
                    onChange={(updatedFramework) => onFrameworkChange(subsystem.id, updatedFramework)}
                    readOnly={readOnly}
                    showValidation={true}
                  />
                </div>
              )}
            </div>
          ))}
      </div>

      {/* Add Subsystem Button */}
      {!readOnly && !showAddForm && subsystems.length < 4 && (
        <div className="flex justify-center">
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add New Subsystem
          </button>
        </div>
      )}

      {/* Empty State */}
      {subsystems.length === 0 && !showAddForm && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <BeakerIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Subsystems Defined</h4>
          <p className="text-gray-500 mb-4">
            ICCS requires four subsystems. Add them to configure the maturity framework.
          </p>
          {!readOnly && (
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add First Subsystem
            </button>
          )}
        </div>
      )}

      {/* Max Subsystems Message */}
      {!readOnly && subsystems.length >= 4 && !showAddForm && (
        <div className="text-center py-4 bg-green-50 rounded-lg">
          <p className="text-green-700">
            Maximum of 4 subsystems reached. ICCS is complete.
          </p>
        </div>
      )}
    </div>
  );
};

export default SubsystemManager;