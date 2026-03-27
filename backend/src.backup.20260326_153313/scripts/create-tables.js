// backend/src/scripts/create-tables.js
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
  updated_at TEXT NOT NULL,
  
  -- Indexes
  UNIQUE(code),
  INDEX idx_indicators_category (category),
  INDEX idx_indicators_active (is_active),
  INDEX idx_indicators_display_order (display_order)
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
  updated_at TEXT NOT NULL,
  
  -- Indexes
  UNIQUE(code),
  INDEX idx_templates_type (template_type),
  INDEX idx_templates_active (is_active)
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
  
  -- Foreign key and indexes
  FOREIGN KEY (template_id) REFERENCES form_templates(id) ON DELETE CASCADE,
  UNIQUE(template_id, version),
  INDEX idx_template_versions_template (template_id)
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
  applied_by TEXT,
  
  -- Indexes
  UNIQUE(version_number),
  INDEX idx_config_versions_active (is_active)
);

-- ==================== INDICATORS HISTORY TABLE ====================
CREATE TABLE IF NOT EXISTS indicators_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  indicator_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  data TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  changed_at TEXT NOT NULL,
  
  -- Foreign key and indexes
  FOREIGN KEY (indicator_id) REFERENCES indicators(id) ON DELETE CASCADE,
  UNIQUE(indicator_id, version),
  INDEX idx_indicators_history_indicator (indicator_id)
);

-- ==================== ASSESSMENTS TABLE (if not exists) ====================
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
  validated_by TEXT,
  
  -- Indexes
  UNIQUE(agency_id, fiscal_year),
  INDEX idx_assessments_agency (agency_id),
  INDEX idx_assessments_status (status)
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
  
  -- Foreign keys and indexes
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
  FOREIGN KEY (indicator_id) REFERENCES indicators(id) ON DELETE CASCADE,
  UNIQUE(assessment_id, indicator_id),
  INDEX idx_dynamic_responses_assessment (assessment_id),
  INDEX idx_dynamic_responses_indicator (indicator_id)
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
  
  -- Foreign key and indexes
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
  INDEX idx_indicator_responses_assessment (assessment_id)
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
  updated_at TEXT NOT NULL,
  
  -- Indexes
  UNIQUE(config_key),
  INDEX idx_system_config_category (category)
);

-- Insert default system config for AIMS thresholds
INSERT OR IGNORE INTO system_config (config_key, config_value, config_type, category, description, is_public, created_at, updated_at) VALUES
('high_integrity_min', '80', 'number', 'aims_thresholds', 'Minimum score for High Integrity Culture', 1, datetime('now'), datetime('now')),
('medium_integrity_min', '50', 'number', 'aims_thresholds', 'Minimum score for Medium Integrity Culture', 1, datetime('now'), datetime('now')),
('aims_version', '2025-Rev2', 'string', 'system', 'AIMS Implementation Guideline Version', 1, datetime('now'), datetime('now'));
`;

db.serialize(() => {
  db.exec(createTablesSQL, (err) => {
    if (err) {
      console.error('❌ Error creating tables:', err.message);
    } else {
      console.log('✅ Database tables created successfully!');
      
      // Verify tables were created
      db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", (err, tables) => {
        if (err) {
          console.error('❌ Error listing tables:', err.message);
        } else {
          console.log('\n📋 Tables created:');
          tables.forEach(table => {
            console.log(`   - ${table.name}`);
          });
          
          // Show table schemas
          console.log('\n📊 Table structures:');
          const importantTables = ['indicators', 'form_templates', 'assessments', 'dynamic_assessment_responses'];
          
          importantTables.forEach(tableName => {
            db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
              if (!err) {
                console.log(`\n${tableName}:`);
                columns.forEach(col => {
                  console.log(`   ${col.name} (${col.type})`);
                });
              }
            });
          });
          
          setTimeout(() => {
            console.log('\n' + '='.repeat(60));
            console.log('✅ DATABASE SETUP COMPLETE!');
            console.log('Now you can run: node src/scripts/seed-aims-templates.js');
            console.log('='.repeat(60));
            db.close();
          }, 1000);
        }
      });
    }
  });
});