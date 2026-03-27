//backend/src/controllers/assignmentController.ts
import { Request, Response } from 'express';
import { getDB } from '../models/db';
import { logAction } from '../services/auditService';

interface Assignment {
  id: string;
  prevention_officer_id: string;
  agency_id: string;
  assigned_by: string;
  assigned_at: string;
  status: string;
  notes?: string;
}

// GET /api/admin/assignments
export const getAssignments = async (req: Request, res: Response) => {
  try {
    const db = getDB();
    
    const assignments = await new Promise<any[]>((resolve, reject) => {
      db.all(`
        SELECT 
          a.*,
          po.full_name as officer_name,
          po.email as officer_email,
          po.position as officer_position,
          po.department as officer_department,
          ag.name as agency_name,
          ag.sector as agency_sector,
          ag.agency_type,
          ag.hoa_name,
          ag.hoa_email,
          ag.hoa_phone,
          ag.focal_person_name,
          ag.focal_person_email,
          ag.focal_person_phone,
          ass.full_name as assigned_by_name
        FROM assignments a
        LEFT JOIN users po ON a.prevention_officer_id = po.id
        LEFT JOIN agencies ag ON a.agency_id = ag.id
        LEFT JOIN users ass ON a.assigned_by = ass.id
        ORDER BY a.assigned_at DESC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({ success: true, assignments });
  } catch (err) {
    console.error('Error fetching assignments:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch assignments' });
  }
};

// GET /api/admin/assignments/officers/:officerId
export const getOfficerAssignments = async (req: Request, res: Response) => {
  try {
    const { officerId } = req.params;
    const db = getDB();
    
    const assignments = await new Promise<any[]>((resolve, reject) => {
      db.all(`
        SELECT 
          a.*,
          ag.name as agency_name,
          ag.sector as agency_sector,
          ag.agency_type,
          ag.hoa_name,
          ag.hoa_email,
          ag.hoa_phone,
          ag.focal_person_name,
          ag.focal_person_email,
          ag.focal_person_phone
        FROM assignments a
        LEFT JOIN agencies ag ON a.agency_id = ag.id
        WHERE a.prevention_officer_id = ?
          AND a.status = 'active'
        ORDER BY a.assigned_at DESC
      `, [officerId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({ success: true, assignments });
  } catch (err) {
    console.error('Error fetching officer assignments:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch officer assignments' });
  }
};

// GET /api/admin/assignments/available-officers - FIXED
export const getAvailableOfficers = async (req: Request, res: Response) => {
  try {
    const db = getDB();
    
    const officers = await new Promise<any[]>((resolve, reject) => {
      db.all(`
        SELECT 
          u.id,
          u.full_name as name,
          u.email,
          u.phone,
          u.position,
          u.department,
          COUNT(a.id) as assignment_count
        FROM users u
        LEFT JOIN assignments a ON u.id = a.prevention_officer_id 
          AND a.status = 'active'
        WHERE u.role = 'prevention_officer'
          AND u.is_active = 1
        GROUP BY u.id
        ORDER BY u.full_name
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({ success: true, officers });
  } catch (err) {
    console.error('Error fetching available officers:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch officers' });
  }
};

// GET /api/admin/assignments/unassigned-agencies - FIXED
export const getUnassignedAgencies = async (req: Request, res: Response) => {
  try {
    const db = getDB();
    
    const agencies = await new Promise<any[]>((resolve, reject) => {
      db.all(`
        SELECT 
          ag.id,
          ag.name,
          ag.sector,
          ag.agency_type,
          ag.status,
          ag.hoa_name,
          ag.hoa_email,
          ag.hoa_phone,
          ag.focal_person_name,
          ag.focal_person_email,
          ag.focal_person_phone,
          ag.address,
          ag.contact_person,
          ag.contact_email,
          ag.contact_phone,
          ag.created_at,
          ag.updated_at
        FROM agencies ag
        WHERE ag.id NOT IN (
          SELECT agency_id FROM assignments WHERE status = 'active'
        )
          AND ag.status = 'active'
        ORDER BY ag.name
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({ success: true, agencies });
  } catch (err) {
    console.error('Error fetching unassigned agencies:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch unassigned agencies' });
  }
};

// POST /api/admin/assignments - FIXED
export const createAssignment = async (req: Request, res: Response) => {
  try {
    const { prevention_officer_id, agency_id, notes } = req.body;
    
    if (!prevention_officer_id || !agency_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Prevention officer and agency are required' 
      });
    }

    const db = getDB();
    const assigned_by = req.user?.id || 'system';
    
    // Check if officer exists and is prevention_officer - FIXED
    const officer = await new Promise<any>((resolve, reject) => {
      db.get(
        'SELECT id, full_name as name FROM users WHERE id = ? AND role = ? AND is_active = ?',
        [prevention_officer_id, 'prevention_officer', 1],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!officer) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid prevention officer or officer not active' 
      });
    }

    // Check if agency exists
    const agency = await new Promise<any>((resolve, reject) => {
      db.get(
        'SELECT id, name, hoa_name, focal_person_name FROM agencies WHERE id = ? AND status = ?',
        [agency_id, 'active'],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!agency) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid agency or agency not active' 
      });
    }

    // Check for existing active assignment
    const existing = await new Promise<any>((resolve, reject) => {
      db.get(
        'SELECT id FROM assignments WHERE prevention_officer_id = ? AND agency_id = ? AND status = ?',
        [prevention_officer_id, agency_id, 'active'],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (existing) {
      return res.status(400).json({ 
        success: false, 
        error: 'This agency is already assigned to this prevention officer' 
      });
    }

    // Create assignment
    const assignmentId = `ASSIGN_${Date.now()}_${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    
    await new Promise<void>((resolve, reject) => {
      db.run(
        `INSERT INTO assignments 
         (id, prevention_officer_id, agency_id, assigned_by, notes, assigned_at, status)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 'active')`,
        [assignmentId, prevention_officer_id, agency_id, assigned_by, notes || null],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Update agency's assigned_officer_id
    await new Promise<void>((resolve, reject) => {
      db.run(
        'UPDATE agencies SET assigned_officer_id = ? WHERE id = ?',
        [prevention_officer_id, agency_id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Log action
    await logAction(
      req,
      'assign_agency',
      { type: 'assignment', id: assignmentId },
      {
        officer_id: prevention_officer_id,
        officer_name: officer.name,
        agency_id: agency_id,
        agency_name: agency.name,
        hoa_name: agency.hoa_name,
        focal_person_name: agency.focal_person_name,
        notes: notes
      }
    );

    res.status(201).json({
      success: true,
      message: 'Agency assigned successfully',
      assignment: {
        id: assignmentId,
        prevention_officer_id,
        agency_id,
        assigned_by,
        assigned_at: new Date().toISOString(),
        status: 'active'
      }
    });

  } catch (err) {
    console.error('Error creating assignment:', err);
    res.status(500).json({ success: false, error: 'Failed to create assignment' });
  }
};

// DELETE /api/admin/assignments/:id
export const deleteAssignment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDB();

    // Get assignment for audit
    const assignment = await new Promise<any>((resolve, reject) => {
      db.get(
        `SELECT a.*, po.full_name as officer_name, ag.name as agency_name, ag.hoa_name, ag.focal_person_name
         FROM assignments a
         LEFT JOIN users po ON a.prevention_officer_id = po.id
         LEFT JOIN agencies ag ON a.agency_id = ag.id
         WHERE a.id = ?`,
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!assignment) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }

    // Soft delete (update status)
    await new Promise<void>((resolve, reject) => {
      db.run(
        'UPDATE assignments SET status = ? WHERE id = ?',
        ['reassigned', id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Clear agency's assigned_officer_id
    await new Promise<void>((resolve, reject) => {
      db.run(
        'UPDATE agencies SET assigned_officer_id = NULL WHERE id = ?',
        [assignment.agency_id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Log action
    await logAction(
      req,
      'unassign_agency',
      { type: 'assignment', id },
      {
        officer_id: assignment.prevention_officer_id,
        officer_name: assignment.officer_name,
        agency_id: assignment.agency_id,
        agency_name: assignment.agency_name,
        hoa_name: assignment.hoa_name,
        focal_person_name: assignment.focal_person_name
      }
    );

    res.json({ success: true, message: 'Assignment removed successfully' });
  } catch (err) {
    console.error('Error deleting assignment:', err);
    res.status(500).json({ success: false, error: 'Failed to delete assignment' });
  }
};

// GET /api/admin/assignments/stats - FIXED
export const getAssignmentStats = async (req: Request, res: Response) => {
  try {
    const db = getDB();
    
    const stats = await new Promise<any>((resolve, reject) => {
      db.get(`
        SELECT 
          (SELECT COUNT(*) FROM agencies WHERE status = 'active') as total_agencies,
          (SELECT COUNT(DISTINCT agency_id) FROM assignments WHERE status = 'active') as assigned_agencies,
          (SELECT COUNT(DISTINCT prevention_officer_id) FROM assignments WHERE status = 'active') as active_officers,
          (SELECT COUNT(*) FROM users WHERE role = 'prevention_officer' AND is_active = 1) as total_officers
      `, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.json({ success: true, stats });
  } catch (err) {
    console.error('Error fetching assignment stats:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch assignment stats' });
  }
};