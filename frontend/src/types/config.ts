// Type definitions for fully customizable configuration system - FRONTEND

// ==================== CORE TYPES ====================
export type IndicatorCategory = 
  | 'integrity_promotion'  // Integrity Promotion (from your frontend)
  | 'corruption_accountability'; // Corruption Accountability (from your frontend)

export type ParameterType = 
  | 'number'
  | 'boolean'
  | 'object'
  | 'percentage'
  | 'array'
  | 'text'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'date'
  | 'file'
  | 'textarea'
  | 'range'
  | 'display'
  | 'raw_number_pair'
  | 'case_count_set'
  | 'system_status_set'
  | 'calculated';  // ← ADD THIS

export type ScoringMethod = 
  | 'sum' 
  | 'average' 
  | 'weighted' 
  | 'formula' 
  | 'conditional'
  | 'manual'
  | 'auto_percentage'      // Auto-scoring based on percentage ranges
  | 'auto_weighted_sum';   // Auto-scoring based on weighted sums

export type CalculationType = 
  | 'manual' 
  | 'auto' 
  | 'mixed' 
  | 'percentage' 
  | 'weighted_sum' 
  | 'boolean_logic' 
  | 'formula'
  | 'system_status'
  | 'composite';  // ADDED: For composite indicator scoring

export type RuleType = 
  | 'range' 
  | 'threshold' 
  | 'boolean' 
  | 'formula' 
  | 'custom';

export type TemplateType = 
  | 'assessment' 
  | 'report' 
  | 'data_collection' 
  | 'custom';

export type DataType = 
  | 'text' 
  | 'number' 
  | 'boolean' 
  | 'select' 
  | 'date' 
  | 'file' 
  | 'array' 
  | 'object'
  | 'percentage'
  | 'raw_pair'
  | 'case_set'
  | 'system_set';

// ==================== CALCULATION CONFIG TYPES ====================
export interface PercentageConfig {
  numeratorField: string;          // Parameter code for numerator
  denominatorField: string;        // Parameter code for denominator
  numeratorLabel: string;          // Display label for numerator
  denominatorLabel: string;        // Display label for denominator
  unit: string;                    // "employees", "officials", "ATRs", etc.
  precision?: number;              // Decimal precision (default: 2)
  rounding?: 'up' | 'down' | 'nearest'; // Rounding method
}

export interface CaseTypeConfig {
  type: string;                    // "Conviction", "Prosecution", "Admin Action"
  weight: number;                  // 3, 2, 1
  label: string;                   // "Number of Conviction Cases"
  field: string;                   // Parameter code for this case type
  maxCases?: number;               // Maximum allowed cases
}

export interface WeightedSumConfig {
  caseTypes: CaseTypeConfig[];     // Different case types with weights
  maxTotalWeight?: number;         // Maximum total weighted sum
}

export interface BooleanLogicConfig {
  fields: string[];                // Parameter codes to evaluate
  logic: 'AND' | 'OR' | 'XOR' | 'NAND' | 'NOR'; // Logic operator
  trueValue?: any;                 // Value to return if true
  falseValue?: any;                // Value to return if false
}

export interface FormulaConfig {
  formula: string;                 // Formula expression with {variables}
  variables: Record<string, {      // Variable definitions
    label: string;
    field: string;                 // Parameter code
    type: 'number' | 'boolean' | 'string';
    defaultValue?: any;
  }>;
  validation?: {
    minResult?: number;
    maxResult?: number;
    allowedRange?: [number, number];
  };
}

export interface SystemStatusConfig {
  systems: Array<{
    name: string;                  // "Complaint Mechanism", "Conflict of Interest System"
    existenceField: string;        // Parameter code for existence
    functioningField: string;      // Parameter code for functioning
    existencePoints: number;       // Points if exists (e.g., 3)
    functioningPoints: number;     // Points if functioning (e.g., 4)
  }>;
}

export interface CalculationDetails {
  percentageConfig?: PercentageConfig;
  weightedSumConfig?: WeightedSumConfig;
  booleanConfig?: BooleanLogicConfig;
  formulaConfig?: FormulaConfig;
  systemStatusConfig?: SystemStatusConfig;
}

export interface CalculationConfig {
  calculationType: CalculationType;
  calculationDetails?: CalculationDetails;
  autoCalculate: boolean;          // Whether to auto-calculate on value change
  allowManualOverride: boolean;    // Whether manual override is allowed
  showCalculation: boolean;        // Whether to show calculation in UI
  validationRules?: {
    requireBothFields?: boolean;   // For percentage: require both numerator/denominator
    minDenominator?: number;       // Minimum denominator value
    maxNumeratorRatio?: number;    // Max numerator/denominator ratio (e.g., 1.0)
  };
}

// ==================== VALIDATION & UI ====================
export interface ValidationRule {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  required?: boolean;
  customMessage?: string;
  step?: number;
}

