// backend/src/models/MaturityFramework.ts

import { getDB, getAsync, allAsync, runAsync } from './db';
import { 
  MaturityFramework,
  MaturityLevelDefinition,
  MaturityParameter,
  SubsystemDefinition,
  MaturityScoringRule
} from '../types/maturity';

export class MaturityFrameworkModel {
  
  /**
   * Get maturity framework for an indicator
   */
  static async getByIndicatorId(indicatorId: string): Promise<MaturityFramework | null> {
    try {
      const db = getDB();
      const result = await getAsync<any>(
        db,
        'SELECT * FROM maturity_frameworks WHERE indicator_id = ?',
        [indicatorId]
      );
      
      if (!result) return null;
      
      return this.mapRowToFramework(result);
    } catch (error) {
      console.error('Error getting maturity framework:', error);
      throw error;
    }
  }

  /**
   * Create or update maturity framework for an indicator
   */
  static async upsert(
    indicatorId: string,
    framework: MaturityFramework,
    updatedBy: string
  ): Promise<boolean> {
    try {
      const db = getDB();
      
      // Check if exists
      const existing = await this.getByIndicatorId(indicatorId);
      
      const now = new Date().toISOString();
      const dbFramework = this.prepareFrameworkForDb(indicatorId, framework, updatedBy, now);
      
      if (existing) {
        // Update
        await runAsync(
          db,
          `UPDATE maturity_frameworks 
           SET levels = ?, scoring_rule = ?, enabled = ?, updated_by = ?, updated_at = ?
           WHERE indicator_id = ?`,
          [
            dbFramework.levels,
            dbFramework.scoring_rule,
            dbFramework.enabled,
            updatedBy,
            now,
            indicatorId
          ]
        );
      } else {
        // Insert
        await runAsync(
          db,
          `INSERT INTO maturity_frameworks 
           (indicator_id, levels, scoring_rule, enabled, created_by, updated_by, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            indicatorId,
            dbFramework.levels,
            dbFramework.scoring_rule,
            dbFramework.enabled,
            updatedBy,
            updatedBy,
            now,
            now
          ]
        );
      }
      
      return true;
    } catch (error) {
      console.error('Error upserting maturity framework:', error);
      throw error;
    }
  }

  /**
   * Get subsystems for ICCS indicator
   */
  static async getSubsystems(indicatorId: string): Promise<SubsystemDefinition[]> {
    try {
      const db = getDB();
      const rows = await allAsync<any>(
        db,
        'SELECT * FROM iccs_subsystems WHERE indicator_id = ? ORDER BY display_order',
        [indicatorId]
      );
      
      return rows.map(row => this.mapRowToSubsystem(row));
    } catch (error) {
      console.error('Error getting subsystems:', error);
      throw error;
    }
  }

  /**
   * Update subsystems for ICCS indicator
   */
  static async updateSubsystems(
    indicatorId: string,
    subsystems: SubsystemDefinition[],
    updatedBy: string
  ): Promise<boolean> {
    try {
      const db = getDB();
      const now = new Date().toISOString();
      
      // Start transaction
      await runAsync(db, 'BEGIN TRANSACTION');
      
      try {
        // Delete existing subsystems
        await runAsync(
          db,
          'DELETE FROM iccs_subsystems WHERE indicator_id = ?',
          [indicatorId]
        );
        
        // Insert new subsystems
        for (const subsystem of subsystems) {
          const dbSubsystem = this.prepareSubsystemForDb(indicatorId, subsystem, updatedBy, now);
          
          await runAsync(
            db,
            `INSERT INTO iccs_subsystems 
             (id, indicator_id, name, description, weight, maturity_framework, 
              display_order, is_active, created_by, updated_by, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              subsystem.id,
              indicatorId,
              dbSubsystem.name,
              dbSubsystem.description,
              dbSubsystem.weight,
              dbSubsystem.maturity_framework,
              dbSubsystem.display_order,
              dbSubsystem.is_active,
              updatedBy,
              updatedBy,
              now,
              now
            ]
          );
        }
        
        await runAsync(db, 'COMMIT');
        return true;
      } catch (error) {
        await runAsync(db, 'ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error updating subsystems:', error);
      throw error;
    }
  }

  /**
   * Get all maturity framework templates
   */
  static async getTemplates(): Promise<any[]> {
    try {
      const db = getDB();
      const rows = await allAsync<any>(
        db,
        'SELECT * FROM maturity_framework_templates ORDER BY name'
      );
      
      return rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        applicableTo: JSON.parse(row.applicable_to),
        framework: JSON.parse(row.framework),
        isDefault: row.is_default === 1,
        version: row.version,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      console.error('Error getting framework templates:', error);
      throw error;
    }
  }

  /**
   * Create framework template
   */
  static async createTemplate(template: any, createdBy: string): Promise<string> {
    try {
      const db = getDB();
      const id = `mft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      
      await runAsync(
        db,
        `INSERT INTO maturity_framework_templates 
         (id, name, description, applicable_to, framework, is_default, version, 
          created_by, updated_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          template.name,
          template.description,
          JSON.stringify(template.applicableTo || []),
          JSON.stringify(template.framework),
          template.isDefault ? 1 : 0,
          template.version || '1.0.0',
          createdBy,
          createdBy,
          now,
          now
        ]
      );
      
      return id;
    } catch (error) {
      console.error('Error creating framework template:', error);
      throw error;
    }
  }

  /**
   * Delete framework template
   */
  static async deleteTemplate(id: string): Promise<boolean> {
    try {
      const db = getDB();
      
      await runAsync(
        db,
        'DELETE FROM maturity_framework_templates WHERE id = ?',
        [id]
      );
      
      return true;
    } catch (error) {
      console.error('Error deleting framework template:', error);
      throw error;
    }
  }

  /**
   * Map database row to MaturityFramework
   */
  private static mapRowToFramework(row: any): MaturityFramework {
    return {
      enabled: row.enabled === 1,
      levels: JSON.parse(row.levels),
      scoringRule: JSON.parse(row.scoring_rule)
    };
  }

  /**
   * Map database row to SubsystemDefinition
   */
  private static mapRowToSubsystem(row: any): SubsystemDefinition {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      weight: row.weight,
      maturityFramework: JSON.parse(row.maturity_framework),
      displayOrder: row.display_order,
      isActive: row.is_active === 1
    };
  }

  /**
   * Prepare framework for database
   */
  private static prepareFrameworkForDb(
    indicatorId: string,
    framework: MaturityFramework,
    updatedBy: string,
    timestamp: string
  ): any {
    return {
      indicator_id: indicatorId,
      levels: JSON.stringify(framework.levels),
      scoring_rule: JSON.stringify(framework.scoringRule),
      enabled: framework.enabled ? 1 : 0,
      updated_by: updatedBy,
      updated_at: timestamp
    };
  }

  /**
   * Prepare subsystem for database
   */
  private static prepareSubsystemForDb(
    indicatorId: string,
    subsystem: SubsystemDefinition,
    updatedBy: string,
    timestamp: string
  ): any {
    return {
      id: subsystem.id,
      indicator_id: indicatorId,
      name: subsystem.name,
      description: subsystem.description,
      weight: subsystem.weight,
      maturity_framework: JSON.stringify(subsystem.maturityFramework),
      display_order: subsystem.displayOrder,
      is_active: subsystem.isActive ? 1 : 0,
      created_by: updatedBy,
      updated_by: updatedBy,
      created_at: timestamp,
      updated_at: timestamp
    };
  }
}