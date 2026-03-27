import { Router } from 'express';
import { FormTemplateController } from '../controllers/FormTemplateController';

const router = Router();

// Get all form templates
router.get('/', (req, res) => FormTemplateController.getAllTemplates(req, res));

// Get template by ID
router.get('/:id', (req, res) => FormTemplateController.getTemplateById(req, res));

// Create new template
router.post('/', (req, res) => FormTemplateController.createTemplate(req, res));

// Update template
router.put('/:id', (req, res) => FormTemplateController.updateTemplate(req, res));

// Delete template (soft delete)
router.delete('/:id', (req, res) => FormTemplateController.deleteTemplate(req, res));

// Duplicate template
router.post('/:id/duplicate', (req, res) => FormTemplateController.duplicateTemplate(req, res));

// Get template preview (rendered form structure)
router.get('/:id/preview', (req, res) => FormTemplateController.getTemplatePreview(req, res));

// Publish template (make it active)
router.put('/:id/publish', (req, res) => FormTemplateController.publishTemplate(req, res));

// Unpublish template
router.put('/:id/unpublish', (req, res) => FormTemplateController.unpublishTemplate(req, res));

// Get active templates
router.get('/active/list', (req, res) => FormTemplateController.getActiveTemplates(req, res));

// Get template versions
router.get('/:id/versions', (req, res) => FormTemplateController.getTemplateVersions(req, res));

// Restore to specific version
router.put('/:id/restore/:versionId', (req, res) => FormTemplateController.restoreVersion(req, res));

// Test form validation
router.post('/:id/test-validation', (req, res) => FormTemplateController.testValidation(req, res));

// Calculate score for form data
router.post('/:id/calculate-score', (req, res) => FormTemplateController.calculateScore(req, res));

export default router;
