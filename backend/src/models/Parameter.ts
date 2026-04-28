// backend/src/models/Parameter.ts
import { getDB, getAsync, allAsync, runAsync } from './db';
import { ParameterDefinition } from '../types/config';
import crypto from 'crypto';

// Helper function to generate UUID
function generateUUID(): string {
  return crypto.randomUUID();
}

export class Parameter {
  /**
   * Get parameter by ID
   */
  static async getById(id: string): Promise<ParameterDefinition | null> {
    try {
      const db = getDB();
      // FIXED: Changed ? to $1
      const row = await getAsync<any>(db, 'SELECT * FROM parameters WHERE id = $1', [id]);
      
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
      // FIXED: Changed ? to $1 and generic type
      const rows = await allAsync<any>(
        db, 
        'SELECT * FROM parameters WHERE indicator_id = $1 ORDER BY display_order', 
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
      
      // Generate ID if not provided - use UUID
      const id = parameter.id || generateUUID();
      
      // FIXED: Changed ? to $1, $2, etc. and boolean to true/false
      await runAsync(
        db,
        `INSERT INTO parameters (
          id, indicator_id, code, label, description, type,
          required, options, default_value, validation, ui_settings,
          display_order, is_active, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          id,
          parameter.indicatorId,
          parameter.code,
          parameter.label,
          parameter.description || null,
          parameter.type,
          parameter.required,
          JSON.stringify(parameter.options || []),
          parameter.defaultValue,
          JSON.stringify(parameter.validation || {}),
          JSON.stringify(parameter.uiSettings || {}),
          parameter.displayOrder || 0,
          parameter.isActive !== false,
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
      let paramCounter = 1;
      
      const addField = (field: string, value: any) => {
        fields.push(`${field} = $${paramCounter}`);
        values.push(value);
        paramCounter++;
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
        addField('required', updates.required);
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
        addField('is_active', updates.isActive);
      }
      
      // Add WHERE clause value
      values.push(id);
      
      await runAsync(
        db,
        `UPDATE parameters SET ${fields.join(', ')} WHERE id = $${paramCounter}`,
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
      
      // FIXED: Changed ? to $1
      await runAsync(
        db,
        'UPDATE parameters SET is_active = false WHERE id = $1',
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
      
      // FIXED: Changed ? to $1
      await runAsync(
        db,
        'DELETE FROM parameters WHERE id = $1',
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
    // FIXED: Need to use client transaction for PostgreSQL
    const db = getDB();
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      for (let i = 0; i < parameterIds.length; i++) {
        // FIXED: Changed ? to $1, $2, $3
        await client.query(
          'UPDATE parameters SET display_order = $1 WHERE id = $2 AND indicator_id = $3',
          [i, parameterIds[i], indicatorId]
        );
      }
      
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error reordering parameters:', error);
      throw error;
    } finally {
      client.release();
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
      let whereClause = '';
      const values: any[] = [];
      let paramCounter = 1;
      
      if (indicatorId) {
        whereClause = `WHERE indicator_id = $${paramCounter}`;
        values.push(indicatorId);
        paramCounter++;
      }
      
      // Total count
      const totalResult = await getAsync<{ count: number }>(
        db,
        `SELECT COUNT(*) as count FROM parameters ${whereClause}`,
        values
      );
      
      // Active count
      // FIXED: Changed is_active = 1 to true
      const activeValues = indicatorId ? [indicatorId] : [];
      const activeResult = await getAsync<{ count: number }>(
        db,
        `SELECT COUNT(*) as count FROM parameters WHERE is_active = true ${indicatorId ? `AND indicator_id = $${activeValues.length}` : ''}`,
        activeValues
      );
      
      // Count by type
      try {
        const typeValues = indicatorId ? [indicatorId] : [];
        const typeResult = await allAsync<any>(
          db,
          `SELECT type, COUNT(*) as count FROM parameters WHERE is_active = true ${indicatorId ? `AND indicator_id = $${typeValues.length}` : ''} GROUP BY type`,
          typeValues
        );
        
        const byType: Record<string, number> = {};
        
        // Safe iteration with array check
        if (typeResult && Array.isArray(typeResult)) {
          typeResult.forEach(row => {
            if (row && row.type) {
              byType[row.type] = Number(row.count) || 0;
            }
          });
        }
        
        return {
          total: Number(totalResult?.count) || 0,
          byType,
          active: Number(activeResult?.count) || 0,
          inactive: (Number(totalResult?.count) || 0) - (Number(activeResult?.count) || 0)
        };
      } catch (error) {
        console.error('Error getting parameter statistics:', error);
        return {
          total: Number(totalResult?.count) || 0,
          byType: {},
          active: Number(activeResult?.count) || 0,
          inactive: (Number(totalResult?.count) || 0) - (Number(activeResult?.count) || 0)
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
    // FIXED: Convert boolean values properly
    return {
      id: row.id,
      code: row.code,
      label: row.label,
      description: row.description,
      type: row.type as any,
      required: row.required === true,
      defaultValue: row.default_value,
      options,
      validation,
      uiSettings,
      displayOrder: row.display_order || 0,
      isActive: row.is_active === true,
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
    const db = getDB();
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      const createdIds: string[] = [];
      
      for (const parameter of parameters) {
        const id = parameter.id || generateUUID();
        
        await client.query(
          `INSERT INTO parameters (
            id, indicator_id, code, label, description, type,
            required, options, default_value, validation, ui_settings,
            display_order, is_active, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            id,
            parameter.indicatorId,
            parameter.code,
            parameter.label,
            parameter.description || null,
            parameter.type,
            parameter.required,
            JSON.stringify(parameter.options || []),
            parameter.defaultValue,
            JSON.stringify(parameter.validation || {}),
            JSON.stringify(parameter.uiSettings || {}),
            parameter.displayOrder || 0,
            parameter.isActive !== false,
            JSON.stringify(parameter.metadata || {})
          ]
        );
        
        createdIds.push(id);
      }
      
      await client.query('COMMIT');
      return createdIds;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error batch creating parameters:', error);
      throw error;
    } finally {
      client.release();
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