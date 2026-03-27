// Type definitions for fully customizable configuration system

// ==================== CORE TYPES ====================
export type IndicatorCategory = 
  | 'iccs_framework'        // Internal Corruption Control Systems Framework
  | 'integrity_training'    // Integrity Training & Capacity Building
  | 'asset_declaration'     // Asset Declaration Compliance
  | 'case_handling'        // Corruption Case Handling & Resolution
  | 'atr_timeliness'       // ATR Timeliness & Responsiveness
  | 'integrity_promotion'  // Integrity Promotion (from your frontend)
  | 'corruption_accountability' // Corruption Accountability (from your frontend)
  | 'general'              // General indicators
  | 'custom'               // Custom indicators
  | 'compliance'           // From frontend
  | 'capacity'             // From frontend
  | 'enforcement'          // From frontend
  | 'responsiveness'       // From frontend
  | 'innovation'           // From frontend
  | 'other';               // From frontend

export type ParameterType = 
  | 'text' 
  | 'number' 
  | 'select' 
  | 'checkbox' 
  | 'radio' 
  | 'date' 
  | 'file' 
  | 'textarea' 
  | 'range'
  | 'percentage'
  | 'boolean'
  | 'array'
  | 'object'
  | 'raw_number_pair'      // For numerator/denominator pairs
  | 'case_count_set'       // For multiple case types with weights
  | 'system_status_set';   // For system existence/functioning pairs

export type ScoringMethod = 
  | 'sum' 
  | 'average' 
  | 'weighted' 
  | 'formula' 
  | 'conditional'
  | 'manual'
  | 'auto_percentage'      // Auto-scoring based on percentage ranges
  | 'auto_weighted_sum';   // Auto-scoring based on weighted sums

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

export type CalculationType = 
  | 'manual' 
  | 'auto' 
  | 'mixed' 
  | 'percentage' 
  | 'weighted_sum' 
  | 'boolean_logic' 
  | 'formula'
  | 'system_status'
  | 'composite';  // Added 'composite' to fix the error

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
  custom?: (value: any) => boolean;
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
  component?: string; // Custom UI component
  className?: string;
  style?: Record<string, any>;
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
  weight?: number; // For weighted scoring
  metadata?: Record<string, any>;
  
  // For database mapping (snake_case)
  data_type?: DataType;
  validation_rules?: string;
  ui_component?: string;
  default_value?: any;
  display_order?: number;
  is_active?: boolean;
  metadata_json?: string;
  calculation_config?: string;
  scoring_rule_ids?: string;
  dependencies_json?: string;
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
  formula?: string; // For formula-based scoring
  
  // For database mapping
  parameter_code?: string;
  min_value?: number;
  max_value?: number;
  depends_on?: string[];
}

export interface ScoringRuleTemplate {
  id: string;
  name: string;
  description?: string;
  ruleType: RuleType;
  condition: string;
  points: number;
  parameters: Record<string, any>;
  isActive: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  
  // For database mapping
  rule_type?: RuleType;
  is_active?: boolean;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
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
  formula?: string; // For formula-based scoring
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
  
  // For database mapping
  max_score?: number;
  scoring_method?: ScoringMethod;
  parameters_json?: string;
  scoring_rules_json?: string;
  ui_config?: string;
  is_active?: boolean;
  display_order?: number;
  version_number?: number;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

// ==================== FORM SYSTEM ====================
export interface FormField {
  id: string;
  parameterCode: string;
  indicatorId?: string;
  label: string;
  type: ParameterType;
  required: boolean;
  width?: number;
  displayOrder: number;
  condition?: {
    field: string;
    operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'contains' | 'notContains';
    value: any;
  };
  uiSettings?: Record<string, any>;
  calculationConfig?: CalculationConfig; // NEW: Field-specific calculation config
  
  // For database mapping
  parameter_code?: string;
  indicator_id?: string;
  display_order?: number;
  ui_settings?: string;
  calculation_config?: string;
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
  
  // For database mapping
  display_order?: number;
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
  
  // For database mapping
  template_type?: TemplateType;
  indicator_ids?: string;
  sections_json?: string;
  validation_rules?: string;
  ui_config?: string;
  scoring_config?: string;
  version_number?: string;
  is_active?: boolean;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
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
  
  // For database mapping
  version_name?: string;
  version_number?: string;
  indicators_json?: string;
  form_templates_json?: string;
  system_config?: string;
  is_active?: boolean;
  applied_at?: string;
  applied_by?: string;
  created_by?: string;
  created_at?: string;
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
  
  // For database mapping
  config_key?: string;
  config_value?: string;
  config_type?: 'string' | 'number' | 'boolean' | 'json' | 'array';
  is_public?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface IntegrityThresholds {
  highIntegrityMin: number;
  mediumIntegrityMin: number;
  updatedAt: string;
  updatedBy: string;
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
  
  // For database mapping
  assessment_id?: string;
  indicator_id?: string;
  response_data?: string;
  calculated_score?: number;
  manual_score?: number;
  final_score?: number;
  evidence_files?: string;
  validated_by?: string;
  validated_at?: string;
  created_at?: string;
  updated_at?: string;
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
  timestamp: string;             // ADDED: For consistency
  evaluationErrors?: string[];   // ADDED: For rule evaluation errors
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

export type CreateFormTemplateInput = Omit<FormTemplate, 
  'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'> & {
  id?: string;
  createdBy: string;
};

export type CreateConfigurationVersionInput = Omit<ConfigurationVersion,
  'id' | 'createdAt' | 'appliedAt' | 'appliedBy'> & {
  createdBy: string;
};

// ==================== UTILITY TYPES ====================
export type DatabaseRow<T> = {
  [K in keyof T as string]: any;
};

export type SnakeToCamel<S extends string> = S extends `${infer T}_${infer U}`
  ? `${T}${Capitalize<SnakeToCamel<U>>}`
  : S;

export type CamelToSnake<S extends string> = S extends `${infer T}${infer U}`
  ? `${T extends Capitalize<T> ? '_' : ''}${Lowercase<T>}${CamelToSnake<U>}`
  : S;