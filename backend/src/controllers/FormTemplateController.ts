
//backend/src/controllers/FormTemplateController.ts
import { Request, Response } from 'express';
import { FormTemplate } from '../models/FormTemplate';
import { ConfigValidator } from '../utils/ConfigValidator';
import { FormGenerator } from '../utils/FormGenerator';
import { TemplateType } from '../types/config'; // Added import

export class FormTemplateController {
  
  // Get all form templates
  static async getAllTemplates(req: Request, res: Response): Promise<void> {
    try {
      const { category, activeOnly = 'false', page = 1, limit = 20 } = req.query;
      
      const templates = await FormTemplate.getAll({
        category: category as string,
        activeOnly: activeOnly === 'true',
        page: Number(page),
        limit: Number(limit)
      });
      
      res.json({
        success: true,
        data: templates.data,
        pagination: templates.pagination
      });
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch templates',
      });
    }
  }

  // Get template by ID
  static async getTemplateById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const template = await FormTemplate.getById(id);
      
      if (!template) {
        res.status(404).json({
          success: false,
          error: 'Template not found',
        });
        return;
      }
      
      res.json({
        success: true,
        data: template,
      });
    } catch (error: any) {
      console.error('Error fetching template:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch template',
      });
    }
  }

  // Create new template
  static async createTemplate(req: Request, res: Response): Promise<void> {
    try {
      const templateData = req.body;
      const userId = (req as any).user?.id || 'system';
      
      // Validate template
      const validation = ConfigValidator.validateTemplate(templateData);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          errors: validation.errors,
          warnings: validation.warnings,
        });
        return;
      }
      
      // Create template
      const id = await FormTemplate.create({
        ...templateData,
        createdBy: userId, // Changed from created_by to createdBy
      });
      
      // Get the created template
      const template = await FormTemplate.getById(id);
      
      res.status(201).json({
        success: true,
        data: template,
        message: 'Template created successfully',
      });
    } catch (error: any) {
      console.error('Error creating template:', error);
      
      if (error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: error.message || 'Failed to create template',
        });
      }
    }
  }

  // Update template
  static async updateTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;
      const userId = (req as any).user?.id || 'system';
      
      // Get current template
      const currentTemplate = await FormTemplate.getById(id);
      if (!currentTemplate) {
        res.status(404).json({
          success: false,
          error: 'Template not found',
        });
        return;
      }
      
      // Validate updates
      const updatedTemplate = { ...currentTemplate, ...updates };
      const validation = ConfigValidator.validateTemplate(updatedTemplate);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          errors: validation.errors,
          warnings: validation.warnings,
        });
        return;
      }
      
      // Update template
      const success = await FormTemplate.update(id, updates, userId);
      
      if (!success) {
        throw new Error('Failed to update template');
      }
      
      // Get the updated template
      const template = await FormTemplate.getById(id);
      
      res.json({
        success: true,
        data: template,
        message: 'Template updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating template:', error);
      
      if (error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: error.message || 'Failed to update template',
        });
      }
    }
  }

  // Delete template (soft delete)
  static async deleteTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { hardDelete = 'false' } = req.query;
      const userId = (req as any).user?.id || 'system';
      
      let success: boolean;
      
      if (hardDelete === 'true') {
        success = await FormTemplate.hardDelete(id);
      } else {
        success = await FormTemplate.delete(id, userId);
      }
      
      if (!success) {
        res.status(404).json({
          success: false,
          error: 'Template not found',
        });
        return;
      }
      
      res.json({
        success: true,
        message: hardDelete === 'true' 
          ? 'Template permanently deleted' 
          : 'Template deactivated',
      });
    } catch (error: any) {
      console.error('Error deleting template:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete template',
      });
    }
  }

  // Duplicate template
  static async duplicateTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { newName } = req.body;
      const userId = (req as any).user?.id || 'system';
      
      const template = await FormTemplate.getById(id);
      if (!template) {
        res.status(404).json({
          success: false,
          error: 'Template not found',
        });
        return;
      }
      
      // Create duplicate
      const duplicateId = await FormTemplate.duplicate(id, newName, userId);
      const duplicate = await FormTemplate.getById(duplicateId);
      
      res.status(201).json({
        success: true,
        data: duplicate,
        message: 'Template duplicated successfully',
      });
    } catch (error: any) {
      console.error('Error duplicating template:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to duplicate template',
      });
    }
  }

  // Get template preview
  static async getTemplatePreview(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { includeInactive = 'false' } = req.query;
      
      const form = await FormGenerator.generateForm(id, includeInactive === 'true');
      
      res.json({
        success: true,
        data: form,
      });
    } catch (error: any) {
      console.error('Error generating preview:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate preview',
      });
    }
  }

  // Publish template
  static async publishTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id || 'system';
      
      const success = await FormTemplate.publish(id, userId);
      
      if (!success) {
        res.status(404).json({
          success: false,
          error: 'Template not found',
        });
        return;
      }
      
      const template = await FormTemplate.getById(id);
      
      res.json({
        success: true,
        data: template,
        message: 'Template published successfully',
      });
    } catch (error: any) {
      console.error('Error publishing template:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to publish template',
      });
    }
  }

  // Unpublish template
  static async unpublishTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id || 'system';
      
      const success = await FormTemplate.unpublish(id, userId);
      
      if (!success) {
        res.status(404).json({
          success: false,
          error: 'Template not found',
        });
        return;
      }
      
      const template = await FormTemplate.getById(id);
      
      res.json({
        success: true,
        data: template,
        message: 'Template unpublished successfully',
      });
    } catch (error: any) {
      console.error('Error unpublishing template:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to unpublish template',
      });
    }
  }

  // Get active templates
  static async getActiveTemplates(req: Request, res: Response): Promise<void> {
    try {
      const { category } = req.query;
      
      // Fix: Pass category as TemplateType or undefined
      const templates = await FormTemplate.getActiveTemplates(category as TemplateType | undefined);
      
      res.json({
        success: true,
        data: templates,
      });
    } catch (error: any) {
      console.error('Error fetching active templates:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch active templates',
      });
    }
  }

  // Get template versions
  static async getTemplateVersions(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const versions = await FormTemplate.getVersions(id);
      
      res.json({
        success: true,
        data: versions,
      });
    } catch (error: any) {
      console.error('Error fetching template versions:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch template versions',
      });
    }
  }

  // Restore to specific version
  static async restoreVersion(req: Request, res: Response): Promise<void> {
    try {
      const { id, versionId } = req.params;
      const userId = (req as any).user?.id || 'system';
      
      const success = await FormTemplate.restoreVersion(id, versionId, userId);
      
      if (!success) {
        throw new Error('Failed to restore version');
      }
      
      const template = await FormTemplate.getById(id);
      
      res.json({
        success: true,
        data: template,
        message: `Template restored to version ${versionId}`,
      });
    } catch (error: any) {
      console.error('Error restoring version:', error);
      
      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: error.message || 'Failed to restore version',
        });
      }
    }
  }

  // Test form validation
  static async testValidation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { testData } = req.body;
      
      const template = await FormTemplate.getById(id);
      if (!template) {
        res.status(404).json({
          success: false,
          error: 'Template not found',
        });
        return;
      }
      
      const validation = ConfigValidator.validateFormSubmission(template, testData);
      
      res.json({
        success: true,
        data: validation,
      });
    } catch (error: any) {
      console.error('Error testing validation:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to test validation',
      });
    }
  }

  // Calculate score for form data
  static async calculateScore(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { formData } = req.body;
      
      const result = await FormGenerator.calculateScore(formData, id);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Error calculating score:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to calculate score',
      });
    }
  }
}