export interface UISettings {
  placeholder?: string;
  helpText?: string;
  width?: string | number;
  height?: string | number;
  rows?: number;
  cols?: number;
  step?: number;
  min?: number;
  max?: number;
  options?: Option[];
  theme?: 'default' | 'compact' | 'spacious';
  component?: string;
  className?: string;
  style?: Record<string, any>;
  // Extended properties for specific field types
  disabled?: boolean;
  readOnly?: boolean;
  trueLabel?: string;
  falseLabel?: string;
  rangeDisplay?: string;
  // Auto-scoring display properties
  showScore?: boolean;             // Whether to show calculated score
  scorePosition?: 'right' | 'below' | 'tooltip'; // Where to display score
  rawDataDisplay?: 'inline' | 'separate' | 'collapsed'; // How to show raw data
}

export interface Option {
  label: string;
  value: any;
  description?: string;
  disabled?: boolean;
  points?: number;                 // Points associated with this option
}

// ==================== PARAMETER DEFINITIONS ====================
export interface ParameterDefinition {
  id?: string;
  code: string;
  label: string;
  type: ParameterType;
  description?: string;
  required: boolean;
  defaultValue?: any;
  options?: Option[];
  validation?: ValidationRule;
  uiSettings?: UISettings;
  calculationConfig?: CalculationConfig; // NEW: Auto-scoring configuration
  scoringRuleIds: string[];              // NEW: Linked scoring rules
  dependencies: string[];                // NEW: Parameter codes this depends on
  displayOrder: number;
  isActive: boolean;
  weight?: number;
  metadata?: Record<string, any>;
}

// ==================== SCORING RULES ====================
export interface ScoringRule {
  id?: string;
  parameterCode: string;
  condition: string;
  description?: string;
  points: number;
  minValue?: number;
  maxValue?: number;
  dependsOn?: string[];
  metadata?: Record<string, any>;
  formula?: string;
}

