import { getDB, getAsync, allAsync, runAsync } from './db';
import { ParameterDefinition } from '../types/config';

export class Parameter {
  /**
   * Get parameter by ID
   */
  static async getById(id: string): Promise<ParameterDefinition | null> {
    try {
      const db = getDB();
      const row = await getAsync<any>(db, 'SELECT * FROM parameters WHERE id = ?', [id]);
      
      if (!row) return null;
      
      return this.mapRowToParameter(row);
    } catch (error) {
      console.error('Error getting parameter by ID:', error);
      throw error;
    }
  }

  /**
   * Get parameters by indicator ID
   */
  static async getByIndicatorId(indicatorId: string): Promise<ParameterDefinition[]> {
    try {
      const db = getDB();
      const rows = await allAsync<any[]>(
        db, 
        'SELECT * FROM parameters WHERE indicator_id = ? ORDER BY display_order', 
        [indicatorId]
      );
      
      return rows.map(row => this.mapRowToParameter(row));
    } catch (error) {
      console.error('Error getting parameters by indicator ID:', error);
      throw error;
    }
  }

  /**
   * Create new parameter
   */
  static async create(
    parameter: ParameterDefinition & {
      indicatorId: string; // Add indicatorId separately since it's not in ParameterDefinition
    }
  ): Promise<string> {
    try {
      const db = getDB();
      
      // Generate ID if not provided
      const id = parameter.id || `param_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await runAsync(
        db,
        `INSERT INTO parameters (
          id, indicator_id, code, label, description, type,
          required, options, default_value, validation, ui_settings,
          display_order, is_active, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          parameter.indicatorId,
          parameter.code,
          parameter.label,
          parameter.description || null,
          parameter.type,
          parameter.required ? 1 : 0,
          JSON.stringify(parameter.options || []),
          parameter.defaultValue,
          JSON.stringify(parameter.validation || {}),
          JSON.stringify(parameter.uiSettings || {}),
          parameter.displayOrder || 0,
          parameter.isActive !== false ? 1 : 0,
          JSON.stringify(parameter.metadata || {})
        ]
      );
      
      return id;
    } catch (error) {
      console.error('Error creating parameter:', error);
      throw error;
    }
  }

  /**
   * Update parameter
   */
  static async update(
    id: string,
    updates: Partial<ParameterDefinition>
  ): Promise<boolean> {
    try {
      const db = getDB();
      
      // Get current parameter
      const current = await this.getById(id);
      if (!current) {
        throw new Error('Parameter not found');
      }
      
      // Build update query
      const fields: string[] = [];
      const values: any[] = [];
      
      const addField = (field: string, value: any) => {
        fields.push(`${field} = ?`);
        values.push(value);
      };
      
      if (updates.code !== undefined) {
        addField('code', updates.code);
      }
      if (updates.label !== undefined) {
        addField('label', updates.label);
      }
      if (updates.description !== undefined) {
        addField('description', updates.description);
      }
      if (updates.type !== undefined) {
        addField('type', updates.type);
      }
      if (updates.required !== undefined) {
        addField('required', updates.required ? 1 : 0);
      }
      if (updates.defaultValue !== undefined) {
        addField('default_value', updates.defaultValue);
      }
      if (updates.displayOrder !== undefined) {
        addField('display_order', updates.displayOrder);
      }
      if (updates.options !== undefined) {
        addField('options', JSON.stringify(updates.options || []));
      }
      if (updates.validation !== undefined) {
        addField('validation', JSON.stringify(updates.validation || {}));
      }
      if (updates.uiSettings !== undefined) {
        addField('ui_settings', JSON.stringify(updates.uiSettings || {}));
      }
      if (updates.metadata !== undefined) {
        addField('metadata', JSON.stringify(updates.metadata || {}));
      }
      if (updates.isActive !== undefined) {
        addField('is_active', updates.isActive ? 1 : 0);
      }
      
      // Add WHERE clause value
      values.push(id);
      
      await runAsync(
        db,
        `UPDATE parameters SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
      
      // Verify the update was successful
      const updated = await this.getById(id);
      return updated !== null;
    } catch (error) {
      console.error('Error updating parameter:', error);
      throw error;
    }
  }

  /**
   * Delete parameter (soft delete)
   */
  static async delete(id: string): Promise<boolean> {
    try {
      const db = getDB();
      
      await runAsync(
        db,
        'UPDATE parameters SET is_active = 0 WHERE id = ?',
        [id]
      );
      
      // Verify the deletion by checking if the parameter is now inactive
      const parameter = await this.getById(id);
      return parameter !== null && !parameter.isActive;
    } catch (error) {
      console.error('Error deleting parameter:', error);
      throw error;
    }
  }

  /**
   * Hard delete parameter
   */
  static async hardDelete(id: string): Promise<boolean> {
    try {
      const db = getDB();
      
      await runAsync(
        db,
        'DELETE FROM parameters WHERE id = ?',
        [id]
      );
      
      // Verify deletion by checking if parameter no longer exists
      const parameter = await this.getById(id);
      return parameter === null;
    } catch (error) {
      console.error('Error hard deleting parameter:', error);
      throw error;
    }
  }

  /**
   * Reorder parameters
   */
  static async reorder(
    indicatorId: string,
    parameterIds: string[]
  ): Promise<boolean> {
    try {
      const db = getDB();
      
      await runAsync(db, 'BEGIN TRANSACTION');
      
      try {
        for (let i = 0; i < parameterIds.length; i++) {
          await runAsync(
            db,
            'UPDATE parameters SET display_order = ? WHERE id = ? AND indicator_id = ?',
            [i, parameterIds[i], indicatorId]
          );
        }
        
        await runAsync(db, 'COMMIT');
        return true;
      } catch (error) {
        await runAsync(db, 'ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error reordering parameters:', error);
      throw error;
    }
  }

  /**
   * Get parameter statistics
   */
  static async getStatistics(indicatorId?: string): Promise<{
    total: number;
    byType: Record<string, number>;
    active: number;
    inactive: number;
  }> {
    try {
      const db = getDB();
      
      // Build WHERE clause
      const whereClause = indicatorId ? 'WHERE indicator_id = ?' : '';
      const values = indicatorId ? [indicatorId] : [];
      
      // Total count
      const totalResult = await getAsync<{ count: number }>(
        db,
        `SELECT COUNT(*) as count FROM parameters ${whereClause}`,
        values
      );
      
      // Active count
      const activeResult = await getAsync<{ count: number }>(
        db,
        `SELECT COUNT(*) as count FROM parameters WHERE is_active = 1 ${indicatorId ? 'AND indicator_id = ?' : ''}`,
        values
      );
      
      // Count by type
      try {
        const typeResult = await allAsync<any[]>(
          db,
          `SELECT type, COUNT(*) as count FROM parameters WHERE is_active = 1 ${indicatorId ? 'AND indicator_id = ?' : ''} GROUP BY type`,
          values
        );
        
        const byType: Record<string, number> = {};
        
        // Safe iteration with array check
        if (typeResult && Array.isArray(typeResult)) {
          typeResult.forEach(row => {
            if (row && row.type) {
              byType[row.type] = row.count || 0;
            }
          });
        }
        
        return {
          total: totalResult?.count || 0,
          byType,
          active: activeResult?.count || 0,
          inactive: (totalResult?.count || 0) - (activeResult?.count || 0)
        };
      } catch (error) {
        console.error('Error getting parameter statistics:', error);
        return {
          total: totalResult?.count || 0,
          byType: {},
          active: activeResult?.count || 0,
          inactive: (totalResult?.count || 0) - (activeResult?.count || 0)
        };
      }
    } catch (error) {
      console.error('Error in getStatistics:', error);
      return {
        total: 0,
        byType: {},
        active: 0,
        inactive: 0
      };
    }
  }

  /**
   * Map database row to ParameterDefinition
   */
  private static mapRowToParameter(row: any): ParameterDefinition {
    // Parse JSON fields from database
    let options = [];
    try {
      options = row.options ? JSON.parse(row.options) : [];
    } catch (e) {
      console.warn('Error parsing options for parameter:', row.id);
    }
    
    let validation = {};
    try {
      validation = row.validation ? JSON.parse(row.validation) : {};
    } catch (e) {
      console.warn('Error parsing validation for parameter:', row.id);
    }
    
    let uiSettings = {};
    try {
      uiSettings = row.ui_settings ? JSON.parse(row.ui_settings) : {};
    } catch (e) {
      console.warn('Error parsing ui_settings for parameter:', row.id);
    }
    
    let metadata = {};
    try {
      metadata = row.metadata ? JSON.parse(row.metadata) : {};
    } catch (e) {
      console.warn('Error parsing metadata for parameter:', row.id);
    }
    
    // Convert database snake_case to TypeScript camelCase
    return {
      id: row.id,
      code: row.code,
      label: row.label,
      description: row.description,
      type: row.type as any,
      required: row.required === 1,
      defaultValue: row.default_value,
      options,
      validation,
      uiSettings,
      displayOrder: row.display_order || 0,
      isActive: row.is_active === 1,
      metadata,
      scoringRuleIds: [],
      dependencies: []
    };
  }

  /**
   * Batch create parameters
   */
  static async batchCreate(
    parameters: (ParameterDefinition & { indicatorId: string })[]
  ): Promise<string[]> {
    try {
      const db = getDB();
      
      await runAsync(db, 'BEGIN TRANSACTION');
      
      try {
        const createdIds: string[] = [];
        
        for (const parameter of parameters) {
          const id = parameter.id || `param_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          await runAsync(
            db,
            `INSERT INTO parameters (
              id, indicator_id, code, label, description, type,
              required, options, default_value, validation, ui_settings,
              display_order, is_active, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              parameter.indicatorId,
              parameter.code,
              parameter.label,
              parameter.description || null,
              parameter.type,
              parameter.required ? 1 : 0,
              JSON.stringify(parameter.options || []),
              parameter.defaultValue,
              JSON.stringify(parameter.validation || {}),
              JSON.stringify(parameter.uiSettings || {}),
              parameter.displayOrder || 0,
              parameter.isActive !== false ? 1 : 0,
              JSON.stringify(parameter.metadata || {})
            ]
          );
          
          createdIds.push(id);
        }
        
        await runAsync(db, 'COMMIT');
        return createdIds;
      } catch (error) {
        await runAsync(db, 'ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error batch creating parameters:', error);
      throw error;
    }
  }

  /**
   * Batch update parameters
   */
  static async batchUpdate(
    updates: Array<{ id: string; updates: Partial<ParameterDefinition> }>
  ): Promise<boolean[]> {
    try {
      const results: boolean[] = [];
      
      for (const { id, updates: parameterUpdates } of updates) {
        try {
          const result = await this.update(id, parameterUpdates);
          results.push(result);
        } catch (error) {
          console.error(`Error updating parameter ${id}:`, error);
          results.push(false);
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error batch updating parameters:', error);
      throw error;
    }
  }
}