//backend/src/types.ts
export type UserRole =
  | 'admin'  // ADD THIS
  | 'commissioner'
  | 'director'
  | 'system_admin'
  | 'prevention_officer'
  | 'agency_head'
  | 'focal_person';

export const assertUserRole = (role: string): UserRole => {
  const validRoles: UserRole[] = [
    'admin',  // ADD THIS
    'commissioner',
    'director',
    'system_admin',
    'prevention_officer',
    'agency_head',
    'focal_person'
  ];
  if (!validRoles.includes(role as UserRole)) {
    throw new Error(`Invalid role: ${role}`);
  }
  return role as UserRole;
};

// ✅ ADD THIS: User interface with all properties from your database
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  password_hash?: string;
  status?: string;  // ✅ ADD THIS - from your users table
  agency_id?: string;
  is_active?: boolean | number; // ✅ ADD THIS - can be boolean or number (0/1)
  created_at?: string;
  updated_at?: string;
  last_login?: string;
  login_attempts?: number;
  lock_until?: string;
  password_changed_at?: string;
  password_reset_token?: string;
  password_reset_expires?: string;
  department?: string;
  phone?: string;
  position?: string;
  profile_image?: string;
}

// Optional: Session user type (subset of User for session storage)
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  agency_id?: string | null;
  department?: string;
  phone?: string;
  profile_image?: string;
  last_login?: string;
}

// Add these to your existing types file

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

export interface MaturityFrameworkTemplate {
  id: string;
  name: string;
  description: string;
  applicableTo: string[];
  framework: MaturityFramework;
  isDefault: boolean;
  version: string;
  createdAt: string;
  updatedAt: string;
}

// Database row types
export interface MaturityFrameworkRow {
  id?: number;
  indicator_id: string;
  levels: string; // JSON string
  scoring_rule: string; // JSON string
  enabled: number;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export interface SubsystemRow {
  id: string;
  indicator_id: string;
  name: string;
  description: string | null;
  weight: number;
  maturity_framework: string; // JSON string
  display_order: number;
  is_active: number;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}