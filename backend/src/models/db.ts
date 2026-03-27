// backend/src/models/db.ts - PostgreSQL with SQLite fallback for development
import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import crypto from 'crypto';
import { homedir } from 'os';
import bcrypt from 'bcrypt';
import { Pool, QueryResult, PoolClient } from 'pg';

// Database type detection
const isProduction = process.env.NODE_ENV === 'production';
const usePostgres = isProduction || process.env.USE_POSTGRES === 'true';

let pgPool: Pool | null = null;
let sqliteDb: sqlite3.Database | null = null;

// ============================================================================
// PostgreSQL Connection Management
// ============================================================================
export function getPostgres(): Pool {
  if (!pgPool) {
    console.log('📡 Connecting to PostgreSQL...');

    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pgPool.on('error', (err) => {
      console.error('❌ Unexpected PostgreSQL error:', err.message);
    });

    pgPool.connect()
      .then(client => {
        console.log('✅ PostgreSQL connected');
        client.release();
      })
      .catch(err => {
        console.error('❌ PostgreSQL connection failed:', err.message);
        if (isProduction) {
          console.error('🚨 Production database connection failed. Exiting...');
          process.exit(1);
        }
      });
  }

  return pgPool;
}

// ============================================================================
// SQLite Connection Management (for development)
// ============================================================================
export function getSQLite(): sqlite3.Database {
  if (!sqliteDb) {
    const dbPath = process.env.SQLITE_PATH || './aim-system.db';
    console.log(`📁 SQLite database path: ${dbPath}`);
    console.log(`📁 SQLite absolute path: ${path.resolve(dbPath)}`);
    
    sqliteDb = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Failed to open SQLite database:', err.message);
        if (isProduction) {
          process.exit(1);
        }
      } else {
        console.log('✅ SQLite database connected');
        sqliteDb!.run('PRAGMA foreign_keys = ON');
        sqliteDb!.run('PRAGMA journal_mode = WAL');
        
        // Test query
        sqliteDb!.get('SELECT COUNT(*) as count FROM users', [], (err, row: any) => {
          if (err) console.error('❌ Test query failed:', err.message);
          else console.log(`📊 Initial user count: ${row?.count || 0}`);
        });
      }
    });
  }
  return sqliteDb;
}

// ============================================================================
// Unified Database Interface
// ============================================================================
export function getDB(): sqlite3.Database | Pool {
  if (usePostgres) {
    return getPostgres();
  } else {
    return getSQLite();
  }
}

// Helper to check if using PostgreSQL
export function isUsingPostgres(): boolean {
  return usePostgres;
}

// ============================================================================
// Unified Async Query Functions
// ============================================================================

// Run a query (INSERT, UPDATE, DELETE)
export async function runAsync(db: sqlite3.Database | Pool, sql: string, params: any[] = []): Promise<any> {
  if (db instanceof Pool) {
    // PostgreSQL
    const client = await db.connect();
    try {
      // Convert SQLite parameter placeholders (?) to PostgreSQL ($1, $2, etc.)
      let pgSql = sql;
      if (sql.includes('?')) {
        pgSql = sql.replace(/\?/g, (match, offset) => {
          const index = sql.substring(0, offset).split('?').length;
          return `$${index}`;
        });
      }
      
      // Convert SQLite datetime functions to PostgreSQL
      pgSql = pgSql.replace(/CURRENT_TIMESTAMP/gi, 'CURRENT_TIMESTAMP');
      pgSql = pgSql.replace(/DATETIME\(/gi, 'TIMESTAMP(');
      
      const result = await client.query(pgSql, params);
      return result;
    } finally {
      client.release();
    }
  } else {
    // SQLite
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }
}

// Get a single row
export async function getAsync<T>(db: sqlite3.Database | Pool, sql: string, params: any[] = []): Promise<T | null> {
  if (db instanceof Pool) {
    // PostgreSQL
    const client = await db.connect();
    try {
      let pgSql = sql;
      if (sql.includes('?')) {
        pgSql = sql.replace(/\?/g, (match, offset) => {
          const index = sql.substring(0, offset).split('?').length;
          return `$${index}`;
        });
      }
      
      pgSql = pgSql.replace(/CURRENT_TIMESTAMP/gi, 'CURRENT_TIMESTAMP');
      pgSql = pgSql.replace(/DATETIME\(/gi, 'TIMESTAMP(');
      
      const result = await client.query(pgSql, params);
      return (result.rows[0] as T) || null;
    } finally {
      client.release();
    }
  } else {
    // SQLite
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T || null);
      });
    });
  }
}

