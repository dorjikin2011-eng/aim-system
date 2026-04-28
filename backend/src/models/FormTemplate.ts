//backend/src/models/FormTemplate.ts
import { getDB, getAsync, allAsync, runAsync } from './db';
import { 
  FormTemplate as FormTemplateType, 
  FormSection, 
  FormField,
  TemplateType,
  CreateFormTemplateInput
} from '../types/config';

export class FormTemplate {
  
  /**
   * Ensure form_templates table exists in PostgreSQL
   */
  static async ensureTable(): Promise<void> {
    const db = getDB();
    
    // Create form_templates table for PostgreSQL
    await runAsync(
      db,
      `CREATE TABLE IF NOT EXISTS form_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        template_type TEXT DEFAULT 'assessment',
        indicator_ids JSONB DEFAULT '[]'::jsonb,
        sections JSONB DEFAULT '[]'::jsonb,
        validation_rules JSONB DEFAULT '{}'::jsonb,
        ui_config JSONB DEFAULT '{}'::jsonb,
        version TEXT DEFAULT '1.0.0',
        is_active BOOLEAN DEFAULT TRUE,
        category TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT,
        updated_by TEXT
      )`
    );
    
    // Create template_versions table for PostgreSQL
    await runAsync(
      db,
      `CREATE TABLE IF NOT EXISTS template_versions (
        id SERIAL PRIMARY KEY,
        template_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        template_data JSONB NOT NULL,
        description TEXT,
        created_by TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (template_id) REFERENCES form_templates(id) ON DELETE CASCADE
      )`
    );
  }

