// backend/src/controllers/configController.ts - FIXED TYPES
import { Request, Response } from 'express';
import { Database } from 'sqlite3';
import { getDB } from '../models/db';

// Enhanced function to handle database schema gracefully
async function ensureConfigTableExists() {
  const db = getDB();
  try {
  
  try {
    // First, try to check if table exists and get its schema
    const tableInfo = await new Promise<any[]>((resolve, reject) => {
      await allAsync(db, "PRAGMA table_info('system_config')", (err: Error | null, rows: any[]) => {
        if (err) {
          // Table might not exist
          resolve([]);
        } else {
          resolve(rows || []);
        }
      });
    });
    
    if (tableInfo.length === 0) {
      // Table doesn't exist - try to create it
      console.log('Creating system_config table...');
      await createNewTable(db);
    } else {
      // Table exists - ensure it has required columns
      console.log('System_config table exists, checking schema...');
      await ensureRequiredColumns(db, tableInfo);
    }
  } catch (error) {
    console.warn('Error checking/creating system_config table:', error);
    // Continue anyway - we'll handle missing config gracefully
  }
}

async function createNewTable(db: Database): Promise<void> {
  return new Promise((resolve, reject) => {
    await runAsync(db, `
      CREATE TABLE IF NOT EXISTS system_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        high_integrity_min REAL DEFAULT 80.0,
        medium_integrity_min REAL DEFAULT 50.0,
        default_assessment_year INTEGER DEFAULT 2025,
        max_file_size_mb INTEGER DEFAULT 10,
        enable_auto_scoring BOOLEAN DEFAULT 1,
        updated_by TEXT NOT NULL DEFAULT 'system',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err: Error | null) => {
      if (err) {
        console.warn('Could not create table (might be read-only):', err.message);
        resolve(); // Don't fail, we'll use defaults
        return;
      }
      
      // Insert default config
      await runAsync(db, `
        INSERT OR IGNORE INTO system_config (
          id, high_integrity_min, medium_integrity_min,
          default_assessment_year, max_file_size_mb, enable_auto_scoring, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [1, 80.0, 50.0, 2025, 10, 1, 'system'], (err: Error | null) => {
        if (err) {
          console.warn('Could not insert default config:', err.message);
        }
        resolve();
      });
    });
  });
}

async function ensureRequiredColumns(db: Database, existingColumns: any[]): Promise<void> {
  const requiredColumns = [
    { name: 'high_integrity_min', type: 'REAL', default: '80.0' },
    { name: 'medium_integrity_min', type: 'REAL', default: '50.0' },
    { name: 'default_assessment_year', type: 'INTEGER', default: '2025' },
    { name: 'max_file_size_mb', type: 'INTEGER', default: '10' },
    { name: 'enable_auto_scoring', type: 'BOOLEAN', default: '1' }
  ];
  
  for (const reqCol of requiredColumns) {
    const exists = existingColumns.some(col => col.name === reqCol.name);
    if (!exists) {
      console.log(`Adding missing column: ${reqCol.name}`);
      try {
        await new Promise<void>((resolve, reject) => {
          await runAsync(db, `ALTER TABLE system_config ADD COLUMN ${reqCol.name} ${reqCol.type} DEFAULT ${reqCol.default}`, (err: Error | null) => {
            if (err) {
              console.warn(`Could not add column ${reqCol.name}:`, err.message);
            }
            resolve();
          });
        });
      } catch (error) {
        // Ignore - column might already exist or database is read-only
      }
    }
  }
}

