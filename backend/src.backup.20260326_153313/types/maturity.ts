// backend/src/types/maturity.ts

export type MaturityLevel = 0 | 1 | 2 | 3;

export interface MaturityLevelDefinition {
  level: MaturityLevel;
  name: string;
  points: number;
  description: string;
  parameters: MaturityParameter[];
}

export interface MaturityParameter {
  id: string;
  code: string;
  description: string;
  whatToLookFor: string;
  evidenceExamples?: string[];
  required: boolean;
  displayOrder: number;
}

export type ScoringType = 'maturity-level' | 'percentage-range' | 'severity-index' | 'boolean' | 'numeric';

export interface PercentageThreshold {
  min: number;
  max: number;
  level: MaturityLevel;
  points: number;
}

export interface SeverityWeight {
  caseType: 'conviction' | 'prosecution' | 'admin_action';
  points: number;
  description: string;
}

export interface SeverityMapping {
  minScore: number;
  maxScore: number;
  level: MaturityLevel;
  points: number;
}

export interface MaturityScoringRule {
  type: ScoringType;
  levelPoints?: { [key in MaturityLevel]?: number };
  percentageThresholds?: PercentageThreshold[];
  severityWeights?: SeverityWeight[];
  severityMapping?: SeverityMapping[];
  scoringFunction?: string;
}

export interface MaturityFramework {
  enabled: boolean;
  levels: MaturityLevelDefinition[];
  scoringRule: MaturityScoringRule;
  defaultLevel?: MaturityLevel;
  allowSkipLevels?: boolean;
  minimumRequiredLevel?: MaturityLevel;
}

export interface SubsystemDefinition {
  id: string;
  name: string;
  description: string;
  weight: number;
  maturityFramework: MaturityFramework;
  displayOrder: number;
  isActive: boolean;
}