  /**
   * Get all form templates (without pagination - for simple queries)
   */
  static async getAll(params?: {
  category?: string;
  activeOnly?: boolean;
}): Promise<FormTemplateType[]> {
  try {
    const db = getDB();
    const { category, activeOnly = false } = params || {};
    
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (category) {
      conditions.push(`template_type = $${paramIndex++}`);
      values.push(category);
    }
    
    if (activeOnly) {
      conditions.push(`is_active = $${paramIndex++}`);
      values.push(true);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const rows = await allAsync<any>(
      db,
      `SELECT * FROM form_templates ${whereClause} ORDER BY created_at DESC`,
      values
    );
    
    return rows.map(row => this.mapRowToTemplate(row));  // ← Use the parser
  } catch (error) {
    console.error('Error getting all templates:', error);
    return [];
  }
}
  /**
   * Get form templates with pagination (for admin views)
   */
  static async getAllWithPagination(params?: {
    category?: string;
    activeOnly?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{
    data: FormTemplateType[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    try {
      const db = getDB();
      await this.ensureTable();
      
      const {
        category,
        activeOnly = false,
        page = 1,
        limit = 20
      } = params || {};
      
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      if (category) {
        conditions.push(`template_type = $${paramIndex++}`);
        values.push(category);
      }
      
      if (activeOnly) {
        conditions.push(`is_active = $${paramIndex++}`);
        values.push(true);
      }
      
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      
      // Get total count
      const countResult = await getAsync<{ count: string }>(
        db,
        `SELECT COUNT(*) as count FROM form_templates ${whereClause}`,
        values
      );
      
      const total = parseInt(countResult?.count || '0', 10);
      
      // Get paginated results
      const offset = (page - 1) * limit;
      values.push(limit, offset);
      
      const rows = await allAsync<any>(
        db,
        `SELECT * FROM form_templates ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        values
      );
      
      const data = rows.map(row => this.mapRowToTemplate(row));
      
      return {
        data,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting templates with pagination:', error);
      return {
        data: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0
        }
      };
    }
  }

  /**
   * Get template by ID
   */
  static async getById(id: string): Promise<FormTemplateType | null> {
    try {
      const db = getDB();
      await this.ensureTable();
      
      const result = await getAsync<any>(
        db,
        'SELECT * FROM form_templates WHERE id = $1',
        [id]
      );
      
      if (!result) return null;
      
      return this.mapRowToTemplate(result);
    } catch (error) {
      console.error('Error getting template by ID:', error);
      return null;
    }
  }

  /**
   * Get template by name
   */
  static async getByName(name: string): Promise<FormTemplateType | null> {
    try {
      const db = getDB();
      await this.ensureTable();
      
      const result = await getAsync<any>(
        db,
        'SELECT * FROM form_templates WHERE name = $1',
        [name]
      );
      
      if (!result) return null;
      
      return this.mapRowToTemplate(result);
    } catch (error) {
      console.error('Error getting template by name:', error);
      return null;
    }
  }

  static async create(template: CreateFormTemplateInput): Promise<string> {
  try {
    const db = getDB();
    await this.ensureTable();
    
    const id = template.id || this.generateId();
    
    // FORCE set template_type - never allow null
    const templateType = template.templateType || template.template_type || 'assessment';
    
    const dbTemplate = {
      id,
      name: template.name,
      description: template.description || '',
      template_type: templateType,  // ← Always has a value
      indicator_ids: JSON.stringify(template.indicatorIds || []),
      sections: JSON.stringify(template.sections || []),
      validation_rules: JSON.stringify(template.validationRules || {}),
      ui_config: JSON.stringify(template.uiConfig || {}),
      version: template.version || '1.0.0',
      is_active: template.isActive !== undefined ? template.isActive : true,
      created_by: template.createdBy || 'admin',
      updated_by: template.createdBy || 'admin'
    };
    
    await runAsync(
      db,
      `INSERT INTO form_templates (
        id, name, description, template_type, indicator_ids, 
        sections, validation_rules, ui_config, version, 
        is_active, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        dbTemplate.id,
        dbTemplate.name,
        dbTemplate.description,
        dbTemplate.template_type,  // ← This should never be null now
        dbTemplate.indicator_ids,
        dbTemplate.sections,
        dbTemplate.validation_rules,
        dbTemplate.ui_config,
        dbTemplate.version,
        dbTemplate.is_active,
        dbTemplate.created_by,
        dbTemplate.updated_by
      ]
    );
    
    await this.createVersion(id, dbTemplate, template.createdBy || 'admin');
    
    return id;
  } catch (error) {
    console.error('Error creating template:', error);
    throw error;
  }
}

  /**
   * Update template
   */
  static async update(id: string, updates: Partial<FormTemplateType>, updatedBy: string): Promise<boolean> {
    try {
      const db = getDB();
      await this.ensureTable();
      
      const current = await this.getById(id);
      if (!current) {
        throw new Error('Template not found');
      }
      
      // Check name uniqueness
      if (updates.name && updates.name !== current.name) {
        const existing = await this.getByName(updates.name);
        if (existing && existing.id !== id) {
          throw new Error(`Template with name "${updates.name}" already exists`);
        }
      }
      
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      if (updates.name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        values.push(updates.name);
      }
      if (updates.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        values.push(updates.description);
      }
      if (updates.templateType !== undefined) {
        updateFields.push(`template_type = $${paramIndex++}`);
        values.push(updates.templateType);
      }
      if (updates.indicatorIds !== undefined) {
        updateFields.push(`indicator_ids = $${paramIndex++}`);
        values.push(JSON.stringify(updates.indicatorIds));
      }
      if (updates.sections !== undefined) {
        updateFields.push(`sections = $${paramIndex++}`);
        values.push(JSON.stringify(updates.sections));
      }
      if (updates.validationRules !== undefined) {
        updateFields.push(`validation_rules = $${paramIndex++}`);
        values.push(JSON.stringify(updates.validationRules));
      }
      if (updates.uiConfig !== undefined) {
        updateFields.push(`ui_config = $${paramIndex++}`);
        values.push(JSON.stringify(updates.uiConfig));
      }
      if (updates.version !== undefined) {
        updateFields.push(`version = $${paramIndex++}`);
        values.push(updates.version);
      }
      if (updates.isActive !== undefined) {
        updateFields.push(`is_active = $${paramIndex++}`);
        values.push(updates.isActive);
      }
      
      updateFields.push(`updated_by = $${paramIndex++}`);
      values.push(updatedBy);
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      
      values.push(id);
      
      const query = `UPDATE form_templates SET ${updateFields.join(', ')} WHERE id = $${paramIndex++}`;
      
      await runAsync(db, query, values);
      
      // Create version snapshot
      const updatedTemplate = await this.getById(id);
      if (updatedTemplate) {
        await this.createVersion(id, this.prepareTemplateForDb(updatedTemplate), updatedBy);
      }
      
      return true;
    } catch (error) {
      console.error('Error updating template:', error);
      throw error;
    }
  }

  /**
   * Soft delete template
   */
  static async delete(id: string, deletedBy: string): Promise<boolean> {
    try {
      const db = getDB();
      await this.ensureTable();
      
      await runAsync(
        db,
        'UPDATE form_templates SET is_active = false, updated_by = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [deletedBy, id]
      );
      
      const template = await this.getById(id);
      return template !== null && !template.isActive;
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  }

  /**
   * Hard delete template
   */
  static async hardDelete(id: string): Promise<boolean> {
    try {
      const db = getDB();
      await this.ensureTable();
      
      // Delete versions first
      await runAsync(db, 'DELETE FROM template_versions WHERE template_id = $1', [id]);
      
      // Delete template
      await runAsync(db, 'DELETE FROM form_templates WHERE id = $1', [id]);
      
      const template = await this.getById(id);
      return template === null;
    } catch (error) {
      console.error('Error hard deleting template:', error);
      throw error;
    }
  }

  /**
   * Duplicate template
   */
  static async duplicate(id: string, newName: string, createdBy: string): Promise<string> {
    try {
      const original = await this.getById(id);
      if (!original) {
        throw new Error('Original template not found');
      }
      
      const { id: originalId, createdAt, updatedAt, createdBy: originalCreatedBy, updatedBy: originalUpdatedBy, ...templateData } = original;
      
      const newTemplate: CreateFormTemplateInput = {
        ...templateData,
        name: newName,
        isActive: false,
        createdBy
      };
      
      return await this.create(newTemplate);
    } catch (error) {
      console.error('Error duplicating template:', error);
      throw error;
    }
  }

  /**
   * Publish template (activate and deactivate others)
   */
  static async publish(id: string, publishedBy: string): Promise<boolean> {
    try {
      const db = getDB();
      await this.ensureTable();
      
      const template = await this.getById(id);
      if (!template) {
        throw new Error('Template not found');
      }
      
      // Start transaction
      await runAsync(db, 'BEGIN');
      
      try {
        // Deactivate other templates of same type
        await runAsync(
          db,
          'UPDATE form_templates SET is_active = false, updated_by = $1, updated_at = CURRENT_TIMESTAMP WHERE template_type = $2 AND id != $3',
          [publishedBy, template.templateType, id]
        );
        
        // Activate this template
        await this.update(id, { isActive: true }, publishedBy);
        
        await runAsync(db, 'COMMIT');
        return true;
      } catch (error) {
        await runAsync(db, 'ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error publishing template:', error);
      throw error;
    }
  }

  /**
   * Unpublish template
   */
  static async unpublish(id: string, unpublishedBy: string): Promise<boolean> {
    try {
      return await this.update(id, { isActive: false }, unpublishedBy);
    } catch (error) {
      console.error('Error unpublishing template:', error);
      throw error;
    }
  }

  /**
   * Get active templates
   */
  static async getActiveTemplates(templateType?: TemplateType): Promise<FormTemplateType[]> {
    try {
      const db = getDB();
      await this.ensureTable();
      
      let query = 'SELECT * FROM form_templates WHERE is_active = true';
      const values: any[] = [];
      
      if (templateType) {
        query += ' AND template_type = $1';
        values.push(templateType);
      }
      
      query += ' ORDER BY created_at DESC';
      
      const rows = await allAsync<any>(db, query, values);
      return rows.map(row => this.mapRowToTemplate(row));
    } catch (error) {
      console.error('Error getting active templates:', error);
      return [];
    }
  }

  /**
   * Get template versions
   */
  static async getVersions(id: string): Promise<any[]> {
    try {
      const db = getDB();
      await this.ensureTable();
      
      const rows = await allAsync<any>(
        db,
        'SELECT * FROM template_versions WHERE template_id = $1 ORDER BY created_at DESC',
        [id]
      );
      
      return rows.map(row => ({
        id: row.id,
        templateId: row.template_id,
        version: row.version,
        templateData: row.template_data,
        createdBy: row.created_by,
        createdAt: row.created_at,
        description: row.description
      }));
    } catch (error) {
      console.error('Error getting template versions:', error);
      return [];
    }
  }

  /**
   * Restore template to specific version
   */
  static async restoreVersion(id: string, versionId: string, restoredBy: string): Promise<boolean> {
    try {
      const db = getDB();
      await this.ensureTable();
      
      const version = await getAsync<any>(
        db,
        'SELECT * FROM template_versions WHERE template_id = $1 AND id = $2',
        [id, versionId]
      );
      
      if (!version) {
        throw new Error('Version not found');
      }
      
      const templateData = version.template_data;
      
      const success = await this.update(id, templateData, restoredBy);
      
      await this.createVersion(id, templateData, restoredBy, `Restored to version ${versionId}`);
      
      return success;
    } catch (error) {
      console.error('Error restoring version:', error);
      throw error;
    }
  }

  /**
   * Validate template
   */
  static async validateTemplate(template: Partial<FormTemplateType>): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!template.name?.trim()) {
      errors.push('Template name is required');
    } else if (template.name.length < 2) {
      errors.push('Template name must be at least 2 characters');
    }

    if (!template.templateType) {
      errors.push('Template type is required');
    }

    if (template.sections && template.sections.length === 0) {
      errors.push('Template must have at least one section');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Create a version snapshot
   */
  private static async createVersion(
    templateId: string,
    templateData: any,
    createdBy: string,
    description?: string
  ): Promise<void> {
    try {
      const db = getDB();
      
      const countResult = await getAsync<{ count: string }>(
        db,
        'SELECT COUNT(*) as count FROM template_versions WHERE template_id = $1',
        [templateId]
      );
      
      const versionNumber = (parseInt(countResult?.count || '0', 10)) + 1;
      
      await runAsync(
        db,
        `INSERT INTO template_versions (template_id, version, template_data, description, created_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [templateId, versionNumber, JSON.stringify(templateData), description || `Version ${versionNumber}`, createdBy]
      );
    } catch (error) {
      console.error('Error creating template version:', error);
    }
  }

  /**
 * Map database row to FormTemplateType
 */
private static mapRowToTemplate(row: any): FormTemplateType {
  // Parse JSON fields - ensure they are arrays/objects
  let sections = [];
  let validationRules = {};
  let uiConfig = {};
  let indicatorIds = [];
  
  try {
    sections = row.sections ? (typeof row.sections === 'string' ? JSON.parse(row.sections) : row.sections) : [];
  } catch (e) {
    sections = [];
  }
  
  try {
    validationRules = row.validation_rules ? (typeof row.validation_rules === 'string' ? JSON.parse(row.validation_rules) : row.validation_rules) : {};
  } catch (e) {
    validationRules = {};
  }
  
  try {
    uiConfig = row.ui_config ? (typeof row.ui_config === 'string' ? JSON.parse(row.ui_config) : row.ui_config) : {};
  } catch (e) {
    uiConfig = {};
  }
  
  try {
    indicatorIds = row.indicator_ids ? (typeof row.indicator_ids === 'string' ? JSON.parse(row.indicator_ids) : row.indicator_ids) : [];
  } catch (e) {
    indicatorIds = [];
  }
  
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    templateType: row.template_type,
    indicatorIds: indicatorIds,  // ← Now guaranteed to be an array
    sections: sections,
    validationRules: validationRules,
    uiConfig: uiConfig,
    version: row.version,
    isActive: row.is_active === true || row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by
  };
}

  /**
   * Prepare template for database
   */
  private static prepareTemplateForDb(template: FormTemplateType): any {
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      template_type: template.templateType,
      indicator_ids: JSON.stringify(template.indicatorIds || []),
      sections: JSON.stringify(template.sections || []),
      validation_rules: JSON.stringify(template.validationRules || {}),
      ui_config: JSON.stringify(template.uiConfig || {}),
      version: template.version,
      is_active: template.isActive,
      created_by: template.createdBy,
      updated_by: template.updatedBy
    };
  }

  /**
   * Generate ID
   */
  private static generateId(): string {
    return `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}