// backend/src/scripts/create-tables-fixed.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../aim-system.db');
const db = new sqlite3.Database(dbPath);

console.log('🏗️  Creating database tables for aim-system.db...');

const createTablesSQL = `
-- ==================== INDICATORS TABLE ====================
CREATE TABLE IF NOT EXISTS indicators (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 0,
  max_score REAL NOT NULL DEFAULT 100,
  scoring_method TEXT NOT NULL DEFAULT 'sum',
  formula TEXT,
  parameters TEXT NOT NULL DEFAULT '[]',
  scoring_rules TEXT NOT NULL DEFAULT '[]',
  ui_config TEXT NOT NULL DEFAULT '{}',
  is_active INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  metadata TEXT NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- ==================== FORM TEMPLATES TABLE ====================
CREATE TABLE IF NOT EXISTS form_templates (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL,
  indicator_ids TEXT NOT NULL DEFAULT '[]',
  sections TEXT NOT NULL DEFAULT '[]',
  validation_rules TEXT NOT NULL DEFAULT '{}',
  ui_config TEXT NOT NULL DEFAULT '{}',
  version TEXT NOT NULL DEFAULT '1.0.0',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- ==================== TEMPLATE VERSIONS TABLE ====================
CREATE TABLE IF NOT EXISTS template_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  template_data TEXT NOT NULL,
  description TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (template_id) REFERENCES form_templates(id) ON DELETE CASCADE
);

-- ==================== CONFIGURATION VERSIONS TABLE ====================
CREATE TABLE IF NOT EXISTS configuration_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version_name TEXT NOT NULL,
  version_number TEXT NOT NULL,
  description TEXT,
  indicators TEXT NOT NULL DEFAULT '[]',
  parameters TEXT NOT NULL DEFAULT '[]',
  scoring_rules TEXT NOT NULL DEFAULT '[]',
  form_templates TEXT NOT NULL DEFAULT '[]',
  is_active INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  applied_at TEXT,
  applied_by TEXT
);

-- ==================== INDICATORS HISTORY TABLE ====================
CREATE TABLE IF NOT EXISTS indicators_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  indicator_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  data TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  changed_at TEXT NOT NULL,
  FOREIGN KEY (indicator_id) REFERENCES indicators(id) ON DELETE CASCADE
);

-- ==================== ASSESSMENTS TABLE ====================
CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY,
  agency_id TEXT NOT NULL,
  fiscal_year TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'NOT_STARTED',
  overall_score REAL,
  officer_remarks TEXT,
  assigned_officer_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  submitted_at TEXT,
  validated_at TEXT,
  validated_by TEXT
);

-- ==================== DYNAMIC ASSESSMENT RESPONSES TABLE ====================
CREATE TABLE IF NOT EXISTS dynamic_assessment_responses (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL,
  indicator_id TEXT NOT NULL,
  response_data TEXT NOT NULL DEFAULT '{}',
  calculated_score REAL,
  manual_score REAL,
  final_score REAL NOT NULL DEFAULT 0,
  evidence_files TEXT NOT NULL DEFAULT '[]',
  comments TEXT,
  validated_by TEXT,
  validated_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
  FOREIGN KEY (indicator_id) REFERENCES indicators(id) ON DELETE CASCADE
);

-- ==================== LEGACY INDICATOR RESPONSES TABLE ====================
CREATE TABLE IF NOT EXISTS indicator_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assessment_id TEXT NOT NULL,
  indicator_number INTEGER NOT NULL,
  indicator_name TEXT NOT NULL,
  score REAL NOT NULL,
  comments TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
);

-- ==================== SYSTEM CONFIG TABLE ====================
CREATE TABLE IF NOT EXISTS system_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  config_key TEXT UNIQUE NOT NULL,
  config_value TEXT NOT NULL,
  config_type TEXT NOT NULL DEFAULT 'string',
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  is_public INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Insert default system config for AIMS thresholds
INSERT OR IGNORE INTO system_config (config_key, config_value, config_type, category, description, is_public, created_at, updated_at) VALUES
('high_integrity_min', '80', 'number', 'aims_thresholds', 'Minimum score for High Integrity Culture', 1, datetime('now'), datetime('now')),
('medium_integrity_min', '50', 'number', 'aims_thresholds', 'Minimum score for Medium Integrity Culture', 1, datetime('now'), datetime('now')),
('aims_version', '2025-Rev2', 'string', 'system', 'AIMS Implementation Guideline Version', 1, datetime('now'), datetime('now'));
`;

