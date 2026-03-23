// frontend/src/types/maturity.ts

/**
 * Maturity Framework Types
 * Based on Revised AIMS Framework Ver-3 with 4 maturity levels
 */

export type MaturityLevel = 0 | 1 | 2 | 3;

export interface MaturityLevelDefinition {
  /** Level number (0-3) */
  level: MaturityLevel;
  
  /** Display name for the level (e.g., "Nascent", "Foundational") */
  name: string;
  
  /** Points awarded for achieving this level */
  points: number;
  
  /** Brief description of what this level means */
  description: string;
  
  /** Detailed assessment parameters for this level */
  parameters: MaturityParameter[];
}

export interface MaturityParameter {
  /** Unique identifier */
  id: string;
  
  /** Parameter code (e.g., "1.1", "2.3", "3.5") */
  code: string;
  
  /** Short description of the parameter */
  description: string;
  
  /** Detailed guidance on what to look for during assessment */
  whatToLookFor: string;
  
  /** Optional examples of evidence that would satisfy this parameter */
  evidenceExamples?: string[];
  
  /** Is this parameter required for this maturity level? */
  required: boolean;
  
  /** Display order within the level */
  displayOrder: number;
}

export type ScoringType = 
  | 'maturity-level'      // Standard maturity level selection (0-3)
  | 'percentage-range'    // Percentage-based with thresholds (e.g., training completion)
  | 'severity-index'      // Severity point accumulation (e.g., corruption cases)
  | 'boolean'             // Simple yes/no
  | 'numeric';            // Raw numeric value

export interface PercentageThreshold {
  /** Minimum percentage for this level (inclusive) */
  min: number;
  
  /** Maximum percentage for this level (inclusive) */
  max: number;
  
  /** Maturity level achieved at this percentage range */
  level: MaturityLevel;
  
  /** Points awarded (can override level default) */
  points?: number;
}

export interface SeverityWeight {
  /** Type of case */
  caseType: 'conviction' | 'prosecution' | 'admin_action';
  
  /** Severity points for this case type */
  points: number;
  
  /** Description of what constitutes this case type */
  description: string;
}

export interface SeverityMapping {
  /** Minimum severity score for this range (inclusive) */
  minScore: number;
  
  /** Maximum severity score for this range (inclusive) */
  maxScore: number;
  
  /** Maturity level achieved */
  level: MaturityLevel;
  
  /** Points awarded */
  points: number;
}

export interface MaturityScoringRule {
  /** Type of scoring to apply */
  type: ScoringType;
  
  /** For standard maturity level scoring */
  levelPoints?: {
    [key in MaturityLevel]?: number;
  };
  
  /** For percentage-based scoring (e.g., training completion) */
  percentageThresholds?: PercentageThreshold[];
  
  /** For severity index scoring (e.g., corruption cases) */
  severityWeights?: SeverityWeight[];
  severityMapping?: SeverityMapping[];
  
  /** For numeric scoring with custom logic */
  scoringFunction?: string; // JSON string of a function or formula
}

export interface SubsystemDefinition {
  /** Unique identifier for the subsystem */
  id: string;
  
  /** Display name */
  name: string;
  
  /** Description of what this subsystem measures */
  description: string;
  
  /** Weight/points contribution to parent indicator */
  weight: number;
  
  /** Maturity framework for this subsystem */
  maturityFramework: MaturityFramework;
  
  /** Display order within parent indicator */
  displayOrder: number;
  
  /** Is this subsystem active? */
  isActive: boolean;
}

export interface MaturityFramework {
  /** Is maturity framework enabled for this indicator/subsystem? */
  enabled: boolean;
  
  /** Available maturity levels */
  levels: MaturityLevelDefinition[];
  
  /** Scoring rules */
  scoringRule: MaturityScoringRule;
  
  /** Default level if no assessment made */
  defaultLevel?: MaturityLevel;
  
  /** Can levels be skipped? (e.g., jump from 0 to 2) */
  allowSkipLevels?: boolean;
  
  /** Minimum level required for compliance */
  minimumRequiredLevel?: MaturityLevel;
}

/**
 * Assessment Response Types
 */

export interface MaturityAssessment {
  /** ID of the indicator being assessed */
  indicatorId: string;
  
  /** ID of the subsystem (if applicable) */
  subsystemId?: string;
  
  /** Selected maturity level */
  selectedLevel: MaturityLevel;
  
  /** Which parameters were satisfied at this level */
  satisfiedParameters: string[]; // Array of parameter IDs
  
  /** Evidence provided for each parameter */
  evidence: {
    [parameterId: string]: {
      description: string;
      documents?: string[]; // URLs to uploaded documents
      verifiedBy?: string;
      verifiedAt?: string;
    }
  };
  
  /** Assessor notes */
  notes?: string;
  