// ==================== INDICATOR DEFINITIONS ====================
export interface IndicatorDefinition {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: IndicatorCategory;
  weight: number;
  maxScore: number;
  scoringMethod: ScoringMethod;
  formula?: string;
  parameters: ParameterDefinition[];
  scoringRules: ScoringRule[];
  uiConfig: Record<string, any>;
  isActive: boolean;
  displayOrder: number;
  metadata: Record<string, any>;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

// ==================== FORM SYSTEM ====================
export interface FormField {
  id: string;
  parameterCode: string;
  indicatorId?: string;
  label: string;
  type: ParameterType;  // Now includes 'calculated'
  required: boolean;
  width?: number;
  displayOrder: number;
  condition?: {
    field: string;
    operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'contains' | 'notContains';
    value: any;
  };
  uiSettings?: Record<string, any>;
  formula?: string;
  readonly?: boolean;
  calculationDescription?: string;
  calculationConfig?: CalculationConfig; // NEW: Field-specific calculation config
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  columns: number;
  fields: FormField[];
  displayOrder: number;
  condition?: {
    field: string;
    operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'contains' | 'notContains';
    value: any;
  };
}

export interface FormTemplate {
  id: string;
  name: string;
  description?: string;
  templateType: TemplateType;
  indicatorIds: string[];
  sections: FormSection[];
  validationRules: Record<string, any>;
  uiConfig: Record<string, any>;
  scoringConfig?: {                // NEW: Template-level scoring config
    enableAutoScoring: boolean;
    showCalculatedScores: boolean;
    allowManualOverride: boolean;
    autoCalculateOnChange: boolean;
    defaultCalculationType?: CalculationType;
  };
  version: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

// ==================== CONFIGURATION VERSIONING ====================
export interface ConfigurationVersion {
  id: string;
  versionName: string;
  versionNumber: string;
  description?: string;
  indicators: IndicatorDefinition[];
  formTemplates: FormTemplate[];
  systemConfig: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  appliedAt?: string;
  appliedBy?: string;
  createdBy: string;
}

// ==================== SYSTEM CONFIG ====================
export interface SystemConfigItem {
  id?: number;
  configKey: string;
  configValue: string;
  configType: 'string' | 'number' | 'boolean' | 'json' | 'array';
  category: string;
  description?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrityThresholds {
  highIntegrityMin: number;
  mediumIntegrityMin: number;
  updatedAt: string;
  updatedBy: string;
  [key: string]: number | string | boolean; // allows dynamic config keys
}

// ==================== CALCULATION RESULT TYPES ====================
export interface CalculationResult {
  parameterCode: string;
  rawValue: any;
  calculatedValue: any;
  rawData?: Record<string, any>;  // For percentage: {numerator: X, denominator: Y}
  calculationType: CalculationType;
  calculationDetails?: CalculationDetails;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  timestamp: string;
  metadata?: {                    // ADDED: For calculation metadata
    calculationTimeMs: number;
    engineVersion: string;
  };
}

export interface ScoringResult {
  indicatorId: string;
  parameterCode: string;
  score: number;
  maxScore: number;
  calculationResult: CalculationResult;
  appliedScoringRules: ScoringRule[];
  isOverridden: boolean;
  overrideReason?: string;
  timestamp?: string;             // ADDED: Optional for consistency with backend
  evaluationErrors?: string[];    // ADDED: For rule evaluation errors
}

// ==================== ASSESSMENT RESPONSES ====================
export interface DynamicAssessmentResponse {
  id: string;
  assessmentId: string;
  indicatorId: string;
  responseData: Record<string, any>;
  calculatedScore?: number;
  manualScore?: number;
  finalScore: number;
  evidenceFiles: string[];
  comments?: string;
  validatedBy?: string;
  validatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== API RESPONSE TYPES ====================
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];
  warnings?: string[];
  message?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

// ==================== HELPER TYPES ====================
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
}

export interface IndicatorStatistics {
  total: number;
  byCategory: Record<string, number>;
  active: number;
  inactive: number;
  totalWeight: number;
  autoScoringCount: number;
  manualScoringCount: number;
}

export interface ConfigurationStats {
  indicators: number;
  activeIndicators: number;
  formTemplates: number;
  activeTemplates: number;
  configurationVersions: number;
  activeVersion?: ConfigurationVersion;
  autoScoringEnabled: boolean;
}

// ==================== CREATE/UPDATE INPUT TYPES ====================
export type CreateIndicatorInput = Omit<IndicatorDefinition, 
  'id' | 'createdAt' | 'updatedAt' | 'version' | 'createdBy' | 'updatedBy'> & {
  id?: string;
  createdBy: string;
};

export type UpdateIndicatorInput = Partial<IndicatorDefinition> & {
  updatedBy: string;
};

// ==================== UTILITY TYPES ====================
export interface IndicatorOption {
  id: string;
  code: string;
  name: string;
  category: IndicatorCategory;
  weight: number;
}

export interface CategoryOption {
  value: IndicatorCategory;
  label: string;
  description?: string;
}

export const INDICATOR_CATEGORIES: CategoryOption[] = [
  { value: 'integrity_promotion', label: 'Integrity Promotion', description: 'Integrity promotion activities' },
  { value: 'corruption_accountability', label: 'Corruption Accountability', description: 'Corruption accountability metrics' },
];

export const SCORING_METHODS = [
  { value: 'sum', label: 'Sum', description: 'Sum of all parameter scores' },
  { value: 'average', label: 'Average', description: 'Average of parameter scores' },
  { value: 'weighted', label: 'Weighted', description: 'Weighted average based on parameter weights' },
  { value: 'formula', label: 'Formula', description: 'Custom formula calculation' },
  { value: 'conditional', label: 'Conditional', description: 'Condition-based scoring' },
  { value: 'manual', label: 'Manual', description: 'Manual score entry' },
  { value: 'auto_percentage', label: 'Auto Percentage', description: 'Automatic scoring based on percentage ranges' },
  { value: 'auto_weighted_sum', label: 'Auto Weighted Sum', description: 'Automatic scoring based on weighted sums' },
];

export const PARAMETER_TYPES = [
  { value: 'text', label: 'Text', icon: '📝' },
  { value: 'number', label: 'Number', icon: '🔢' },
  { value: 'percentage', label: 'Percentage', icon: '%' },
  { value: 'select', label: 'Select', icon: '📋' },
  { value: 'checkbox', label: 'Checkbox', icon: '☑️' },
  { value: 'date', label: 'Date', icon: '📅' },
  { value: 'file', label: 'File Upload', icon: '📎' },
  { value: 'textarea', label: 'Text Area', icon: '📄' },
  { value: 'range', label: 'Range', icon: '📊' },
  { value: 'boolean', label: 'Yes/No', icon: '✅' },
  { value: 'raw_number_pair', label: 'Number Pair', icon: '🔢🔢', description: 'Two numbers for percentage calculation' },
  { value: 'case_count_set', label: 'Case Count Set', icon: '📋📊', description: 'Multiple case types with weights' },
  { value: 'system_status_set', label: 'System Status', icon: '🖥️✅', description: 'System existence and functioning' },
];

export const CALCULATION_TYPES = [
  { value: 'manual', label: 'Manual', description: 'Manual data entry and scoring' },
  { value: 'auto', label: 'Auto', description: 'Fully automatic calculation' },
  { value: 'mixed', label: 'Mixed', description: 'Auto-calculation with manual override' },
  { value: 'percentage', label: 'Percentage', description: 'Calculate from numerator/denominator' },
  { value: 'weighted_sum', label: 'Weighted Sum', description: 'Weighted sum of values' },
  { value: 'boolean_logic', label: 'Boolean Logic', description: 'AND/OR logic calculation' },
  { value: 'formula', label: 'Formula', description: 'Custom formula calculation' },
  { value: 'system_status', label: 'System Status', description: 'System existence and functioning scoring' },
  { value: 'composite', label: 'Composite', description: 'Composite indicator scoring' }, // ADDED
];