// Create indexes separately
const createIndexesSQL = `
-- Indicators indexes
CREATE INDEX IF NOT EXISTS idx_indicators_category ON indicators(category);
CREATE INDEX IF NOT EXISTS idx_indicators_active ON indicators(is_active);
CREATE INDEX IF NOT EXISTS idx_indicators_display_order ON indicators(display_order);

-- Form templates indexes
CREATE INDEX IF NOT EXISTS idx_templates_type ON form_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_templates_active ON form_templates(is_active);

-- Template versions indexes
CREATE INDEX IF NOT EXISTS idx_template_versions_template ON template_versions(template_id);

-- Configuration versions indexes
CREATE INDEX IF NOT EXISTS idx_config_versions_active ON configuration_versions(is_active);

-- Indicators history indexes
CREATE INDEX IF NOT EXISTS idx_indicators_history_indicator ON indicators_history(indicator_id);

-- Assessments indexes
CREATE INDEX IF NOT EXISTS idx_assessments_agency ON assessments(agency_id);
CREATE INDEX IF NOT EXISTS idx_assessments_status ON assessments(status);

-- Dynamic assessment responses indexes
CREATE INDEX IF NOT EXISTS idx_dynamic_responses_assessment ON dynamic_assessment_responses(assessment_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_responses_indicator ON dynamic_assessment_responses(indicator_id);

-- Legacy indicator responses indexes
CREATE INDEX IF NOT EXISTS idx_indicator_responses_assessment ON indicator_responses(assessment_id);

-- System config indexes
CREATE INDEX IF NOT EXISTS idx_system_config_category ON system_config(category);

-- Unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_assessments_agency_year ON assessments(agency_id, fiscal_year);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_dynamic_responses_assessment_indicator ON dynamic_assessment_responses(assessment_id, indicator_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_template_versions_template_version ON template_versions(template_id, version);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_indicators_history_indicator_version ON indicators_history(indicator_id, version);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_config_versions_number ON configuration_versions(version_number);
`;

db.serialize(() => {
  // Create tables
  db.exec(createTablesSQL, (err) => {
    if (err) {
      console.error('❌ Error creating tables:', err.message);
      db.close();
      return;
    }
    
    console.log('✅ Tables created successfully!');
    
    // Create indexes
    db.exec(createIndexesSQL, (err) => {
      if (err) {
        console.error('⚠️  Error creating indexes:', err.message);
        // Continue anyway
      } else {
        console.log('✅ Indexes created successfully!');
      }
      
      // Verify tables were created
      db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", (err, tables) => {
        if (err) {
          console.error('❌ Error listing tables:', err.message);
        } else {
          console.log('\n📋 Tables in database:');
          tables.forEach(table => {
            console.log(`   - ${table.name}`);
          });
        }
        
        // Show counts for key tables
        console.log('\n📊 Table row counts:');
        const keyTables = ['indicators', 'form_templates', 'system_config'];
        
        keyTables.forEach((tableName, index) => {
          db.get(`SELECT COUNT(*) as count FROM ${tableName}`, (err, row) => {
            if (!err) {
              console.log(`   ${tableName}: ${row.count} rows`);
            }
            
            if (index === keyTables.length - 1) {
              console.log('\n' + '='.repeat(60));
              console.log('✅ DATABASE SETUP COMPLETE!');
              console.log('Now you can run: node src/scripts/seed-aims-templates.js');
              console.log('='.repeat(60));
              db.close();
            }
          });
        });
      });
    });
  });
});