  /** Assessment date */
  assessedAt: string;
  
  /** Assessed by */
  assessedBy: string;
  
  /** Is this assessment verified? */
  verified: boolean;
}

export interface PercentageAssessment {
  /** Indicator ID */
  indicatorId: string;
  
  /** Numerator (e.g., employees completed training) */
  numerator: number;
  
  /** Denominator (e.g., total employees) */
  denominator: number;
  
  /** Calculated percentage */
  percentage: number;
  
  /** Derived maturity level based on thresholds */
  derivedLevel: MaturityLevel;
  
  /** Supporting evidence */
  evidence?: string;
}

export interface SeverityAssessment {
  /** Indicator ID (usually 'ind_cases') */
  indicatorId: string;
  
  /** Counts by case type */
  caseCounts: {
    conviction: number;
    prosecution: number;
    admin_action: number;
  };
  
  /** Calculated severity score */
  severityScore: number;
  
  /** Derived maturity level based on severity mapping */
  derivedLevel: MaturityLevel;
  
  /** Case details (optional, for audit) */
  caseDetails?: Array<{
    caseId: string;
    type: 'conviction' | 'prosecution' | 'admin_action';
    description: string;
    date: string;
  }>;
}

/**
 * Configuration Types for Admin UI
 */

export interface MaturityFrameworkTemplate {
  /** Template ID */
  id: string;
  
  /** Template name (e.g., "Standard ICCS Framework") */
  name: string;
  
  /** Description */
  description: string;
  
  /** Applicable indicator types */
  applicableTo: string[]; // Indicator IDs or categories
  
  /** The framework definition */
  framework: MaturityFramework;
  
  /** Is this the default template? */
  isDefault: boolean;
  
  /** Version */
  version: string;
  
  /** Created at */
  createdAt: string;
  
  /** Updated at */
  updatedAt: string;
}

/**
 * Validation Results
 */

export interface MaturityValidationResult {
  /** Is the framework configuration valid? */
  isValid: boolean;
  
  /** Level validation */
  levelValidation: {
    level: MaturityLevel;
    hasParameters: boolean;
    parameterCount: number;
    pointsDefined: boolean;
    errors: string[];
    warnings: string[];
  }[];
  
  /** Overall errors */
  errors: string[];
  
  /** Overall warnings */
  warnings: string[];
}

/**
 * Constants
 */

export const MATURITY_LEVELS: Record<MaturityLevel, { name: string; description: string }> = {
  0: {
    name: 'Nascent',
    description: 'No formal systems established; agency has not begun developing integrity controls'
  },
  1: {
    name: 'Foundational',
    description: 'Basic systems exist (policies approved, registers created, staff aware)'
  },
  2: {
    name: 'Established',
    description: 'Systems operational and consistently used; processes documented and roles assigned'
  },
  3: {
    name: 'Advanced',
    description: 'Systems embedded in culture; data analyzed for improvements; continuous learning'
  }
};

export const DEFAULT_ICCS_SUBSYSTEMS = [
  {
    id: 'complaint',
    name: 'Complaint Management Mechanism',
    description: 'System for receiving and handling complaints about code violations',
    weight: 8
  },
  {
    id: 'coi',
    name: 'Conflict of Interest Management',
    description: 'Declaration and management of conflicts of interest',
    weight: 8
  },
  {
    id: 'gift',
    name: 'Gift Management System',
    description: 'Declaration and management of gifts as per Gift Rules 2017',
    weight: 8
  },
  {
    id: 'proactive',
    name: 'Proactive Systemic Integrity Enhancements',
    description: 'Innovation and continuous improvement in integrity systems',
    weight: 8
  }
] as const;

export const SEVERITY_WEIGHTS = {
  conviction: 3,
  prosecution: 2,
  admin_action: 1
} as const;

export const SEVERITY_SCORING_MATRIX = [
  { minScore: 0, maxScore: 0, level: 3, points: 20 },
  { minScore: 1, maxScore: 2, level: 2, points: 12 },
  { minScore: 3, maxScore: 4, level: 1, points: 6 },
  { minScore: 5, maxScore: Infinity, level: 0, points: 0 }
] as const;

export const PERCENTAGE_THRESHOLDS = {
  capacity_building: [
    { min: 0, max: 49, level: 0, points: 0 },
    { min: 50, max: 69, level: 1, points: 10 },
    { min: 70, max: 84, level: 2, points: 18 },
    { min: 85, max: 100, level: 3, points: 24 }
  ],
  asset_declaration: [
    { min: 0, max: 89, level: 0, points: 0 },
    { min: 90, max: 94, level: 1, points: 5 },
    { min: 95, max: 99, level: 2, points: 10 },
    { min: 100, max: 100, level: 3, points: 14 }
  ]
} as const;