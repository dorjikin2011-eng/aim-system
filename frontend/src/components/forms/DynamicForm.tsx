// frontend/src/components/forms/DynamicForm.tsx
import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import type { ReactNode } from 'react';
import type {
  FormTemplate,
  FormSection,
  FormField,
} from '../../types/config';
import type {
  MaturityFramework,
  SubsystemDefinition,
} from '../../types/maturity';
import { configService } from '../../services/configService';
//import { maturityService } from '../../services/maturityService';
import {
  CheckIcon,
  ExclamationCircleIcon,
  CalculatorIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

// Auto-scoring components
import WeightedSumField from './WeightedSumField';

// Calculation helpers
import {
  determineIntegrityLevel
} from '../../../utils/calculationHelpers';

// ============================================
// EXPORT THE REF TYPE (as a type, not a value)
// ============================================
export type DynamicFormRef = {
  getFormData: () => any;
  validateForm: () => boolean;
  getScores: () => IndicatorScores;
};

// ============================================
// TRANSPARENT SCORING DISPLAY COMPONENTS
// ============================================

const TrainingScoreDisplay: React.FC<{ percentage: number; score: number }> = ({ percentage, score }) => {
  let level = 0;
  let levelName = 'Nascent';
  let levelClass = 'text-gray-600';
  
  if (percentage >= 85) { 
    level = 3; 
    levelName = 'Advanced';
    levelClass = 'text-purple-600';
  } else if (percentage >= 70) { 
    level = 2; 
    levelName = 'Established';
    levelClass = 'text-green-600';
  } else if (percentage >= 50) { 
    level = 1; 
    levelName = 'Foundational';
    levelClass = 'text-blue-600';
  }
  
  return (
    <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-700 flex items-center">
          <CalculatorIcon className="h-4 w-4 mr-1 text-blue-500" />
          Training Score Calculation
        </span>
        <span className="text-sm font-semibold bg-blue-100 text-blue-800 px-2 py-1 rounded">
          {percentage.toFixed(1)}% Complete
        </span>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className={`flex justify-between p-2 rounded ${percentage >= 85 ? 'bg-purple-100 border border-purple-200' : ''}`}>
          <div className="flex items-center">
            <span className="w-16 text-purple-700 font-medium">≥85%</span>
            <span className="text-gray-600">Advanced</span>
          </div>
          <span className="font-bold text-purple-700">24 points</span>
        </div>
        
        <div className={`flex justify-between p-2 rounded ${percentage >= 70 && percentage < 85 ? 'bg-green-100 border border-green-200' : ''}`}>
          <div className="flex items-center">
            <span className="w-16 text-green-700 font-medium">70-84%</span>
            <span className="text-gray-600">Established</span>
          </div>
          <span className="font-bold text-green-700">18 points</span>
        </div>
        
        <div className={`flex justify-between p-2 rounded ${percentage >= 50 && percentage < 70 ? 'bg-blue-100 border border-blue-200' : ''}`}>
          <div className="flex items-center">
            <span className="w-16 text-blue-700 font-medium">50-69%</span>
            <span className="text-gray-600">Foundational</span>
          </div>
          <span className="font-bold text-blue-700">10 points</span>
        </div>
        
        <div className={`flex justify-between p-2 rounded ${percentage < 50 ? 'bg-gray-200 border border-gray-300' : ''}`}>
          <div className="flex items-center">
            <span className="w-16 text-gray-600 font-medium">&lt;50%</span>
            <span className="text-gray-600">Nascent</span>
          </div>
          <span className="font-bold text-gray-600">0 points</span>
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center">
        <span className="text-sm font-medium">Current Result:</span>
        <span className={`text-lg font-bold ${levelClass}`}>
          Level {level} ({levelName}) - {score} points
        </span>
      </div>
    </div>
  );
};

const ADScoreDisplay: React.FC<{ percentage: number; score: number }> = ({ percentage, score }) => {
  let level = 0;
  let levelName = 'Nascent';
  let levelClass = 'text-gray-600';
  
  if (percentage >= 100) { 
    level = 3; 
    levelName = 'Advanced';
    levelClass = 'text-purple-600';
  } else if (percentage >= 95) { 
    level = 2; 
    levelName = 'Established';
    levelClass = 'text-green-600';
  } else if (percentage >= 90) { 
    level = 1; 
    levelName = 'Foundational';
    levelClass = 'text-blue-600';
  }
  
  return (
    <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-700 flex items-center">
          <CalculatorIcon className="h-4 w-4 mr-1 text-blue-500" />
          AD Compliance Score Calculation
        </span>
        <span className="text-sm font-semibold bg-blue-100 text-blue-800 px-2 py-1 rounded">
          {percentage.toFixed(1)}% Compliance
        </span>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className={`flex justify-between p-2 rounded ${percentage >= 100 ? 'bg-purple-100 border border-purple-200' : ''}`}>
          <div className="flex items-center">
            <span className="w-20 text-purple-700 font-medium">100%</span>
            <span className="text-gray-600">Advanced</span>
          </div>
          <span className="font-bold text-purple-700">14 points</span>
        </div>
        
        <div className={`flex justify-between p-2 rounded ${percentage >= 95 && percentage < 100 ? 'bg-green-100 border border-green-200' : ''}`}>
          <div className="flex items-center">
            <span className="w-20 text-green-700 font-medium">95-99%</span>
            <span className="text-gray-600">Established</span>
          </div>
          <span className="font-bold text-green-700">10 points</span>
        </div>
        
        <div className={`flex justify-between p-2 rounded ${percentage >= 90 && percentage < 95 ? 'bg-blue-100 border border-blue-200' : ''}`}>
          <div className="flex items-center">
            <span className="w-20 text-blue-700 font-medium">90-94%</span>
            <span className="text-gray-600">Foundational</span>
          </div>
          <span className="font-bold text-blue-700">5 points</span>
        </div>
        
        <div className={`flex justify-between p-2 rounded ${percentage < 90 ? 'bg-gray-200 border border-gray-300' : ''}`}>
          <div className="flex items-center">
            <span className="w-20 text-gray-600 font-medium">&lt;90%</span>
            <span className="text-gray-600">Nascent</span>
          </div>
          <span className="font-bold text-gray-600">0 points</span>
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center">
        <span className="text-sm font-medium">Current Result:</span>
        <span className={`text-lg font-bold ${levelClass}`}>
          Level {level} ({levelName}) - {score} points
        </span>
      </div>
    </div>
  );
};

interface DynamicFormProps {
  templateId?: string;
  template?: FormTemplate;
  onSubmit: (formData: any) => Promise<void>;
  initialData?: any;
  readOnly?: boolean;
  showValidation?: boolean;
  mode?: 'test' | 'preview' | 'live' | 'readonly';
  disabled?: boolean;
}

interface UISettings {
  placeholder?: string;
  help_text?: string;
  width?: string | number;
  height?: string | number;
  rows?: number;
  cols?: number;
  step?: number;
  min?: number;
  max?: number;
  maxLength?: number;
  minLength?: number;
  options?: Array<{ label: string; value: any }>;
  theme?: 'default' | 'compact' | 'spacious';
  component?: string;
  className?: string;
  style?: Record<string, any>;
  disabled?: boolean;
  readOnly?: boolean;
  trueLabel?: string;
  falseLabel?: string;
  rangeDisplay?: string;
  default_value?: any;
  show_progress_bar?: boolean;
  show_section_numbers?: boolean;
  submit_button_text?: string;
  formula?: string;
  show_calculation?: boolean;
  calculation_description?: string;
  show_scoring_info?: boolean;
  readonly?: boolean;
}

interface ScoringRule {
  id: string;
  indicatorId: string;
  parameterCode?: string;
  scoringType: 'maturity-level' | 'percentage-range' | 'severity-index' | 'boolean';
  maturityLevels?: Array<{ level: number; points: number; label: string }>;
  percentageThresholds?: Array<{ min: number; max: number; level: number; points: number; label: string }>;
  severityWeights?: Array<{ caseType: string; points: number }>;
  severityMapping?: Array<{ minScore: number; maxScore: number; level: number; points: number }>;
}

interface MaturityFrameworkCache {
  [indicatorId: string]: {
    framework?: MaturityFramework;
    subsystems?: SubsystemDefinition[];
    scoringRules?: ScoringRule[];
    loaded: boolean;
    loading: boolean;
  }
}

interface IndicatorScores {
  iccs: number;
  training: number;
  ad: number;
  coc: number;
  cases: number;
  total: number;
}

// ============================================
// MAIN COMPONENT WITH FORWARD REF
// ============================================
const DynamicForm = forwardRef<DynamicFormRef, DynamicFormProps>(({
  templateId,
  template: providedTemplate,
  onSubmit,
  initialData = {},
  readOnly = false,
  showValidation = true,
  mode = 'live',
  disabled = false,
}, ref) => {
  const [template, setTemplate] = useState<FormTemplate | null>(providedTemplate || null);
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(!providedTemplate);
  const [activeSection, setActiveSection] = useState(0);
  const [scores, setScores] = useState<IndicatorScores>({
    iccs: 0,
    training: 0,
    ad: 0,
    coc: 0,
    cases: 0,
    total: 0
  });
  
  // Maturity framework cache
  const [maturityCache, setMaturityCache] = useState<MaturityFrameworkCache>({});
  const [loadingFrameworks, setLoadingFrameworks] = useState<Record<string, boolean>>({});
  
  // Ref to track which templates have been loaded
  const loadedTemplatesRef = useRef<Set<string>>(new Set());
  
  // Determine if form should be fully disabled
  const isFormDisabled = disabled || readOnly || mode === 'preview' || mode === 'readonly';

  // ============================================
  // EXPOSE METHODS VIA REF
  // ============================================
  // In DynamicForm.tsx, update the validateForm method:

useImperativeHandle(ref, () => ({
  getFormData: () => ({
    ...formData,
    _scores: scores,
    _totalScore: scores.total,
    _integrityLevel: determineIntegrityLevel(scores.total).level,
    _integrityLabel: determineIntegrityLevel(scores.total).label,
  }),
  validateForm: () => {
    const errors: Record<string, string> = {};
    
    if (template) {
      template.sections?.forEach(section => {
        section.fields?.forEach(field => {
          const fieldCode = field.parameterCode || field.id.replace('field_', '');
          
          // Check if the field exists in the nested structure
          let value = null;
          
          // Look for the field in the main formData
          if (formData[fieldCode] !== undefined) {
            value = formData[fieldCode];
          } 
          // Look for the field in the nested indicator objects
          else {
            // Check each key in formData that might be an indicator ID
            for (const key in formData) {
              if (typeof formData[key] === 'object' && formData[key] !== null) {
                if (formData[key][fieldCode] !== undefined) {
                  value = formData[key][fieldCode];
                  break;
                }
              }
            }
          }
          
          console.log(`🔍 Validating field ${fieldCode}:`, value);
          
          // Check required fields
          if (field.required) {
            // For number fields, allow 0 as valid
            if (field.type === 'number') {
              if (value === undefined || value === null || value === '') {
                errors[fieldCode] = `${field.label} is required`;
              }
            } else {
              // For select and other fields
              if (value === undefined || value === null || value === '') {
                errors[fieldCode] = `${field.label} is required`;
              }
            }
          }
        });
      });
    }
    
    setValidationErrors(errors);
    console.log('🔍 Validation errors:', errors);
    return Object.keys(errors).length === 0;
  },
  getScores: () => scores
}));

  // Load template
  const loadTemplate = useCallback(async () => {
    try {
      setLoading(true);
      const templatesResponse = await configService.getFormTemplates();
      if (templatesResponse.success && templatesResponse.data) {
        const template = templatesResponse.data.find(t => t.id === templateId);
        if (template) {
          console.log('✅ TEMPLATE LOADED:', template.name);
          setTemplate(template);
        }
      }
    } catch (error) {
      console.error('Failed to load template:', error);
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    if (templateId && !providedTemplate) {
      loadTemplate();
    }
  }, [templateId, providedTemplate, loadTemplate]);

  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  // Load frameworks when template loads
  useEffect(() => {
    if (template && template.id && !loadedTemplatesRef.current.has(template.id)) {
      loadedTemplatesRef.current.add(template.id);
      
      // Load maturity frameworks for indicators
      if (template.indicatorIds && template.indicatorIds.length > 0) {
        loadMaturityFrameworks(template.indicatorIds);
      }
    }
  }, [template]);

  // Load maturity frameworks
  const loadMaturityFrameworks = async (indicatorIds: string[]) => {
    const uniqueIds = [...new Set(indicatorIds)];
    
    for (const indicatorId of uniqueIds) {
      if (maturityCache[indicatorId]?.loaded) continue;
      
      setLoadingFrameworks(prev => ({ ...prev, [indicatorId]: true }));
      
      try {
        // Set default scoring rules based on indicator ID
        const newCache = { ...maturityCache };
        
        if (!newCache[indicatorId]) {
          newCache[indicatorId] = { loaded: false, loading: false };
        }
        
        // ICCS
        if (indicatorId === 'ind_1770114038668_i6jrig8sz' || indicatorId === 'ind_iccs') {
          newCache[indicatorId].scoringRules = [{
            id: 'default_iccs',
            indicatorId,
            scoringType: 'maturity-level',
            maturityLevels: [
              { level: 0, points: 0, label: 'Nascent - No formal system' },
              { level: 1, points: 4, label: 'Foundational - Basic system exists' },
              { level: 2, points: 6, label: 'Established - System operational' },
              { level: 3, points: 8, label: 'Advanced - System embedded' }
            ]
          }];
        }
        // Training/Capacity
        else if (indicatorId === 'ind_1770114038672_noe0zgtjx' || indicatorId === 'ind_capacity') {
          newCache[indicatorId].scoringRules = [{
            id: 'default_capacity',
            indicatorId,
            scoringType: 'percentage-range',
            percentageThresholds: [
              { min: 0, max: 49, level: 0, points: 0, label: 'Nascent: <50%' },
              { min: 50, max: 69, level: 1, points: 10, label: 'Foundational: 50-69%' },
              { min: 70, max: 84, level: 2, points: 18, label: 'Established: 70-84%' },
              { min: 85, max: 100, level: 3, points: 24, label: 'Advanced: ≥85%' }
            ]
          }];
        }
        // AD
        else if (indicatorId === 'ind_1770114038673_zuella44q' || indicatorId === 'ind_ad') {
          newCache[indicatorId].scoringRules = [{
            id: 'default_ad',
            indicatorId,
            scoringType: 'percentage-range',
            percentageThresholds: [
              { min: 0, max: 89, level: 0, points: 0, label: 'Nascent: <90%' },
              { min: 90, max: 94, level: 1, points: 5, label: 'Foundational: 90-94%' },
              { min: 95, max: 99, level: 2, points: 10, label: 'Established: 95-99%' },
              { min: 100, max: 100, level: 3, points: 14, label: 'Advanced: 100%' }
            ]
          }];
        }
        // CoC
        else if (indicatorId === 'ind_coc') {
          newCache[indicatorId].scoringRules = [{
            id: 'default_coc',
            indicatorId,
            scoringType: 'maturity-level',
            maturityLevels: [
              { level: 0, points: 0, label: 'Nascent - No promotion' },
              { level: 1, points: 4, label: 'Foundational - Exists & accessible' },
              { level: 2, points: 7, label: 'Established - Actively communicated' },
              { level: 3, points: 10, label: 'Advanced - Embedded in culture' }
            ]
          }];
        }
        // Cases
        else if (indicatorId === 'ind_1770114038674_x4z2r2vjh' || indicatorId === 'ind_cases') {
          newCache[indicatorId].scoringRules = [{
            id: 'default_cases',
            indicatorId,
            scoringType: 'severity-index',
            severityWeights: [
              { caseType: 'conviction', points: 3 },
              { caseType: 'prosecution', points: 2 },
              { caseType: 'admin_action', points: 1 }
            ],
            severityMapping: [
              { minScore: 0, maxScore: 0, level: 3, points: 20 },
              { minScore: 1, maxScore: 2, level: 2, points: 12 },
              { minScore: 3, maxScore: 4, level: 1, points: 6 },
              { minScore: 5, maxScore: 999, level: 0, points: 0 }
            ]
          }];
        }
        
        newCache[indicatorId].loaded = true;
        newCache[indicatorId].loading = false;
        setMaturityCache(newCache);
        
      } catch (error) {
        console.error(`Failed to load for ${indicatorId}:`, error);
      } finally {
        setLoadingFrameworks(prev => ({ ...prev, [indicatorId]: false }));
      }
    }
  };

  // Calculate all scores whenever formData changes
  useEffect(() => {
    const newScores: IndicatorScores = {
      iccs: 0,
      training: 0,
      ad: 0,
      coc: 0,
      cases: 0,
      total: 0
    };

    // ICCS Score
    const levelPoints: Record<number, number> = {0: 0, 1: 4, 2: 6, 3: 8};
    newScores.iccs = (levelPoints[Number(formData.complaint_level)] || 0) +
                     (levelPoints[Number(formData.coi_level)] || 0) +
                     (levelPoints[Number(formData.gift_level)] || 0) +
                     (levelPoints[Number(formData.proactive_level)] || 0);

    // Training Score
    const totalEmployees = Number(formData.total_employees) || 0;
    const completedEmployees = Number(formData.completed_employees) || 0;
    if (totalEmployees > 0) {
      const trainingPercent = (completedEmployees / totalEmployees) * 100;
      if (trainingPercent >= 85) newScores.training = 24;
      else if (trainingPercent >= 70) newScores.training = 18;
      else if (trainingPercent >= 50) newScores.training = 10;
    }

    // AD Score
    const totalOfficials = Number(formData.total_covered_officials) || 0;
    const submittedOfficials = Number(formData.officials_submitted_on_time) || 0;
    if (totalOfficials > 0) {
      const adPercent = (submittedOfficials / totalOfficials) * 100;
      if (adPercent >= 100) newScores.ad = 14;
      else if (adPercent >= 95) newScores.ad = 10;
      else if (adPercent >= 90) newScores.ad = 5;
    }

    // CoC Score
    const cocLevel = Number(formData.coc_level) || 0;
    const cocPoints: Record<number, number> = {0: 0, 1: 4, 2: 7, 3: 10};
    newScores.coc = cocPoints[cocLevel] || 0;

    // Cases Score
    const convictions = Number(formData.conviction_cases) || 0;
    const prosecutions = Number(formData.prosecution_cases) || 0;
    const adminActions = Number(formData.admin_action_cases) || 0;
    const severityScore = (convictions * 3) + (prosecutions * 2) + (adminActions * 1);
    
    if (severityScore === 0) newScores.cases = 20;
    else if (severityScore <= 2) newScores.cases = 12;
    else if (severityScore <= 4) newScores.cases = 6;

    // Total
    newScores.total = newScores.iccs + newScores.training + newScores.ad + newScores.coc + newScores.cases;

    setScores(newScores);
  }, [formData]);

  const handleInputChange = (fieldCode: string, value: any): void => {
    if (isFormDisabled) return;
    
    setFormData((prev: Record<string, any>) => ({
      ...prev,
      [fieldCode]: value
    }));
    
    if (validationErrors[fieldCode]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldCode];
        return newErrors;
      });
    }
  };

  const validateField = (field: FormField, value: any): string | null => {
    if (field.required && (value === undefined || value === null || value === '')) {
      return `${field.label} is required`;
    }
    return null;
  };

  const validateForm = (): boolean => {
    if (!template || !showValidation || isFormDisabled) return true;
    
    const errors: Record<string, string> = {};
    
    template.sections?.forEach(section => {
      section.fields?.forEach(field => {
        if (field.type === 'calculated') return;
        const error = validateField(field, formData[field.parameterCode]);
        if (error) {
          errors[field.parameterCode] = error;
        }
      });
    });
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    if (isFormDisabled) return;
    if (!validateForm()) return;
    
    setSubmitting(true);
    
    try {
      const integrity = determineIntegrityLevel(scores.total);
      
      const submissionData = {
        ...formData,
        _scores: scores,
        _totalScore: scores.total,
        _integrityLevel: integrity.level,
        _integrityLabel: integrity.label,
        _submittedAt: new Date().toISOString(),
        _mode: mode
      };
      
      await onSubmit(submissionData);
    } catch (error) {
      console.error('Form submission failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Render maturity level selector
  const renderMaturityLevelField = (
    parameterCode: string,
    label: string,
    options: Array<{ value: number; label: string }>,
    required: boolean = false,
    helpText?: string
  ): ReactNode => {
    const value = formData[parameterCode] ?? '';
    
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <select
          value={value}
          onChange={(e) => handleInputChange(parameterCode, parseInt(e.target.value))}
          disabled={isFormDisabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select maturity level...</option>
          {options.map((opt, idx) => (
            <option key={idx} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {helpText && <p className="mt-1 text-xs text-gray-500">{helpText}</p>}
      </div>
    );
  };

  // Render section with score header
  const renderSection = (section: FormSection, index: number): ReactNode => {
    const columns = section.columns || 1;
    const fields = section.fields || [];
    
    // Determine which score to show for this section
    let sectionScore = 0;
    let sectionMax = 0;
    let sectionTitle = section.title;
    
    if (sectionTitle.toLowerCase().includes('iccs')) {
      sectionScore = scores.iccs;
      sectionMax = 32;
    } else if (sectionTitle.toLowerCase().includes('capacity') || sectionTitle.toLowerCase().includes('training')) {
      sectionScore = scores.training;
      sectionMax = 24;
    } else if (sectionTitle.toLowerCase().includes('asset') || sectionTitle.toLowerCase().includes('ad')) {
      sectionScore = scores.ad;
      sectionMax = 14;
    } else if (sectionTitle.toLowerCase().includes('code') || sectionTitle.toLowerCase().includes('coc')) {
      sectionScore = scores.coc;
      sectionMax = 10;
    } else if (sectionTitle.toLowerCase().includes('corruption') || sectionTitle.toLowerCase().includes('cases')) {
      sectionScore = scores.cases;
      sectionMax = 20;
    }
    
    const fieldsPerColumn = Math.ceil(fields.length / columns);
    const columnFields = [];
    for (let i = 0; i < columns; i++) {
      columnFields.push(fields.slice(i * fieldsPerColumn, (i + 1) * fieldsPerColumn));
    }
    
    return (
      <div key={section.id || `section-${index}`} className={`mb-8 ${index === activeSection ? 'block' : 'hidden'}`}>
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h3 className={`text-lg font-semibold ${isFormDisabled ? 'text-gray-500' : 'text-gray-900'}`}>
              {template?.uiConfig?.show_section_numbers && `${index + 1}. `}
              {section.title}
            </h3>
            {section.description && (
              <p className={`mt-1 text-sm ${isFormDisabled ? 'text-gray-400' : 'text-gray-600'}`}>
                {section.description}
              </p>
            )}
          </div>
          {sectionMax > 0 && (
            <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg font-semibold">
              {sectionScore}/{sectionMax} pts
            </div>
          )}
        </div>
        
        <div className={`grid grid-cols-1 ${columns > 1 ? 'md:grid-cols-2' : ''} ${columns > 2 ? 'lg:grid-cols-3' : ''} gap-6`}>
          {columnFields.map((column, colIndex) => (
            <div key={colIndex} className="space-y-4">
              {column.map(field => (
                <div key={field.id || `field-${field.parameterCode}`}>
                  {renderField(field)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render individual field
  const renderField = (field: FormField): ReactNode => {
    const fieldCode = field.parameterCode || field.id.replace('field_', '');
    
    if (!fieldCode) {
      console.error('❌ Field has no identifier:', field);
      return <div className="text-red-500 p-2 border border-dashed">⚠️ Configuration error</div>;
    }

    const uiSettings = field.uiSettings as UISettings | undefined;
    const value = formData[fieldCode] ?? uiSettings?.default_value ?? '';
    const error = validationErrors[fieldCode];
    
    // Handle maturity level fields
    if (fieldCode === 'complaint_level' || fieldCode === 'coi_level' || 
        fieldCode === 'gift_level' || fieldCode === 'proactive_level' || 
        fieldCode === 'coc_level') {
      
      const levelOptions = [
        { value: 0, label: 'Level 0: Nascent (0 pts)' },
        { value: 1, label: 'Level 1: Foundational (4 pts)' },
        { value: 2, label: 'Level 2: Established (6 pts)' },
        { value: 3, label: 'Level 3: Advanced (8 pts)' }
      ];
      
      if (fieldCode === 'coc_level') {
        levelOptions[1].label = 'Level 1: Foundational (4 pts)';
        levelOptions[2].label = 'Level 2: Established (7 pts)';
        levelOptions[3].label = 'Level 3: Advanced (10 pts)';
      }
      
      if (fieldCode === 'proactive_level') {
        levelOptions[1].label = 'Level 1: Foundational (2-3 pts)';
        levelOptions[2].label = 'Level 2: Established (5-6 pts)';
      }
      
      return renderMaturityLevelField(
        fieldCode,
        field.label,
        levelOptions,
        field.required,
        uiSettings?.help_text
      );
    }
    
    const commonProps = {
      id: fieldCode,
      name: fieldCode,
      value: value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        handleInputChange(fieldCode, e.target.value),
      disabled: isFormDisabled || uiSettings?.readonly,
      className: `w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
        error ? 'border-red-300' : 'border-gray-300'
      } ${isFormDisabled || uiSettings?.readonly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`,
      'aria-invalid': !!error,
      'aria-describedby': error ? `${fieldCode}-error` : undefined
    };
    
    const fieldWrapper = (children: React.ReactNode): ReactNode => (
      <div className={`mb-4 ${uiSettings?.width ? `w-${uiSettings.width}` : 'w-full'}`}>
        <label
          htmlFor={fieldCode}
          className={`block text-sm font-medium mb-1 ${
            isFormDisabled || uiSettings?.readonly ? 'text-gray-500' : 'text-gray-700'
          }`}
        >
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {children}
        {uiSettings?.help_text && (
          <p className={`mt-1 text-xs ${isFormDisabled || uiSettings?.readonly ? 'text-gray-400' : 'text-gray-500'}`}>
            {uiSettings.help_text}
          </p>
        )}
        {error && (
          <p id={`${fieldCode}-error`} className="mt-1 text-sm text-red-600 flex items-center">
            <ExclamationCircleIcon className="h-4 w-4 mr-1" />
            {error}
          </p>
        )}
      </div>
    );

    switch (field.type as string) {
      case 'text':
        return fieldWrapper(
          <input type="text" placeholder={uiSettings?.placeholder || `Enter ${field.label.toLowerCase()}`} {...commonProps} />
        );
      
      case 'number':
        // Training fields
        if (fieldCode === 'total_employees' || fieldCode === 'completed_employees') {
          const numberField = fieldWrapper(
            <input
              type="number"
              min={0}
              step={1}
              placeholder={uiSettings?.placeholder || `Enter ${field.label.toLowerCase()}`}
              {...commonProps}
            />
          );
          
          // Show TrainingScoreDisplay after completed_employees
          if (fieldCode === 'completed_employees') {
            const total = Number(formData.total_employees) || 0;
            const completed = Number(formData.completed_employees) || 0;
            const percentage = total > 0 ? (completed / total) * 100 : 0;
            
            return (
              <>
                {numberField}
                {total > 0 && (
                  <TrainingScoreDisplay percentage={percentage} score={scores.training} />
                )}
              </>
            );
          }
          
          return numberField;
        }
        
        // AD fields
        if (fieldCode === 'total_covered_officials' || fieldCode === 'officials_submitted_on_time') {
          const numberField = fieldWrapper(
            <input
              type="number"
              min={0}
              step={1}
              placeholder={uiSettings?.placeholder || `Enter ${field.label.toLowerCase()}`}
              {...commonProps}
            />
          );
          
          // Show ADScoreDisplay after officials_submitted_on_time
          if (fieldCode === 'officials_submitted_on_time') {
            const total = Number(formData.total_covered_officials) || 0;
            const submitted = Number(formData.officials_submitted_on_time) || 0;
            const percentage = total > 0 ? (submitted / total) * 100 : 0;
            
            return (
              <>
                {numberField}
                {total > 0 && (
                  <ADScoreDisplay percentage={percentage} score={scores.ad} />
                )}
              </>
            );
          }
          
          return numberField;
        }
        
        // Cases fields
        if (fieldCode === 'conviction_cases' || fieldCode === 'prosecution_cases' || fieldCode === 'admin_action_cases') {
          const numberField = fieldWrapper(
            <input
              type="number"
              min={0}
              step={1}
              placeholder={uiSettings?.placeholder || `Enter number of ${field.label.toLowerCase()}`}
              {...commonProps}
            />
          );
          
          // We'll show WeightedSumField separately after all case fields
          return numberField;
        }
        
        // Default number field
        return fieldWrapper(
          <input
            type="number"
            min={uiSettings?.min}
            max={uiSettings?.max}
            step={uiSettings?.step || 1}
            placeholder={uiSettings?.placeholder || `Enter ${field.label.toLowerCase()}`}
            {...commonProps}
          />
        );
      
      case 'textarea':
        return fieldWrapper(
          <textarea
            rows={uiSettings?.rows || 3}
            placeholder={uiSettings?.placeholder || `Enter ${field.label.toLowerCase()}`}
            {...commonProps}
          />
        );
      
      case 'select':
        return fieldWrapper(
          <select {...commonProps}>
            <option value="">Select an option</option>
            {uiSettings?.options?.map((option, idx) => (
              <option key={idx} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      
      case 'radio':
        return fieldWrapper(
          <div className="space-y-2">
            {uiSettings?.options?.map((option, idx) => (
              <div key={idx} className="flex items-center">
                <input
                  type="radio"
                  id={`${fieldCode}-${idx}`}
                  name={fieldCode}
                  value={option.value}
                  checked={String(value) === String(option.value)}
                  onChange={(e) => handleInputChange(fieldCode, e.target.value)}
                  disabled={isFormDisabled || uiSettings?.readonly}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <label
                  htmlFor={`${fieldCode}-${idx}`}
                  className="ml-2 text-sm text-gray-700"
                >
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        );
      
      case 'checkbox':
        return fieldWrapper(
          <div className="flex items-center">
            <input
              type="checkbox"
              id={fieldCode}
              checked={!!value}
              onChange={(e) => handleInputChange(fieldCode, e.target.checked)}
              disabled={isFormDisabled || uiSettings?.readonly}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              htmlFor={fieldCode}
              className="ml-2 text-sm text-gray-700"
            >
              {field.label}
            </label>
          </div>
        );
      
      case 'date':
        return fieldWrapper(<input type="date" {...commonProps} />);
      
      default:
        return fieldWrapper(
          <input type="text" placeholder={`Enter ${field.label.toLowerCase()}`} {...commonProps} />
        );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-12">
        <ExclamationCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">Form template not found</p>
      </div>
    );
  }

  const sections = template.sections || [];
  const totalSections = sections.length;
  
  const isAIMSAssessment = template.name?.includes('AIMS') || 
                          template.indicatorIds?.some(id => id.includes('iccs'));
  
  const integrity = determineIntegrityLevel(scores.total);

  // Show WeightedSumField after cases section
  const showWeightedSum = formData.conviction_cases !== undefined || 
                          formData.prosecution_cases !== undefined || 
                          formData.admin_action_cases !== undefined;

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6" noValidate>
      {/* Form Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">{template.name}</h2>
        {template.description && (
          <p className="mt-2 text-gray-600">{template.description}</p>
        )}
        
        {/* Loading indicators */}
        {Object.values(loadingFrameworks).some(v => v) && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <ArrowPathIcon className="h-5 w-5 text-blue-600 animate-spin mr-2" />
              <span className="text-sm text-blue-800">Loading scoring rules...</span>
            </div>
          </div>
        )}
        
        {/* Score Summary Bar */}
        {isAIMSAssessment && scores.total > 0 && (
          <div className="mt-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-lg font-semibold text-blue-900">AIMS Score Summary</span>
              <div className={`text-2xl font-bold ${
                integrity.level === 'high' ? 'text-green-600' :
                integrity.level === 'medium' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {scores.total.toFixed(1)}/100
                <span className="text-sm ml-2 font-normal text-gray-600">
                  ({integrity.label})
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-5 gap-2">
              <div className="bg-white p-2 rounded-lg text-center shadow-sm">
                <div className="text-xs text-gray-500">ICCS</div>
                <div className="font-bold text-blue-700">{scores.iccs}/32</div>
              </div>
              <div className="bg-white p-2 rounded-lg text-center shadow-sm">
                <div className="text-xs text-gray-500">Training</div>
                <div className="font-bold text-green-700">{scores.training}/24</div>
              </div>
              <div className="bg-white p-2 rounded-lg text-center shadow-sm">
                <div className="text-xs text-gray-500">AD</div>
                <div className="font-bold text-purple-700">{scores.ad}/14</div>
              </div>
              <div className="bg-white p-2 rounded-lg text-center shadow-sm">
                <div className="text-xs text-gray-500">CoC</div>
                <div className="font-bold text-orange-700">{scores.coc}/10</div>
              </div>
              <div className="bg-white p-2 rounded-lg text-center shadow-sm">
                <div className="text-xs text-gray-500">Cases</div>
                <div className="font-bold text-red-700">{scores.cases}/20</div>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex flex-wrap gap-2 mt-2">
          {mode === 'test' && (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-md">Test Mode</span>
          )}
          {isAIMSAssessment && (
            <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-md">
              AIMS Assessment - 5 Indicators
            </span>
          )}
        </div>
      </div>

      {/* Form Sections */}
      <div>
        {sections.map((section, index) => (
          <div key={section.id || `section-${index}`}>
            {renderSection(section, index)}
          </div>
        ))}
      </div>
      
      {/* Weighted Sum Display for Cases */}
      {showWeightedSum && (
        <div className="mt-4 mb-6">
          <WeightedSumField
            convictions={Number(formData.conviction_cases) || 0}
            prosecutions={Number(formData.prosecution_cases) || 0}
            adminActions={Number(formData.admin_action_cases) || 0}
            points={scores.cases}
            description={`Severity Score: ${(Number(formData.conviction_cases)||0)*3 + (Number(formData.prosecution_cases)||0)*2 + (Number(formData.admin_action_cases)||0)*1} → ${scores.cases} points`}
          />
        </div>
      )}
      
      {/* Navigation */}
      {totalSections > 1 && (
        <div className="flex justify-between mt-8 pt-8 border-t border-gray-200">
          <button
            type="button"
            onClick={() => setActiveSection(Math.max(0, activeSection - 1))}
            disabled={activeSection === 0 || submitting || isFormDisabled}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
          >
            Previous
          </button>
          
          {activeSection < totalSections - 1 ? (
            <button
              type="button"
              onClick={() => setActiveSection(Math.min(totalSections - 1, activeSection + 1))}
              disabled={submitting || isFormDisabled}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting || isFormDisabled}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center"
            >
              {submitting ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckIcon className="h-5 w-5 mr-2" />
                  {template.uiConfig?.submit_button_text || 'Submit'}
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Single-section submit */}
      {totalSections === 1 && !isFormDisabled && (
        <div className="mt-8 pt-8 border-t border-gray-200 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center"
          >
            {submitting ? (
              <>
                <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckIcon className="h-5 w-5 mr-2" />
                {template.uiConfig?.submit_button_text || 'Submit'}
              </>
            )}
          </button>
        </div>
      )}
      
      {/* Validation Errors */}
      {showValidation && Object.keys(validationErrors).length > 0 && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <h4 className="text-sm font-medium text-red-800 mb-2">Please fix the following errors:</h4>
          <ul className="text-sm text-red-700 list-disc list-inside">
            {Object.values(validationErrors).map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
});

DynamicForm.displayName = 'DynamicForm';

export default DynamicForm;
