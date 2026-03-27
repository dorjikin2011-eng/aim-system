import express from 'express';
import { MaturityFrameworkModel } from '../models/MaturityFramework';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = express.Router();

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

// Get maturity framework for an indicator
router.get('/frameworks/indicator/:indicatorId', requireAuth, async (req, res) => {
  try {
    const framework = await MaturityFrameworkModel.getByIndicatorId(req.params.indicatorId);
    res.json({ success: true, data: framework });
  } catch (error: any) {
    console.error('Error getting maturity framework:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to get maturity framework' });
  }
});

// Update maturity framework for an indicator
router.put('/frameworks/indicator/:indicatorId', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'User not authenticated' });

    await MaturityFrameworkModel.upsert(req.params.indicatorId, req.body, req.user.id);
    res.json({ success: true, message: 'Maturity framework updated successfully' });
  } catch (error: any) {
    console.error('Error updating maturity framework:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update maturity framework' });
  }
});

// Get ICCS subsystems
router.get('/subsystems/:indicatorId', requireAuth, async (req, res) => {
  try {
    const subsystems = await MaturityFrameworkModel.getSubsystems(req.params.indicatorId);
    res.json({ success: true, data: subsystems });
  } catch (error: any) {
    console.error('Error getting subsystems:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to get subsystems' });
  }
});

// Update ICCS subsystems
router.put('/subsystems/:indicatorId', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'User not authenticated' });

    await MaturityFrameworkModel.updateSubsystems(req.params.indicatorId, req.body, req.user.id);
    res.json({ success: true, message: 'Subsystems updated successfully' });
  } catch (error: any) {
    console.error('Error updating subsystems:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update subsystems' });
  }
});

// Get framework templates
router.get('/templates', requireAuth, async (req, res) => {
  try {
    const templates = await MaturityFrameworkModel.getTemplates();
    res.json({ success: true, data: templates });
  } catch (error: any) {
    console.error('Error getting framework templates:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to get framework templates' });
  }
});

// Create framework template
router.post('/templates', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'User not authenticated' });

    const id = await MaturityFrameworkModel.createTemplate(req.body, req.user.id);
    res.json({ success: true, data: { id } });
  } catch (error: any) {
    console.error('Error creating framework template:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create framework template' });
  }
});

// Delete framework template
router.delete('/templates/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'User not authenticated' });

    await MaturityFrameworkModel.deleteTemplate(req.params.id);
    res.json({ success: true, message: 'Framework template deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting framework template:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to delete framework template' });
  }
});

// Apply template to indicator
router.post('/templates/:templateId/apply/:indicatorId', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'User not authenticated' });

    const templates = await MaturityFrameworkModel.getTemplates();
    const template = templates.find(t => t.id === req.params.templateId);

    if (!template) return res.status(404).json({ success: false, error: 'Template not found' });

    await MaturityFrameworkModel.upsert(req.params.indicatorId, template.framework, req.user.id);

    res.json({ success: true, message: 'Template applied successfully' });
  } catch (error: any) {
    console.error('Error applying template:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to apply template' });
  }
});

export default router;