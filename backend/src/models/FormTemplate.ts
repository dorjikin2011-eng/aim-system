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
   * Get all form templates with pagination
   */
  static async getAll(params?: {
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
      const {
        category,
        activeOnly = false,
        page = 1,
        limit = 20
      } = params || {};
      
      // Build WHERE clause
      const whereClauses: string[] = [];
      const values: any[] = [];
      
      if (category) {
        whereClauses.push('category = ?');
        values.push(category);
      }
      
      if (activeOnly) {
        whereClauses.push('is_active = 1');
      }
      
      const whereClause = whereClauses.length > 0 
        ? `WHERE ${whereClauses.join(' AND ')}` 
        : '';
      
      // Get total count
      const countResult = await getAsync<{ count: number }>(
        db,
        `SELECT COUNT(*) as count FROM form_templates ${whereClause}`,
        values
      );
      
      const total = countResult?.count || 0;
      
      // Get paginated results
      const offset = (page - 1) * limit;
      const rows = await allAsync<any>(
        db,
        `SELECT * FROM form_templates ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...values, limit, offset]
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
      console.error('Error getting all templates:', error);
      throw error;
    }
  }

  /**
   * Get template by ID
   */
  static async getById(id: string): Promise<FormTemplateType | null> {
    try {
      const db = getDB();
      const result = await getAsync<any>(
        db,
        'SELECT * FROM form_templates WHERE id = ?',
        [id]
      );
      
      if (!result) return null;
      
      return this.mapRowToTemplate(result);
    } catch (error) {
      console.error('Error getting template by ID:', error);
      throw error;
    }
  }

  /**
   * Get template by name
   */
  static async getByName(name: string): Promise<FormTemplateType | null> {
    try {
      const db = getDB();
      const result = await getAsync<any>(
        db,
        'SELECT * FROM form_templates WHERE name = ?',
        [name]
      );
      
      if (!result) return null;
      
      return this.mapRowToTemplate(result);
    } catch (error) {
      console.error('Error getting template by name:', error);
      throw error;
    }
  }

  /**
   * Create new template using the proper CreateFormTemplateInput type
   */
  static async create(
    template: CreateFormTemplateInput
  ): Promise<string> {
    try {
      const db = getDB();
      
      // Generate ID if not provided
      const id = template.id || this.generateId();
      
      // Prepare template for database
      const dbTemplate = this.prepareTemplateForDb({
        ...template,
        id,
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: template.createdBy,
        updatedBy: template.createdBy
      });
      
      await runAsync(
        db,
        `INSERT INTO form_templates (
          id, name, description, template_type, indicator_ids, 
          sections, validation_rules, ui_config, version, 
          is_active, created_by, updated_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          dbTemplate.id,
          dbTemplate.name,
          dbTemplate.description,
          dbTemplate.template_type,
          dbTemplate.indicator_ids,
          dbTemplate.sections,
          dbTemplate.validation_rules,
          dbTemplate.ui_config,
          dbTemplate.version,
          dbTemplate.is_active,
          template.createdBy,
          template.createdBy,
          new Date().toISOString(),
          new Date().toISOString()
        ]
      );
      
      // Create initial version
      await this.createVersion(id, dbTemplate, template.createdBy);
      
      return id;
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  }

  /**
   * Update template
   */
  static async update(
    id: string,
    updates: Partial<FormTemplateType>,
    updatedBy: string
  ): Promise<boolean> {
    try {
      const db = getDB();
      
      // Get current template
      const current = await this.getById(id);
      if (!current) {
        throw new Error('Template not found');
      }
      
      // Check if name is being changed and if it already exists
      if (updates.name && updates.name !== current.name) {
        const existingWithName = await this.getByName(updates.name);
        if (existingWithName && existingWithName.id !== id) {
          throw new Error(`Template with name "${updates.name}" already exists`);
        }
      }
      
      // Merge updates with current data
      const updatedTemplate = { ...current, ...updates, updatedBy, updatedAt: new Date().toISOString() };
      
      // Prepare for database
      const dbTemplate = this.prepareTemplateForDb(updatedTemplate);
      
      // Build update query
      const updateFields: string[] = [];
      const values: any[] = [];
      
      const addField = (field: string, value: any) => {
        updateFields.push(`${field} = ?`);
        values.push(value);
      };
      
      if (updates.name !== undefined) addField('name', dbTemplate.name);
      if (updates.description !== undefined) addField('description', dbTemplate.description);
      if (updates.templateType !== undefined) addField('template_type', dbTemplate.template_type);
      if (updates.indicatorIds !== undefined) addField('indicator_ids', dbTemplate.indicator_ids);
      if (updates.sections !== undefined) addField('sections', dbTemplate.sections);
      if (updates.validationRules !== undefined) addField('validation_rules', dbTemplate.validation_rules);
      if (updates.uiConfig !== undefined) addField('ui_config', dbTemplate.ui_config);
      if (updates.version !== undefined) addField('version', dbTemplate.version);
      if (updates.isActive !== undefined) addField('is_active', dbTemplate.is_active);
      
      // Always update updated_by and updated_at
      addField('updated_by', updatedBy);
      addField('updated_at', new Date().toISOString());
      
      // Add WHERE clause value
      values.push(id);
      
      const query = `UPDATE form_templates SET ${updateFields.join(', ')} WHERE id = ?`;
      
      await runAsync(db, query, values);
      
      // Create new version after update
      await this.createVersion(id, dbTemplate, updatedBy);
      
      // Verify the update was successful
      const updated = await this.getById(id);
      return updated !== null;
    } catch (error) {
      console.error('Error updating template:', error);
      throw error;
    }
  }

  /**
   * Delete template (soft delete)
   */
  static async delete(id: string, deletedBy: string): Promise<boolean> {
    try {
      const db = getDB();
      
      await runAsync(
        db,
        'UPDATE form_templates SET is_active = 0, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [deletedBy, id]
      );
      
      // Verify the deletion by checking if the template is now inactive
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
      
      // Delete versions first
      await runAsync(
        db,
        'DELETE FROM template_versions WHERE template_id = ?',
        [id]
      );
      
      // Delete template
      await runAsync(
        db,
        'DELETE FROM form_templates WHERE id = ?',
        [id]
      );
      
      // Verify deletion by checking if template no longer exists
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
  static async duplicate(
    originalId: string,
    newName?: string,
    createdBy: string = 'system'
  ): Promise<string> {
    try {
      const original = await this.getById(originalId);
      if (!original) {
        throw new Error('Original template not found');
      }
      
      // Remove auto-generated fields
      const { id, createdAt, updatedAt, createdBy: originalCreatedBy, updatedBy: originalUpdatedBy, ...templateData } = original;
      
      const newTemplate: CreateFormTemplateInput = {
        ...templateData,
        name: newName || `${original.name} (Copy)`,
        isActive: false, // Keep duplicate inactive by default
        createdBy
      };
      
      return await this.create(newTemplate);
    } catch (error) {
      console.error('Error duplicating template:', error);
      throw error;
    }
  }

  /**
   * Publish template (activate and deactivate others in same template type)
   */
  static async publish(id: string, publishedBy: string): Promise<boolean> {
    try {
      const db = getDB();
      
      // Get template to get its template type
      const template = await this.getById(id);
      if (!template) {
        throw new Error('Template not found');
      }
      
      // Start transaction
      await runAsync(db, 'BEGIN TRANSACTION');
      
      try {
        // Deactivate other templates in same template type
        await runAsync(
          db,
          'UPDATE form_templates SET is_active = 0 WHERE template_type = ? AND id != ?',
          [template.templateType, id]
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
      
      const query = templateType
        ? 'SELECT * FROM form_templates WHERE is_active = 1 AND template_type = ? ORDER BY created_at DESC'
        : 'SELECT * FROM form_templates WHERE is_active = 1 ORDER BY created_at DESC';
      
      const values = templateType ? [templateType] : [];
      
      const rows = await allAsync<any>(db, query, values);
      
      return rows.map(row => this.mapRowToTemplate(row));
    } catch (error) {
      console.error('Error getting active templates:', error);
      throw error;
    }
  }

  /**
   * Get templates by indicator ID
   */
  static async getByIndicatorId(indicatorId: string): Promise<FormTemplateType[]> {
    try {
      const db = getDB();
      
      const rows = await allAsync<any>(
        db,
        `SELECT * FROM form_templates 
         WHERE is_active = 1 
         AND indicator_ids LIKE ? 
         ORDER BY created_at DESC`,
        [`%${indicatorId}%`]
      );
      
      return rows.map(row => this.mapRowToTemplate(row));
    } catch (error) {
      console.error('Error getting templates by indicator ID:', error);
      throw error;
    }
  }

  /**
   * Get template versions
   */
  static async getVersions(id: string): Promise<any[]> {
    try {
      const db = getDB();
      
      const rows = await allAsync<any>(
        db,
        `SELECT * FROM template_versions 
         WHERE template_id = ? 
         ORDER BY created_at DESC`,
        [id]
      );
      
      return rows.map(row => ({
        id: row.id,
        templateId: row.template_id,
        version: row.version,
        templateData: JSON.parse(row.template_data),
        createdBy: row.created_by,
        createdAt: row.created_at,
        description: row.description
      }));
    } catch (error) {
      console.error('Error getting template versions:', error);
      throw error;
    }
  }

  /**
   * Restore to specific version
   */
  static async restoreVersion(id: string, versionId: string, restoredBy: string): Promise<boolean> {
    try {
      const db = getDB();
      
      // Get the version data
      const version = await getAsync<any>(
        db,
        'SELECT * FROM template_versions WHERE template_id = ? AND id = ?',
        [id, versionId]
      );
      
      if (!version) {
        throw new Error('Version not found');
      }
      
      // Parse template data from version
      const templateData = JSON.parse(version.template_data);
      
      // Update template with version data
      const success = await this.update(id, templateData, restoredBy);
      
      // Create a new version to record the restoration
      await this.createVersion(id, templateData, restoredBy, `Restored to version ${versionId}`);
      
      return success;
    } catch (error) {
      console.error('Error restoring version:', error);
      throw error;
    }
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
      
      // Get current version count for this template
      const countResult = await getAsync<{ count: number }>(
        db,
        'SELECT COUNT(*) as count FROM template_versions WHERE template_id = ?',
        [templateId]
      );
      
      const versionNumber = (countResult?.count || 0) + 1;
      
      await runAsync(
        db,
        `INSERT INTO template_versions (
          template_id, version, template_data, description, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          templateId,
          versionNumber,
          JSON.stringify(templateData),
          description || `Version ${versionNumber}`,
          createdBy,
          new Date().toISOString()
        ]
      );
    } catch (error) {
      console.error('Error creating template version:', error);
      throw error;
    }
  }

  /**
   * Validate template configuration
   */
  static async validateTemplate(template: Partial<FormTemplateType>): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!template.name?.trim()) {
      errors.push('Template name is required');
    } else if (template.name.length < 2) {
      errors.push('Template name must be at least 2 characters');
    }

    if (!template.templateType) {
      errors.push('Template type is required');
    }

    // Validate sections
    if (template.sections && Array.isArray(template.sections)) {
      if (template.sections.length === 0) {
        errors.push('Template must have at least one section');
      }
      
      template.sections.forEach((section, sectionIndex) => {
        if (!section.title?.trim()) {
          errors.push(`Section ${sectionIndex + 1}: Title is required`);
        }
        
        // Validate fields in section
        if (section.fields && Array.isArray(section.fields)) {
          section.fields.forEach((field, fieldIndex) => {
            if (!field.parameterCode?.trim()) {
              errors.push(`Section ${sectionIndex + 1}, Field ${fieldIndex + 1}: Parameter code is required`);
            }
            
            if (!field.label?.trim()) {
              errors.push(`Section ${sectionIndex + 1}, Field ${fieldIndex + 1}: Label is required`);
            }
            
            if (!field.type) {
              errors.push(`Section ${sectionIndex + 1}, Field ${fieldIndex + 1}: Field type is required`);
            }
          });
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Map database row to FormTemplateType
   */
  private static mapRowToTemplate(row: any): FormTemplateType {
    // Parse JSON fields from database
    const sections = row.sections ? JSON.parse(row.sections) : [];
    const validationRules = row.validation_rules ? JSON.parse(row.validation_rules) : {};
    const uiConfig = row.ui_config ? JSON.parse(row.ui_config) : {};
    const indicatorIds = row.indicator_ids ? JSON.parse(row.indicator_ids) : [];
    
    // Convert database snake_case to TypeScript camelCase
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      templateType: row.template_type as TemplateType,
      indicatorIds: indicatorIds,
      sections: sections.map((s: any) => this.mapSection(s)),
      validationRules: validationRules,
      uiConfig: uiConfig,
      version: row.version,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by
    };
  }

  /**
   * Map section from database to FormSection
   */
  private static mapSection(section: any): FormSection {
    return {
      id: section.id,
      title: section.title,
      description: section.description,
      columns: section.columns || 1,
      fields: (section.fields || []).map((f: any) => this.mapField(f)),
      displayOrder: section.display_order || 0,
      condition: section.condition
    };
  }

  /**
   * Map field from database to FormField
   */
  private static mapField(field: any): FormField {
    return {
      id: field.id,
      parameterCode: field.parameter_code,
      indicatorId: field.indicator_id,
      label: field.label,
      type: field.type,
      required: field.required || false,
      width: field.width || 100,
      displayOrder: field.display_order || 0,
      condition: field.condition,
      uiSettings: field.ui_settings || {}
    };
  }

  /**
   * Prepare template for database (camelCase to snake_case)
   */
  private static prepareTemplateForDb(template: FormTemplateType): any {
    const sections = template.sections.map(s => this.prepareSectionForDb(s));
    const indicatorIds = JSON.stringify(template.indicatorIds || []);
    const validationRules = JSON.stringify(template.validationRules || {});
    const uiConfig = JSON.stringify(template.uiConfig || {});
    
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      template_type: template.templateType,
      indicator_ids: indicatorIds,
      sections: JSON.stringify(sections),
      validation_rules: validationRules,
      ui_config: uiConfig,
      version: template.version,
      is_active: template.isActive ? 1 : 0,
      created_by: template.createdBy,
      updated_by: template.updatedBy,
      created_at: template.createdAt,
      updated_at: template.updatedAt
    };
  }

  /**
   * Prepare section for database (camelCase to snake_case)
   */
  private static prepareSectionForDb(section: FormSection): any {
    return {
      id: section.id,
      title: section.title,
      description: section.description,
      columns: section.columns,
      fields: section.fields.map(f => this.prepareFieldForDb(f)),
      display_order: section.displayOrder,
      condition: section.condition
    };
  }

  /**
   * Prepare field for database (camelCase to snake_case)
   */
  private static prepareFieldForDb(field: FormField): any {
    return {
      id: field.id,
      parameter_code: field.parameterCode,
      indicator_id: field.indicatorId,
      label: field.label,
      type: field.type,
      required: field.required,
      width: field.width,
      display_order: field.displayOrder,
      condition: field.condition,
      ui_settings: field.uiSettings
    };
  }

  /**
   * Generate ID
   */
  private static generateId(): string {
    return `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}