// Get multiple rows
export async function allAsync<T = any>(db: sqlite3.Database | Pool, sql: string, params: any[] = []): Promise<T> {
  if (db instanceof Pool) {
    // PostgreSQL
    const client = await db.connect();
    try {
      let pgSql = sql;
      if (sql.includes('?')) {
        pgSql = sql.replace(/\?/g, (match, offset) => {
          const index = sql.substring(0, offset).split('?').length;
          return `$${index}`;
        });
      }
      
      pgSql = pgSql.replace(/CURRENT_TIMESTAMP/gi, 'CURRENT_TIMESTAMP');
      pgSql = pgSql.replace(/DATETIME\(/gi, 'TIMESTAMP(');
      
      const result = await client.query(pgSql, params);
      return result.rows as T;
    } finally {
      client.release();
    }
  } else {
    // SQLite
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as T);
      });
    });
  }
}

// ============================================================================
// CREATE TABLES WITH POSTGRESQL COMPATIBLE SCHEMA
// ============================================================================
export async function createTables() {
  const db = getDB();
  
  // Check if using PostgreSQL for table creation syntax
  const isPG = db instanceof Pool;
  
  if (isPG) {
    console.log('📝 Creating tables in PostgreSQL...');
    
    // Users table - PostgreSQL version
    await runAsync(db, `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN (
          'commissioner', 'director', 'system_admin',
          'prevention_officer', 'agency_head', 'focal_person'
        )),
        agency_id TEXT,
        password_reset_token TEXT,
        password_reset_expires TIMESTAMP,
        last_password_change TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP,
        login_attempts INTEGER DEFAULT 0,
        lock_until TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        department TEXT,
        phone TEXT,
        profile_image TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Agencies table
    await runAsync(db, `
      CREATE TABLE IF NOT EXISTS agencies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sector TEXT NOT NULL,
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'archived')),
        contact_person TEXT,
        contact_email TEXT,
        contact_phone TEXT,
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Assignments table
    await runAsync(db, `
      CREATE TABLE IF NOT EXISTS assignments (
        id TEXT PRIMARY KEY,
        prevention_officer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        agency_id TEXT NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
        assigned_by TEXT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'cancelled', 'inactive')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Assessments table
    await runAsync(db, `
      CREATE TABLE IF NOT EXISTS assessments (
        id TEXT PRIMARY KEY,
        agency_id TEXT NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
        fiscal_year TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('DRAFT', 'SUBMITTED_TO_AGENCY', 'AWAITING_VALIDATION', 'FINALIZED')) DEFAULT 'DRAFT',
        overall_score REAL,
        officer_remarks TEXT,
        agency_remarks TEXT,
        assigned_officer_id TEXT NOT NULL REFERENCES users(id),
        validated_by TEXT REFERENCES users(id),
        validated_at TIMESTAMP,
        submitted_at TIMESTAMP,
        finalized_at TIMESTAMP,
        finalized_by TEXT,
        finalization_notes TEXT,
        unlocked_at TIMESTAMP,
        unlocked_by TEXT,
        unlock_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(agency_id, fiscal_year)
      );
    `);
    
    // Dynamic assessment responses table
    await runAsync(db, `
      CREATE TABLE IF NOT EXISTS dynamic_assessment_responses (
        id TEXT PRIMARY KEY,
        assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
        indicator_id TEXT NOT NULL REFERENCES indicators(id) ON DELETE CASCADE,
        response_data TEXT NOT NULL DEFAULT '{}',
        calculated_score REAL,
        manual_score REAL,
        final_score REAL,
        evidence_files TEXT DEFAULT '[]',
        comments TEXT,
        validated_by TEXT,
        validated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(assessment_id, indicator_id)
      );
    `);
    
    // System config table
    await runAsync(db, `
      CREATE TABLE IF NOT EXISTS system_config (
        id SERIAL PRIMARY KEY,
        config_key TEXT UNIQUE NOT NULL,
        config_value TEXT NOT NULL,
        config_type TEXT DEFAULT 'string' CHECK(config_type IN ('string', 'number', 'boolean', 'json', 'array')),
        category TEXT DEFAULT 'general',
        description TEXT,
        is_public BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Indicators table
    await runAsync(db, `
      CREATE TABLE IF NOT EXISTS indicators (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL CHECK(category IN ('compliance', 'capacity', 'enforcement', 'responsiveness', 'innovation', 'other')),
        weight REAL DEFAULT 0 CHECK(weight >= 0 AND weight <= 100),
        max_score REAL DEFAULT 100,
        scoring_method TEXT DEFAULT 'sum' CHECK(scoring_method IN ('sum', 'average', 'weighted', 'formula', 'conditional', 'manual')),
        formula TEXT,
        parameters TEXT NOT NULL DEFAULT '[]',
        scoring_rules TEXT NOT NULL DEFAULT '[]',
        ui_config TEXT DEFAULT '{}',
        is_active BOOLEAN DEFAULT TRUE,
        display_order INTEGER DEFAULT 0,
        version INTEGER DEFAULT 1,
        created_by TEXT,
        updated_by TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Form templates table
    await runAsync(db, `
      CREATE TABLE IF NOT EXISTS form_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        template_type TEXT NOT NULL CHECK(template_type IN ('assessment', 'report', 'data_collection', 'custom')),
        indicator_ids TEXT DEFAULT '[]',
        sections TEXT NOT NULL DEFAULT '[]',
        validation_rules TEXT DEFAULT '{}',
        ui_config TEXT DEFAULT '{}',
        version TEXT DEFAULT '1.0',
        is_active BOOLEAN DEFAULT TRUE,
        created_by TEXT,
        updated_by TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Configuration versions table
    await runAsync(db, `
      CREATE TABLE IF NOT EXISTS configuration_versions (
        id TEXT PRIMARY KEY,
        version_name TEXT NOT NULL,
        version_number TEXT UNIQUE NOT NULL,
        description TEXT,
        indicators TEXT NOT NULL DEFAULT '[]',
        form_templates TEXT NOT NULL DEFAULT '[]',
        system_config TEXT NOT NULL DEFAULT '{}',
        is_active BOOLEAN DEFAULT FALSE,
        applied_at TIMESTAMP,
        applied_by TEXT,
        created_by TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
  } else {
    // SQLite version (original)
    const sqlite = db as sqlite3.Database;
    
    await runAsync(sqlite, `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN (
          'commissioner', 'director', 'system_admin',
          'prevention_officer', 'agency_head', 'focal_person'
        )),
        agency_id TEXT,
        password_reset_token TEXT,
        password_reset_expires DATETIME,
        last_password_change DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME,
        login_attempts INTEGER DEFAULT 0,
        lock_until DATETIME,
        is_active BOOLEAN DEFAULT 1,
        department TEXT,
        phone TEXT,
        profile_image TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await runAsync(sqlite, `
      CREATE TABLE IF NOT EXISTS agencies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sector TEXT NOT NULL,
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'archived')),
        contact_person TEXT,
        contact_email TEXT,
        contact_phone TEXT,
        address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await runAsync(sqlite, `
      CREATE TABLE IF NOT EXISTS assignments (
        id TEXT PRIMARY KEY,
        prevention_officer_id TEXT NOT NULL,
        agency_id TEXT NOT NULL,
        assigned_by TEXT NOT NULL,
        assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'cancelled', 'inactive')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (prevention_officer_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
      );
    `);
    
    await runAsync(sqlite, `
      CREATE TABLE IF NOT EXISTS assessments (
        id TEXT PRIMARY KEY,
        agency_id TEXT NOT NULL,
        fiscal_year TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('DRAFT', 'SUBMITTED_TO_AGENCY', 'AWAITING_VALIDATION', 'FINALIZED')) DEFAULT 'DRAFT',
        overall_score REAL,
        officer_remarks TEXT,
        agency_remarks TEXT,
        assigned_officer_id TEXT NOT NULL,
        validated_by TEXT,
        validated_at DATETIME,
        submitted_at DATETIME,
        finalized_at DATETIME,
        finalized_by TEXT,
        finalization_notes TEXT,
        unlocked_at DATETIME,
        unlocked_by TEXT,
        unlock_reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_officer_id) REFERENCES users(id),
        FOREIGN KEY (validated_by) REFERENCES users(id),
        UNIQUE(agency_id, fiscal_year)
      );
    `);
    
    await runAsync(sqlite, `
      CREATE TABLE IF NOT EXISTS dynamic_assessment_responses (
        id TEXT PRIMARY KEY,
        assessment_id TEXT NOT NULL,
        indicator_id TEXT NOT NULL,
        response_data TEXT NOT NULL DEFAULT '{}',
        calculated_score REAL,
        manual_score REAL,
        final_score REAL,
        evidence_files TEXT DEFAULT '[]',
        comments TEXT,
        validated_by TEXT,
        validated_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
        FOREIGN KEY (indicator_id) REFERENCES indicators(id) ON DELETE CASCADE,
        UNIQUE(assessment_id, indicator_id)
      );
    `);
    
    await runAsync(sqlite, `
      CREATE TABLE IF NOT EXISTS system_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        config_key TEXT UNIQUE NOT NULL,
        config_value TEXT NOT NULL,
        config_type TEXT DEFAULT 'string' CHECK(config_type IN ('string', 'number', 'boolean', 'json', 'array')),
        category TEXT DEFAULT 'general',
        description TEXT,
        is_public BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await runAsync(sqlite, `
      CREATE TABLE IF NOT EXISTS indicators (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL CHECK(category IN ('compliance', 'capacity', 'enforcement', 'responsiveness', 'innovation', 'other')),
        weight REAL DEFAULT 0 CHECK(weight >= 0 AND weight <= 100),
        max_score REAL DEFAULT 100,
        scoring_method TEXT DEFAULT 'sum' CHECK(scoring_method IN ('sum', 'average', 'weighted', 'formula', 'conditional', 'manual')),
        formula TEXT,
        parameters TEXT NOT NULL DEFAULT '[]',
        scoring_rules TEXT NOT NULL DEFAULT '[]',
        ui_config TEXT DEFAULT '{}',
        is_active BOOLEAN DEFAULT 1,
        display_order INTEGER DEFAULT 0,
        version INTEGER DEFAULT 1,
        created_by TEXT,
        updated_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await runAsync(sqlite, `
      CREATE TABLE IF NOT EXISTS form_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        template_type TEXT NOT NULL CHECK(template_type IN ('assessment', 'report', 'data_collection', 'custom')),
        indicator_ids TEXT DEFAULT '[]',
        sections TEXT NOT NULL DEFAULT '[]',
        validation_rules TEXT DEFAULT '{}',
        ui_config TEXT DEFAULT '{}',
        version TEXT DEFAULT '1.0',
        is_active BOOLEAN DEFAULT 1,
        created_by TEXT,
        updated_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await runAsync(sqlite, `
      CREATE TABLE IF NOT EXISTS configuration_versions (
        id TEXT PRIMARY KEY,
        version_name TEXT NOT NULL,
        version_number TEXT UNIQUE NOT NULL,
        description TEXT,
        indicators TEXT NOT NULL DEFAULT '[]',
        form_templates TEXT NOT NULL DEFAULT '[]',
        system_config TEXT NOT NULL DEFAULT '{}',
        is_active BOOLEAN DEFAULT 0,
        applied_at DATETIME,
        applied_by TEXT,
        created_by TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }
  
  console.log('✅ All database tables created/verified successfully');
}

// ============================================================================
// SEED DEFAULT DATA (PostgreSQL compatible)
// ============================================================================
async function initializeDefaultData() {
  const db = getDB();
  const isPG = db instanceof Pool;
  
  console.log('\n🌱 SEEDING DEFAULT AIMS DATA FROM OFFICIAL GUIDELINE (Sept 2025)');
  
  try {
    // ==================== DEFAULT ADMIN USER ====================
    const userCount = await getAsync<{ count: number }>(db, 'SELECT COUNT(*) as count FROM users');
    if (userCount?.count === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await runAsync(db, `
        INSERT INTO users (id, name, email, password_hash, role, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        crypto.randomUUID(),
        'System Administrator',
        'admin@acc.gov',
        hashedPassword,
        'system_admin',
        isPG ? true : 1
      ]);
      console.log('✅ Created admin user: admin@acc.gov / admin123');
    }

    // ==================== DEFAULT SYSTEM CONFIG ====================
    const configCount = await getAsync<{ count: number }>(db, 'SELECT COUNT(*) as count FROM system_config');
    if (configCount?.count === 0) {
      const configs = [
        { key: 'system.version', value: '2.0.0', type: 'string', category: 'system', description: 'System version' },
        { key: 'integrity.threshold.high', value: '80', type: 'number', category: 'scoring', description: 'High integrity threshold (≥80)' },
        { key: 'integrity.threshold.medium', value: '50', type: 'number', category: 'scoring', description: 'Medium integrity threshold (50-79)' },
        { key: 'assessment.default_year', value: new Date().getFullYear().toString(), type: 'string', category: 'assessment', description: 'Default assessment year' },
        { key: 'ui.theme', value: 'light', type: 'string', category: 'ui', description: 'Default UI theme' },
      ];
      
      for (const config of configs) {
        if (isPG) {
          await runAsync(db, `
            INSERT INTO system_config (config_key, config_value, config_type, category, description)
            VALUES ($1, $2, $3, $4, $5)
          `, [config.key, config.value, config.type, config.category, config.description]);
        } else {
          await runAsync(db, `
            INSERT INTO system_config (config_key, config_value, config_type, category, description)
            VALUES (?, ?, ?, ?, ?)
          `, [config.key, config.value, config.type, config.category, config.description]);
        }
      }
      console.log('✅ Created system configuration');
    }

    // ==================== SEED 5 AIMS INDICATORS ====================
    const indicatorCount = await getAsync<{ count: number }>(db, 'SELECT COUNT(*) as count FROM indicators');
    if (indicatorCount?.count === 0) {
      console.log('\n📊 Creating 5 AIMS indicators per official guideline...');
      
      const indicators = [
        {
          id: 'ind_iccs',
          code: 'ICCS',
          name: 'Internal Corruption Control Systems',
          description: 'Functioning of agency\'s four core integrity systems',
          category: 'compliance',
          weight: 28,
          max_score: 28,
          scoring_method: 'formula',
          parameters: JSON.stringify([
            {
              id: 'complaint_exists',
              code: 'complaint_exists',
              label: 'Complaint Management System Exists',
              type: 'boolean',
              description: 'Does the complaint system exist?',
              required: true,
              scoringRuleIds: ['rule_iccs_complaint_exists']
            },
            {
              id: 'complaint_functions',
              code: 'complaint_functions',
              label: 'Complaint Management System Functions',
              type: 'boolean',
              description: 'Does the complaint system function properly?',
              required: true,
              scoringRuleIds: ['rule_iccs_complaint_functioning']
            },
            {
              id: 'conflict_exists',
              code: 'conflict_exists',
              label: 'Conflict of Interest System Exists',
              type: 'boolean',
              description: 'Does the conflict of interest system exist?',
              required: true,
              scoringRuleIds: ['rule_iccs_coi_exists']
            },
            {
              id: 'conflict_functions',
              code: 'conflict_functions',
              label: 'Conflict of Interest System Functions',
              type: 'boolean',
              description: 'Does the conflict of interest system function?',
              required: true,
              scoringRuleIds: ['rule_iccs_coi_functioning']
            },
            {
              id: 'gift_exists',
              code: 'gift_exists',
              label: 'Gift Register System Exists',
              type: 'boolean',
              description: 'Does the gift register system exist?',
              required: true,
              scoringRuleIds: ['rule_iccs_gift_exists']
            },
            {
              id: 'gift_functions',
              code: 'gift_functions',
              label: 'Gift Register System Functions',
              type: 'boolean',
              description: 'Does the gift register system function?',
              required: true,
              scoringRuleIds: ['rule_iccs_gift_functioning']
            },
            {
              id: 'proactive_level',
              code: 'proactive_level',
              label: 'Proactive Measures Level',
              type: 'select',
              description: 'Status of ACC recommendations implementation',
              required: true,
              options: [
                { value: 'level1', label: 'Level 1: ACC Recommendations Present & Functioning (7 points)' },
                { value: 'level2', label: 'Level 2: No Recommendations & No Proactive Measures (3 points)' },
                { value: 'level3', label: 'Level 3: ACC Recommendations Exist But Not Implemented (0 points)' }
              ],
              scoringRuleIds: ['rule_acc_level1', 'rule_acc_level2', 'rule_acc_level3']
            }
          ]),
          scoring_rules: JSON.stringify([
            { id: 'rule_iccs_complaint_exists', parameterCode: 'complaint_exists', condition: 'true', points: 3, description: 'Complaint system exists' },
            { id: 'rule_iccs_complaint_functioning', parameterCode: 'complaint_functions', condition: 'true', points: 4, description: 'Complaint system functions' },
            { id: 'rule_iccs_coi_exists', parameterCode: 'conflict_exists', condition: 'true', points: 3, description: 'Conflict system exists' },
            { id: 'rule_iccs_coi_functioning', parameterCode: 'conflict_functions', condition: 'true', points: 4, description: 'Conflict system functions' },
            { id: 'rule_iccs_gift_exists', parameterCode: 'gift_exists', condition: 'true', points: 3, description: 'Gift register exists' },
            { id: 'rule_iccs_gift_functioning', parameterCode: 'gift_functions', condition: 'true', points: 4, description: 'Gift register functions' },
            { id: 'rule_acc_level1', parameterCode: 'proactive_level', condition: 'level1', points: 7, description: 'ACC Recommendations Present & Functioning' },
            { id: 'rule_acc_level2', parameterCode: 'proactive_level', condition: 'level2', points: 3, description: 'No Recommendations & No Proactive Measures' },
            { id: 'rule_acc_level3', parameterCode: 'proactive_level', condition: 'level3', points: 0, description: 'ACC Recommendations Exist But Not Implemented' }
          ]),
          is_active: isPG ? true : 1,
          display_order: 1
        },
        {
          id: 'ind_training',
          code: 'TRAINING',
          name: 'Integrity Capacity Building',
          description: 'Staff training and e-learning completion',
          category: 'capacity',
          weight: 26,
          max_score: 26,
          scoring_method: 'conditional',
          parameters: JSON.stringify([
            {
              id: 'total_employees',
              code: 'total_employees',
              label: 'Total Employees',
              type: 'number',
              description: 'Total number of employees in the agency',
              required: true,
              validation: { min: 1 }
            },
            {
              id: 'completed_employees',
              code: 'completed_employees',
              label: 'Completed Employees',
              type: 'number',
              description: 'Number of employees who completed ACC e-learning',
              required: true,
              validation: { min: 0 }
            }
          ]),
          scoring_rules: JSON.stringify([
            { minPercentage: 85, points: 26, label: '≥85% → 26 points (Excellent)' },
            { minPercentage: 70, maxPercentage: 84, points: 18, label: '70-84% → 18 points (Good)' },
            { minPercentage: 50, maxPercentage: 69, points: 10, label: '50-69% → 10 points (Fair)' },
            { minPercentage: 0, maxPercentage: 49, points: 0, label: '<50% → 0 points (Needs Improvement)' }
          ]),
          is_active: isPG ? true : 1,
          display_order: 2
        },
        {
          id: 'ind_ad',
          code: 'AD',
          name: 'Asset Declaration Compliance',
          description: 'Asset declaration submission compliance',
          category: 'compliance',
          weight: 16,
          max_score: 16,
          scoring_method: 'conditional',
          parameters: JSON.stringify([
            {
              id: 'total_covered_officials',
              code: 'total_covered_officials',
              label: 'Total Covered Officials',
              type: 'number',
              description: 'Total number of officials required to submit Asset Declarations',
              required: true,
              validation: { min: 1 }
            },
            {
              id: 'officials_submitted_on_time',
              code: 'officials_submitted_on_time',
              label: 'Officials Submitted On Time',
              type: 'number',
              description: 'Number of officials who submitted Asset Declarations on time',
              required: true,
              validation: { min: 0 }
            }
          ]),
          scoring_rules: JSON.stringify([
            { condition: '=100', points: 16, label: '100% → 16 points (Perfect)' },
            { condition: '>=95', points: 10, label: '95-99% → 10 points (Very Good)' },
            { condition: '>=90', points: 5, label: '90-94% → 5 points (Good)' },
            { condition: '<90', points: 0, label: '<90% → 0 points (Needs Improvement)' }
          ]),
          is_active: isPG ? true : 1,
          display_order: 3
        },
        {
          id: 'ind_cases',
          code: 'CASES',
          name: 'Corruption Case Severity & Resolution',
          description: 'Weighted severity of corruption cases involving agency staff',
          category: 'enforcement',
          weight: 20,
          max_score: 20,
          scoring_method: 'weighted',
          parameters: JSON.stringify([
            {
              id: 'convictions',
              code: 'convictions',
              label: 'Convictions',
              type: 'number',
              description: 'Number of convictions in the Fiscal Year',
              required: false,
              weight: 3,
              validation: { min: 0 }
            },
            {
              id: 'prosecutions',
              code: 'prosecutions',
              label: 'Prosecutions/OAG Referrals',
              type: 'number',
              description: 'Number of prosecutions or OAG referrals',
              required: false,
              weight: 2,
              validation: { min: 0 }
            },
            {
              id: 'admin_actions',
              code: 'admin_actions',
              label: 'Administrative Actions',
              type: 'number',
              description: 'Number of ACC-confirmed administrative actions',
              required: false,
              weight: 1,
              validation: { min: 0 }
            }
          ]),
          scoring_rules: JSON.stringify([
            { range: '=0', points: 20, label: '0 cases → 20 points (Excellent)' },
            { range: '1-2', points: 10, label: '1-2 cases → 10 points (Good)' },
            { range: '3-4', points: 5, label: '3-4 cases → 5 points (Fair)' },
            { range: '>=5', points: 0, label: '≥5 cases → 0 points (Poor)' }
          ]),
          is_active: isPG ? true : 1,
          display_order: 4
        },
        {
          id: 'ind_atr',
          code: 'ATR',
          name: 'ATR Responsiveness',
          description: 'Timeliness of Action Taken Report submissions',
          category: 'responsiveness',
          weight: 10,
          max_score: 10,
          scoring_method: 'conditional',
          parameters: JSON.stringify([
            {
              id: 'total_atrs',
              code: 'total_atrs',
              label: 'Total ATRs',
              type: 'number',
              description: 'Total number of ATRs (Action Taken Reports) requested',
              required: true,
              validation: { min: 1 }
            },
            {
              id: 'atrs_submitted_on_time',
              code: 'atrs_submitted_on_time',
              label: 'ATRs Submitted On Time',
              type: 'number',
              description: 'Number of ATRs submitted within ACC deadlines',
              required: true,
              validation: { min: 0 }
            }
          ]),
          scoring_rules: JSON.stringify([
            { condition: '>=90', points: 10, label: '≥90% → 10 points (Excellent)' },
            { condition: '>=70', points: 7, label: '70-89% → 7 points (Satisfactory)' },
            { condition: '<70', points: 3, label: '<70% → 3 points (Needs Improvement)' }
          ]),
          is_active: isPG ? true : 1,
          display_order: 5
        }
      ];
      
      for (const indicator of indicators) {
        if (isPG) {
          await runAsync(db, `
            INSERT INTO indicators (
              id, code, name, description, category, weight, max_score, scoring_method,
              parameters, scoring_rules, is_active, display_order, created_by, updated_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          `, [
            indicator.id, indicator.code, indicator.name, indicator.description,
            indicator.category, indicator.weight, indicator.max_score, indicator.scoring_method,
            indicator.parameters, indicator.scoring_rules, indicator.is_active,
            indicator.display_order, 'system', 'system'
          ]);
        } else {
          await runAsync(db, `
            INSERT INTO indicators (
              id, code, name, description, category, weight, max_score, scoring_method,
              parameters, scoring_rules, is_active, display_order, created_by, updated_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            indicator.id, indicator.code, indicator.name, indicator.description,
            indicator.category, indicator.weight, indicator.max_score, indicator.scoring_method,
            indicator.parameters, indicator.scoring_rules, indicator.is_active,
            indicator.display_order, 'system', 'system'
          ]);
        }
      }
      
      console.log('✅ Created all 5 AIMS indicators with parameters and scoring rules');
    }

    // ==================== SEED AIMS ASSESSMENT FORM TEMPLATE ====================
    const templateCount = await getAsync<{ count: number }>(db, 'SELECT COUNT(*) as count FROM form_templates');
    if (templateCount?.count === 0) {
      console.log('\n📝 Creating AIMS Assessment Form Template...');
      
      const template = {
        id: 'template_aims_assessment',
        name: 'AIMS Assessment Form (Official Sept 2025)',
        description: 'Standard AIMS assessment form with all 5 indicators per official guideline',
        template_type: 'assessment',
        indicator_ids: JSON.stringify(['ind_iccs', 'ind_training', 'ind_ad', 'ind_cases', 'ind_atr']),
        sections: JSON.stringify([
          {
            id: 'section_basic',
            title: 'Agency Information',
            description: 'Basic agency details required for assessment',
            fields: [
              { id: 'field_agency_name', type: 'text', name: 'agency_name', label: 'Agency Name', required: true, parameterCode: 'agency_name' },
              { id: 'field_fiscal_year', type: 'text', name: 'fiscal_year', label: 'Fiscal Year', required: true, parameterCode: 'fiscal_year', defaultValue: `${new Date().getFullYear()}` },
              { id: 'field_contact_person', type: 'text', name: 'contact_person', label: 'Contact Person', required: true, parameterCode: 'contact_person' }
            ]
          },
          {
            id: 'section_iccs',
            title: 'Indicator 1: Internal Corruption Control Systems (ICCS) - 28 points',
            description: 'Functioning of the agency\'s four core integrity systems',
            fields: [
              { id: 'field_complaint_exists', type: 'checkbox', name: 'complaint_exists', label: 'Complaint Management System Exists', required: true, parameterCode: 'complaint_exists' },
              { id: 'field_complaint_functions', type: 'checkbox', name: 'complaint_functions', label: 'Complaint Management System Functions', required: true, parameterCode: 'complaint_functions' },
              { id: 'field_conflict_exists', type: 'checkbox', name: 'conflict_exists', label: 'Conflict of Interest System Exists', required: true, parameterCode: 'conflict_exists' },
              { id: 'field_conflict_functions', type: 'checkbox', name: 'conflict_functions', label: 'Conflict of Interest System Functions', required: true, parameterCode: 'conflict_functions' },
              { id: 'field_gift_exists', type: 'checkbox', name: 'gift_exists', label: 'Gift Register System Exists', required: true, parameterCode: 'gift_exists' },
              { id: 'field_gift_functions', type: 'checkbox', name: 'gift_functions', label: 'Gift Register System Functions', required: true, parameterCode: 'gift_functions' },
              { 
                id: 'field_proactive_level', 
                type: 'select', 
                name: 'proactive_level', 
                label: 'Proactive Measures Level', 
                required: true, 
                parameterCode: 'proactive_level',
                options: [
                  { value: 'level1', label: 'Level 1: ACC Recommendations Present & Functioning (7 points)' },
                  { value: 'level2', label: 'Level 2: No Recommendations & No Proactive Measures (3 points)' },
                  { value: 'level3', label: 'Level 3: ACC Recommendations Exist But Not Implemented (0 points)' }
                ]
              }
            ]
          },
          {
            id: 'section_training',
            title: 'Indicator 2: Integrity Capacity Building - 26 points',
            description: 'Staff training and e-learning completion',
            fields: [
              { id: 'field_total_employees', type: 'number', name: 'total_employees', label: 'Total Employees', required: true, parameterCode: 'total_employees', min: 1 },
              { id: 'field_completed_employees', type: 'number', name: 'completed_employees', label: 'Completed Employees', required: true, parameterCode: 'completed_employees', min: 0 }
            ]
          },
          {
            id: 'section_ad',
            title: 'Indicator 3: Asset Declaration (AD) Compliance - 16 points',
            description: 'Asset declaration submission compliance',
            fields: [
              { id: 'field_total_covered_officials', type: 'number', name: 'total_covered_officials', label: 'Total Covered Officials', required: true, parameterCode: 'total_covered_officials', min: 1 },
              { id: 'field_officials_submitted_on_time', type: 'number', name: 'officials_submitted_on_time', label: 'Officials Submitted On Time', required: true, parameterCode: 'officials_submitted_on_time', min: 0 }
            ]
          },
          {
            id: 'section_cases',
            title: 'Indicator 4: Corruption Case Severity & Resolution - 20 points',
            description: 'Weighted severity of corruption cases involving agency staff',
            fields: [
              { id: 'field_convictions', type: 'number', name: 'convictions', label: 'Convictions', parameterCode: 'convictions', min: 0, defaultValue: 0 },
              { id: 'field_prosecutions', type: 'number', name: 'prosecutions', label: 'Prosecutions/OAG Referrals', parameterCode: 'prosecutions', min: 0, defaultValue: 0 },
              { id: 'field_admin_actions', type: 'number', name: 'admin_actions', label: 'Administrative Actions', parameterCode: 'admin_actions', min: 0, defaultValue: 0 }
            ]
          },
          {
            id: 'section_atr',
            title: 'Indicator 5: ATR Responsiveness - 10 points',
            description: 'Timeliness of Action Taken Report submissions',
            fields: [
              { id: 'field_total_atrs', type: 'number', name: 'total_atrs', label: 'Total ATRs', required: true, parameterCode: 'total_atrs', min: 1 },
              { id: 'field_atrs_submitted_on_time', type: 'number', name: 'atrs_submitted_on_time', label: 'ATRs Submitted On Time', required: true, parameterCode: 'atrs_submitted_on_time', min: 0 }
            ]
          }
        ]),
        version: '1.0.0',
        is_active: isPG ? true : 1,
        created_by: 'system',
        updated_by: 'system',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      if (isPG) {
        await runAsync(db, `
          INSERT INTO form_templates (
            id, name, description, template_type, indicator_ids, sections, version, is_active, created_by, updated_by, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          template.id,
          template.name,
          template.description,
          template.template_type,
          template.indicator_ids,
          template.sections,
          template.version,
          template.is_active,
          template.created_by,
          template.updated_by,
          template.created_at,
          template.updated_at
        ]);
      } else {
        await runAsync(db, `
          INSERT INTO form_templates (
            id, name, description, template_type, indicator_ids, sections, version, is_active, created_by, updated_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          template.id,
          template.name,
          template.description,
          template.template_type,
          template.indicator_ids,
          template.sections,
          template.version,
          template.is_active,
          template.created_by,
          template.updated_by,
          template.created_at,
          template.updated_at
        ]);
      }
      
      console.log('✅ Created AIMS Assessment Form Template');
    }

    console.log('\n🎉 SUCCESS: All AIMS data seeded from official guideline!');
    console.log('✅ 5 Indicators created with parameters and scoring rules');
    console.log('✅ AIMS Assessment Form Template created');
    console.log('✅ Admin user: admin@acc.gov / admin123');
  } catch (error) {
    console.error('\n❌ FAILED to seed default data:', getErrorMessage(error));
    throw error;
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error occurred';
}

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================
export async function initializeDatabase() {
  try {
    console.log('\n🚀 Initializing AIMS Database...');
    console.log(`📊 Database type: ${usePostgres ? 'PostgreSQL' : 'SQLite'}`);
    
    await createTables();
    await initializeDefaultData();
    
    // Verify seeded data
    const db = getDB();
    const counts = {
      indicators: (await getAsync<{ count: number }>(db, 'SELECT COUNT(*) as count FROM indicators'))?.count || 0,
      templates: (await getAsync<{ count: number }>(db, 'SELECT COUNT(*) as count FROM form_templates'))?.count || 0,
      users: (await getAsync<{ count: number }>(db, 'SELECT COUNT(*) as count FROM users'))?.count || 0
    };
    
    console.log('\n✅ DATABASE INITIALIZATION COMPLETE');
    console.log(`📊 Seeded Data Summary:`);
    console.log(`   - Indicators: ${counts.indicators} (should be 5)`);
    console.log(`   - Form Templates: ${counts.templates} (should be 1)`);
    console.log(`   - Admin Users: ${counts.users} (should be 1)`);
    
    if (counts.indicators === 5 && counts.templates === 1 && counts.users === 1) {
      console.log('\n✨ READY FOR AIMS ASSESSMENT TESTING!');
      console.log('✅ Default admin: admin@acc.gov / admin123');
    } else {
      console.warn('\n⚠️ WARNING: Seeded data counts don\'t match expectations!');
      console.warn('   Please check console logs for errors during seeding');
    }
    
    return true;
  } catch (error) {
    console.error('\n💥 DATABASE INITIALIZATION FAILED:', getErrorMessage(error));
    return false;
  }
}

// Export minimal required functions
export default {
  getDB,
  runAsync,
  getAsync,
  allAsync,
  createTables,
  initializeDatabase,
  isUsingPostgres
};