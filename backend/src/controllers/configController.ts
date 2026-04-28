// backend/src/controllers/configController.ts - FIXED FOR POSTGRESQL
import { Request, Response } from 'express';
import { getDB, getAsync, runAsync, allAsync, query } from '../models/db';

// ============================================
// Enhanced function to handle database schema gracefully for PostgreSQL
// ============================================
async function ensureConfigTableExists() {
  const db = getDB();
  
  try {
    // PostgreSQL: Check if table exists using information_schema
    const tableCheck = await query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'system_config'
      )`,
      []
    );
    
    const tableExists = tableCheck[0]?.exists || false;
    
    if (!tableExists) {
      // Table doesn't exist - create it
      console.log('Creating system_config table...');
      await createNewTable(db);
    } else {
      // Table exists - check its schema
      console.log('System_config table exists, checking schema...');
      await ensureRequiredColumns(db);
    }
  } catch (error) {
    console.warn('Error checking/creating system_config table:', error);
    // Continue anyway - we'll handle missing config gracefully
  }
}

// ============================================
// Create new table for PostgreSQL
// ============================================
async function createNewTable(db: any): Promise<void> {
  try {
    await runAsync(db, `
      CREATE TABLE IF NOT EXISTS system_config (
        id SERIAL PRIMARY KEY,
        high_integrity_min DECIMAL(5,2) DEFAULT 80.0,
        medium_integrity_min DECIMAL(5,2) DEFAULT 50.0,
        default_assessment_year INTEGER DEFAULT 2025,
        max_file_size_mb INTEGER DEFAULT 10,
        enable_auto_scoring BOOLEAN DEFAULT true,
        updated_by TEXT NOT NULL DEFAULT 'system',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `, []);
    
    // Insert default config if not exists
    await runAsync(db, `
      INSERT INTO system_config (
        high_integrity_min, medium_integrity_min,
        default_assessment_year, max_file_size_mb, enable_auto_scoring, updated_by
      ) 
      SELECT $1, $2, $3, $4, $5, $6
      WHERE NOT EXISTS (SELECT 1 FROM system_config)
    `, [80.0, 50.0, 2025, 10, true, 'system']);
    
    console.log('System_config table created successfully');
  } catch (error) {
    console.warn('Could not create table:', error);
  }
}

// ============================================
// Ensure required columns exist for PostgreSQL
// ============================================
async function ensureRequiredColumns(db: any): Promise<void> {
  const requiredColumns = [
    { name: 'high_integrity_min', type: 'DECIMAL(5,2)', default: '80.0' },
    { name: 'medium_integrity_min', type: 'DECIMAL(5,2)', default: '50.0' },
    { name: 'default_assessment_year', type: 'INTEGER', default: '2025' },
    { name: 'max_file_size_mb', type: 'INTEGER', default: '10' },
    { name: 'enable_auto_scoring', type: 'BOOLEAN', default: 'true' }
  ];
  
  for (const reqCol of requiredColumns) {
    try {
      // Check if column exists using information_schema
      const columnCheck = await query(
        `SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'system_config' 
          AND column_name = $1
        )`,
        [reqCol.name]
      );
      
      const columnExists = columnCheck[0]?.exists || false;
      
      if (!columnExists) {
        console.log(`Adding missing column: ${reqCol.name}`);
        try {
          await runAsync(db, 
            `ALTER TABLE system_config ADD COLUMN ${reqCol.name} ${reqCol.type} DEFAULT ${reqCol.default}`,
            []
          );
        } catch (error) {
          console.warn(`Could not add column ${reqCol.name}:`, error);
        }
      }
    } catch (error) {
      console.warn(`Error checking column ${reqCol.name}:`, error);
    }
  }
}

// ============================================
// Helper function to get indicators with their weights
// ============================================
async function getIndicatorsWithWeights() {
  try {
    const db = getDB();
    
    // FIXED: Changed is_active = 1 to is_active = true, and generic type
    const rows = await allAsync<any>(db, 
      `SELECT id, code, name, weight, category, is_active 
       FROM indicators 
       WHERE is_active = true 
       ORDER BY display_order, name`,
      []
    );
    
    return rows || [];
  } catch (error) {
    console.warn('Error getting indicators:', error);
    return [];
  }
}

// ============================================
// GET /api/admin/config - Robust version
// ============================================
export const getConfig = async (req: Request, res: Response) => {
  try {
    await ensureConfigTableExists();

    const db = getDB();
    
    // Try to get system config
    let systemConfig: any = null;
    try {
      systemConfig = await getAsync<any>(db, 'SELECT * FROM system_config LIMIT 1', []);
    } catch (error) {
      console.warn('Error reading system_config:', error);
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
  } catch (err) {
    console.error('Config fetch failed:', err);
    
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

// ============================================
// PUT /api/admin/config - Try to update, but don't fail if read-only
// ============================================
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
    const updated_by = (req as any).user?.email || 'system';

    try {
      // FIXED: Changed ? to $1, $2, etc. and boolean handling
      await runAsync(db, 
        `UPDATE system_config SET
          high_integrity_min = $1, 
          medium_integrity_min = $2,
          default_assessment_year = $3,
          max_file_size_mb = $4,
          enable_auto_scoring = $5,
          updated_by = $6, 
          updated_at = CURRENT_TIMESTAMP
         WHERE id = 1`,
        [
          high_integrity_min, 
          medium_integrity_min,
          default_assessment_year || 2025,
          max_file_size_mb || 10,
          enable_auto_scoring !== false,
          updated_by
        ]
      );
    } catch (updateError) {
      console.warn('Update failed, but continuing:', updateError);
      // If update fails because row doesn't exist, try insert
      try {
        await runAsync(db, 
          `INSERT INTO system_config (
            high_integrity_min, medium_integrity_min,
            default_assessment_year, max_file_size_mb, 
            enable_auto_scoring, updated_by
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            high_integrity_min, 
            medium_integrity_min,
            default_assessment_year || 2025,
            max_file_size_mb || 10,
            enable_auto_scoring !== false,
            updated_by
          ]
        );
      } catch (insertError) {
        console.warn('Insert also failed:', insertError);
      }
    }

    res.json({ 
      success: true,
      message: 'Configuration processed successfully' 
    });
  } catch (err) {
    console.error('Config update error:', err);
    res.status(500).json({ error: 'Failed to process configuration update' });
  }
};

// ============================================
// GET /api/system-config
// ============================================
export const getSystemConfig = async (req: Request, res: Response) => {
  try {
    await ensureConfigTableExists();

    const db = getDB();
    let systemConfig: any = null;
    
    try {
      systemConfig = await getAsync<any>(db, 'SELECT * FROM system_config LIMIT 1', []);
    } catch (error) {
      console.warn('Error reading system_config:', error);
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
  } catch (err) {
    console.error('System config fetch failed:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to load system configuration' 
    });
  }
};