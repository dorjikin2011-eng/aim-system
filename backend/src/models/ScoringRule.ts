// backend/src/models/ScoringRule.ts - POSTGRESQL FIXED VERSION

import { getDB, getAsync, allAsync, runAsync } from './db';

export type ScoringType = 'maturity-level' | 'percentage-range' | 'severity-index' | 'boolean';

export interface ScoringRule {
  id: string;
  indicatorId: string;
  parameterCode?: string;
  scoringType: ScoringType;
  
  // For maturity-level scoring
  maturityLevels?: {
    level: number; // 0,1,2,3
    points: number;
    label: string;
    requiredParameters?: string[]; // IDs of required parameters for this level
  }[];
  
  // For percentage-range scoring
  percentageThresholds?: {
    min: number;
    max: number;
    level: number;
    points: number;
    label: string;
  }[];
  
  // For severity-index scoring
  severityWeights?: {
    caseType: 'conviction' | 'prosecution' | 'admin_action';
    points: number;
  }[];
  severityMapping?: {
    minScore: number;
    maxScore: number;
    level: number;
    points: number;
  }[];
  
  // For boolean scoring (legacy)
  condition?: string;
  points?: number;
  
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export class ScoringRuleModel {
  
  /**
   * Get all scoring rules
   */
  static async getAll(): Promise<ScoringRule[]> {
    const db = getDB();
    const rows = await allAsync<any>(
      db,
      'SELECT * FROM scoring_rules ORDER BY indicator_id'
    );
    
    return rows.map(row => this.mapRowToScoringRule(row));
  }

  /**
   * Get scoring rules by indicator
   */
  static async getByIndicator(indicatorId: string): Promise<ScoringRule[]> {
    const db = getDB();
    const rows = await allAsync<any>(
      db,
      'SELECT * FROM scoring_rules WHERE indicator_id = $1',
      [indicatorId]
    );
    
    return rows.map(row => this.mapRowToScoringRule(row));
  }

  /**
   * Get scoring rule by ID
   */
  static async getById(id: string): Promise<ScoringRule | null> {
    const db = getDB();
    const row = await getAsync<any>(
      db,
      'SELECT * FROM scoring_rules WHERE id = $1',
      [id]
    );
    
    if (!row) return null;
    return this.mapRowToScoringRule(row);
  }

  /**
   * Create new scoring rule
   */
  static async create(rule: Omit<ScoringRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const db = getDB();
    const id = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    // Prepare rule_config JSON based on scoring type
    let ruleConfig = {};
    
    if (rule.scoringType === 'maturity-level') {
      ruleConfig = {
        maturityLevels: rule.maturityLevels
      };
    } else if (rule.scoringType === 'percentage-range') {
      ruleConfig = {
        percentageThresholds: rule.percentageThresholds
      };
    } else if (rule.scoringType === 'severity-index') {
      ruleConfig = {
        severityWeights: rule.severityWeights,
        severityMapping: rule.severityMapping
      };
    } else {
      // Legacy boolean scoring
      ruleConfig = {
        condition: rule.condition,
        points: rule.points
      };
    }
    
    // FIXED: Use PostgreSQL $ placeholders and boolean
    await runAsync(
      db,
      `INSERT INTO scoring_rules (
        id, indicator_id, parameter_code, scoring_type, rule_config,
        description, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id,
        rule.indicatorId,
        rule.parameterCode || null,
        rule.scoringType,
        JSON.stringify(ruleConfig),
        rule.description || null,
        rule.isActive === true, // PostgreSQL boolean
        now,
        now
      ]
    );
    
    return id;
  }

  /**
   * Update scoring rule
   */
  static async update(id: string, updates: Partial<ScoringRule>): Promise<boolean> {
    const db = getDB();
    
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (updates.indicatorId !== undefined) {
      fields.push(`indicator_id = $${paramIndex++}`);
      values.push(updates.indicatorId);
    }
    if (updates.parameterCode !== undefined) {
      fields.push(`parameter_code = $${paramIndex++}`);
      values.push(updates.parameterCode);
    }
    if (updates.scoringType !== undefined) {
      fields.push(`scoring_type = $${paramIndex++}`);
      values.push(updates.scoringType);
    }
    if (updates.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }
    if (updates.isActive !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      values.push(updates.isActive === true); // PostgreSQL boolean
    }
    
    // Update rule_config if scoring type or specific config changed
    if (updates.scoringType || updates.maturityLevels || updates.percentageThresholds || 
        updates.severityWeights || updates.severityMapping || updates.condition) {
      
      let ruleConfig = {};
      
      if (updates.scoringType === 'maturity-level' || (!updates.scoringType && updates.maturityLevels)) {
        ruleConfig = {
          maturityLevels: updates.maturityLevels
        };
      } else if (updates.scoringType === 'percentage-range' || (!updates.scoringType && updates.percentageThresholds)) {
        ruleConfig = {
          percentageThresholds: updates.percentageThresholds
        };
      } else if (updates.scoringType === 'severity-index' || (!updates.scoringType && (updates.severityWeights || updates.severityMapping))) {
        ruleConfig = {
          severityWeights: updates.severityWeights,
          severityMapping: updates.severityMapping
        };
      } else {
        // Legacy
        ruleConfig = {
          condition: updates.condition,
          points: updates.points
        };
      }
      
      fields.push(`rule_config = $${paramIndex++}`);
      values.push(JSON.stringify(ruleConfig));
    }
    
    fields.push(`updated_at = $${paramIndex++}`);
    values.push(new Date().toISOString());
    values.push(id);
    
    if (fields.length === 0) {
      return false;
    }
    
    await runAsync(
      db,
      `UPDATE scoring_rules SET ${fields.join(', ')} WHERE id = $${paramIndex++}`,
      values
    );
    
    return true;
  }

  /**
   * Delete scoring rule
   */
  static async delete(id: string): Promise<boolean> {
    const db = getDB();
    
    await runAsync(
      db,
      'DELETE FROM scoring_rules WHERE id = $1',
      [id]
    );
    
    return true;
  }

  /**
   * Calculate score based on rules
   */
  static calculateScore(rules: ScoringRule[], values: Record<string, any>): number {
    let totalScore = 0;
    
    for (const rule of rules) {
      if (rule.scoringType === 'maturity-level') {
        // For maturity level scoring, values should contain level numbers (0-3)
        const level = values[rule.parameterCode || ''] || 0;
        const levelConfig = rule.maturityLevels?.find(l => l.level === level);
        if (levelConfig) {
          totalScore += levelConfig.points;
        }
      } 
      else if (rule.scoringType === 'percentage-range') {
        // For percentage scoring, values should contain the percentage
        const percentage = values[rule.parameterCode || ''] || 0;
        const threshold = rule.percentageThresholds?.find(
          t => percentage >= t.min && percentage <= t.max
        );
        if (threshold) {
          totalScore += threshold.points;
        }
      }
      else if (rule.scoringType === 'severity-index') {
        // For severity index, calculate weighted sum
        let severityScore = 0;
        if (rule.severityWeights) {
          for (const weight of rule.severityWeights) {
            const count = values[weight.caseType] || 0;
            severityScore += count * weight.points;
          }
        }
        
        const mapping = rule.severityMapping?.find(
          m => severityScore >= m.minScore && severityScore <= m.maxScore
        );
        if (mapping) {
          totalScore += mapping.points;
        }
      }
      else {
        // Legacy boolean scoring
        if (this.evaluateCondition(values[rule.parameterCode || ''], rule)) {
          totalScore += rule.points || 0;
        }
      }
    }
    
    return totalScore;
  }

  /**
   * Evaluate condition for legacy boolean scoring
   */
  private static evaluateCondition(value: any, rule: ScoringRule): boolean {
    const condition = rule.condition?.toLowerCase() || '';
    
    if (condition.includes('>=')) {
      const threshold = parseFloat(condition.replace('>=', '').trim());
      return typeof value === 'number' && value >= threshold;
    }
    
    if (condition.includes('<=')) {
      const threshold = parseFloat(condition.replace('<=', '').trim());
      return typeof value === 'number' && value <= threshold;
    }
    
    if (condition.includes('>')) {
      const threshold = parseFloat(condition.replace('>', '').trim());
      return typeof value === 'number' && value > threshold;
    }
    
    if (condition.includes('<')) {
      const threshold = parseFloat(condition.replace('<', '').trim());
      return typeof value === 'number' && value < threshold;
    }
    
    if (condition.includes('=')) {
      const expected = condition.replace('=', '').trim();
      return String(value) === expected;
    }
    
    if (condition === 'exists' || condition === 'true') {
      return Boolean(value);
    }
    
    if (condition === 'not_exists' || condition === 'false') {
      return !value;
    }
    
    return false;
  }

  /**
   * Get default scoring rules for AIMS indicators
   */
  static getDefaultRules(indicatorId: string): Omit<ScoringRule, 'id' | 'createdAt' | 'updatedAt'>[] {
    if (indicatorId === 'ind_1770114038668_i6jrig8sz' || indicatorId === 'ind_iccs') {
      // ICCS maturity level rules
      return [{
        indicatorId,
        scoringType: 'maturity-level',
        description: 'ICCS Maturity Level Scoring',
        isActive: true,
        maturityLevels: [
          { level: 0, points: 0, label: 'Nascent - No formal system' },
          { level: 1, points: 4, label: 'Foundational - Basic system exists' },
          { level: 2, points: 6, label: 'Established - System operational' },
          { level: 3, points: 8, label: 'Advanced - System embedded' }
        ]
      }];
    }
    
    if (indicatorId === 'ind_1770114038672_noe0zgtjx' || indicatorId === 'ind_capacity') {
      // Capacity Building percentage rules
      return [{
        indicatorId,
        scoringType: 'percentage-range',
        description: 'Training Completion Percentage Scoring',
        isActive: true,
        percentageThresholds: [
          { min: 0, max: 49, level: 0, points: 0, label: 'Nascent: <50% completion' },
          { min: 50, max: 69, level: 1, points: 10, label: 'Foundational: 50-69% completion' },
          { min: 70, max: 84, level: 2, points: 18, label: 'Established: 70-84% completion' },
          { min: 85, max: 100, level: 3, points: 24, label: 'Advanced: ≥85% completion' }
        ]
      }];
    }
    
    if (indicatorId === 'ind_1770114038673_zuella44q' || indicatorId === 'ind_ad') {
      // Asset Declaration percentage rules
      return [{
        indicatorId,
        scoringType: 'percentage-range',
        description: 'Asset Declaration Compliance Scoring',
        isActive: true,
        percentageThresholds: [
          { min: 0, max: 89, level: 0, points: 0, label: 'Nascent: <90% compliance' },
          { min: 90, max: 94, level: 1, points: 5, label: 'Foundational: 90-94% compliance' },
          { min: 95, max: 99, level: 2, points: 10, label: 'Established: 95-99% compliance' },
          { min: 100, max: 100, level: 3, points: 14, label: 'Advanced: 100% compliance' }
        ]
      }];
    }
    
    if (indicatorId === 'ind_coc') {
      // Code of Conduct maturity rules
      return [{
        indicatorId,
        scoringType: 'maturity-level',
        description: 'Code of Conduct Maturity Scoring',
        isActive: true,
        maturityLevels: [
          { level: 0, points: 0, label: 'Nascent - No active promotion' },
          { level: 1, points: 4, label: 'Foundational - Code exists and accessible' },
          { level: 2, points: 7, label: 'Established - Actively communicated' },
          { level: 3, points: 10, label: 'Advanced - Embedded in culture' }
        ]
      }];
    }
    
    if (indicatorId === 'ind_1770114038674_x4z2r2vjh' || indicatorId === 'ind_cases') {
      // Corruption Cases severity rules
      return [{
        indicatorId,
        scoringType: 'severity-index',
        description: 'Corruption Case Severity Scoring',
        isActive: true,
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
    
    return [];
  }

  /**
   * Map database row to ScoringRule - FIXED: PostgreSQL boolean
   */
  private static mapRowToScoringRule(row: any): ScoringRule {
    const ruleConfig = row.rule_config ? JSON.parse(row.rule_config) : {};
    
    const baseRule = {
      id: row.id,
      indicatorId: row.indicator_id,
      parameterCode: row.parameter_code,
      scoringType: row.scoring_type || 'boolean',
      description: row.description,
      isActive: row.is_active === true, // PostgreSQL boolean
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
    
    if (row.scoring_type === 'maturity-level') {
      return {
        ...baseRule,
        maturityLevels: ruleConfig.maturityLevels
      };
    } else if (row.scoring_type === 'percentage-range') {
      return {
        ...baseRule,
        percentageThresholds: ruleConfig.percentageThresholds
      };
    } else if (row.scoring_type === 'severity-index') {
      return {
        ...baseRule,
        severityWeights: ruleConfig.severityWeights,
        severityMapping: ruleConfig.severityMapping
      };
    } else {
      // Legacy boolean scoring
      return {
        ...baseRule,
        condition: ruleConfig.condition,
        points: ruleConfig.points
      };
    }
  }
}