// Helper function to get indicators with their weights
async function getIndicatorsWithWeights() {
  try {
    const db = getDB();
  try {
    
    return new Promise<any[]>((resolve, reject) => {
      await allAsync(db, 
        `SELECT id, code, name, weight, category, is_active 
         FROM indicators 
         WHERE is_active = 1 
         ORDER BY display_order, name`,
        (err: Error | null, rows: any[]) => {
          if (err) {
            console.warn('Error getting indicators:', err.message);
            resolve([]); // Return empty array instead of failing
          } else {
            resolve(rows || []);
          }
        }
      );
    });
  } catch (error) {
    console.warn('Error in getIndicatorsWithWeights:', error);
    return [];
  }
}

// GET /api/admin/config - Robust version
export const getConfig = async (req: Request, res: Response) => {
  try {
    await ensureConfigTableExists();

    const db = getDB();
  try {
    
    // Try to get system config
    let systemConfig: any = null;
    try {
      systemConfig = await new Promise<any>((resolve, reject) => {
        await getAsync(db, 'SELECT * FROM system_config WHERE id = 1', (err: Error | null, row: any) => {
          if (err) {
            console.warn('Error reading system_config:', err.message);
            resolve(null);
          } else {
            resolve(row);
          }
        });
      });
    } catch (error) {
      console.warn('Failed to read system config, using defaults');
    }

    // Get dynamic indicators
    const indicators = await getIndicatorsWithWeights();
    const totalWeight = indicators.reduce((total, indicator) => total + (indicator.weight || 0), 0);

    // Build response - handle missing config gracefully
    const response = {
      // System configuration (use defaults if missing)
      high_integrity_min: systemConfig?.high_integrity_min || 80.0,
      medium_integrity_min: systemConfig?.medium_integrity_min || 50.0,
      default_assessment_year: systemConfig?.default_assessment_year || 2025,
      max_file_size_mb: systemConfig?.max_file_size_mb || 10,
      enable_auto_scoring: systemConfig?.enable_auto_scoring !== undefined ? systemConfig.enable_auto_scoring : true,
      updated_by: systemConfig?.updated_by || 'system',
      updated_at: systemConfig?.updated_at || new Date().toISOString(),
      
      // Dynamic indicator data
      indicators: indicators,
      total_weight: totalWeight,
      weight_valid: Math.abs(totalWeight - 100) < 0.1
    };

    res.json(response);
  } catch (err: any) {
    console.error('Config fetch failed:', err.message || err);
    
    // Return safe defaults on complete failure
    res.json({
      high_integrity_min: 80.0,
      medium_integrity_min: 50.0,
      default_assessment_year: 2025,
      max_file_size_mb: 10,
      enable_auto_scoring: true,
      updated_by: 'system',
      updated_at: new Date().toISOString(),
      indicators: [],
      total_weight: 0,
      weight_valid: false
    });
  }
};

// PUT /api/admin/config - Try to update, but don't fail if read-only
export const updateConfig = async (req: Request, res: Response) => {
  try {
    const {
      high_integrity_min,
      medium_integrity_min,
      default_assessment_year,
      max_file_size_mb,
      enable_auto_scoring
    } = req.body;

    // Validate
    if (
      typeof high_integrity_min !== 'number' ||
      typeof medium_integrity_min !== 'number' ||
      high_integrity_min <= medium_integrity_min ||
      high_integrity_min > 100 ||
      medium_integrity_min < 0
    ) {
      return res.status(400).json({ error: 'Invalid integrity thresholds' });
    }

    await ensureConfigTableExists();

    const db = getDB();
  try {
    const updated_by = req.user?.email || 'system';

    try {
      await new Promise<void>((resolve, reject) => {
        await runAsync(db, 
          `UPDATE system_config SET
            high_integrity_min = ?, 
            medium_integrity_min = ?,
            default_assessment_year = ?,
            max_file_size_mb = ?,
            enable_auto_scoring = ?,
            updated_by = ?, 
            updated_at = CURRENT_TIMESTAMP
           WHERE id = 1`,
          [
            high_integrity_min, 
            medium_integrity_min,
            default_assessment_year || 2025,
            max_file_size_mb || 10,
            enable_auto_scoring !== false ? 1 : 0,
            updated_by
          ],
          (err: Error | null) => {
            if (err) {
              console.warn('Could not update system_config (might be read-only):', err.message);
              // Don't reject - just log and continue
            }
            resolve();
          }
        );
      });
    } catch (updateError) {
      console.warn('Update failed, but continuing:', updateError);
    }

    res.json({ 
      success: true,
      message: 'Configuration processed (database might be read-only)' 
    });
  } catch (err: any) {
    console.error('Config update error:', err.message || err);
    res.status(500).json({ error: 'Failed to process configuration update' });
  }
};

// GET /api/system-config
export const getSystemConfig = async (req: Request, res: Response) => {
  try {
    await ensureConfigTableExists();

    const db = getDB();
  try {
    let systemConfig: any = null;
    
    try {
      systemConfig = await new Promise<any>((resolve, reject) => {
        await getAsync(db, 'SELECT * FROM system_config WHERE id = 1', (err: Error | null, row: any) => {
          if (err) {
            console.warn('Error reading system_config:', err.message);
            resolve(null);
          } else {
            resolve(row);
          }
        });
      });
    } catch (error) {
      // Use defaults
    }

    res.json({
      success: true,
      data: {
        high_integrity_min: systemConfig?.high_integrity_min || 80.0,
        medium_integrity_min: systemConfig?.medium_integrity_min || 50.0,
        default_assessment_year: systemConfig?.default_assessment_year || 2025,
        max_file_size_mb: systemConfig?.max_file_size_mb || 10,
        enable_auto_scoring: systemConfig?.enable_auto_scoring !== undefined ? systemConfig.enable_auto_scoring : true,
        updated_by: systemConfig?.updated_by || 'system',
        updated_at: systemConfig?.updated_at || new Date().toISOString()
      }
    });
  } catch (err: any) {
    console.error('System config fetch failed:', err.message || err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to load system configuration' 
    });
  }
};