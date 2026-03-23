-- Migration: Create configuration system tables
-- Date: 2024-01-01

-- 1. Indicators table
CREATE TABLE IF NOT EXISTS indicators (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL CHECK (category IN ('prevention', 'enforcement', 'education', 'custom')),
  max_points DECIMAL(5,2) NOT NULL DEFAULT 0,
  weight DECIMAL(5,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT 1,
  scoring_method VARCHAR(50) NOT NULL CHECK (scoring_method IN ('percentage', 'binary', 'weighted', 'threshold', 'custom')),
  
  -- Form configuration
  form_template_id VARCHAR(50),
  form_component VARCHAR(100),
  
  -- Metadata
  version INTEGER NOT NULL DEFAULT 1,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(100) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Parameters table
CREATE TABLE IF NOT EXISTS parameters (
  id VARCHAR(50) PRIMARY KEY,
  indicator_id VARCHAR(50) NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  label VARCHAR(200) NOT NULL,
  description TEXT,
  field_type VARCHAR(50) NOT NULL CHECK (field_type IN ('checkbox', 'number', 'radio', 'select', 'percentage', 'text', 'textarea', 'file')),
  
  -- Field options (stored as JSON)
  options TEXT,
  
  -- Default values
  default_value TEXT,
  placeholder VARCHAR(200),
  
  -- Validation rules (stored as JSON)
  validation TEXT NOT NULL,
  
  -- Conditional logic (stored as JSON)
  "condition" TEXT,
  
  -- UI settings (stored as JSON)
  ui_settings TEXT NOT NULL DEFAULT '{}',
  
  is_active BOOLEAN NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key
  FOREIGN KEY (indicator_id) REFERENCES indicators(id) ON DELETE CASCADE
);

-- 3. Extended scoring rules table
CREATE TABLE IF NOT EXISTS extended_scoring_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  indicator_id VARCHAR(50) NOT NULL,
  parameter_id VARCHAR(50),
  parameter_value TEXT,
  condition VARCHAR(50) NOT NULL CHECK (condition IN ('equals', 'greater_than', 'less_than', 'between', 'in', 'custom')),
  min_value DECIMAL(10,2),
  max_value DECIMAL(10,2),
  points DECIMAL(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  
  -- Complex scoring
  calculation_formula TEXT,
  depends_on TEXT, -- JSON array of parameter IDs
  
  is_active BOOLEAN NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (indicator_id) REFERENCES indicators(id) ON DELETE CASCADE,
  FOREIGN KEY (parameter_id) REFERENCES parameters(id) ON DELETE CASCADE
);

-- 4. Form templates table
CREATE TABLE IF NOT EXISTS form_templates (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  indicator_id VARCHAR(50) NOT NULL,
  
  -- Layout configuration (stored as JSON)
  layout_type VARCHAR(50) NOT NULL DEFAULT 'vertical' CHECK (layout_type IN ('vertical', 'horizontal', 'grid', 'tabs')),
  columns INTEGER DEFAULT 1,
  sections TEXT,
  
  -- UI configuration (stored as JSON)
  ui_config TEXT NOT NULL DEFAULT '{}',
  
  -- Versioning
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT 1,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(100) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key
  FOREIGN KEY (indicator_id) REFERENCES indicators(id) ON DELETE CASCADE
);

-- 5. Configuration versions table
CREATE TABLE IF NOT EXISTS configuration_versions (
  id VARCHAR(50) PRIMARY KEY,
  version_name VARCHAR(100) NOT NULL,
  version_number VARCHAR(20) NOT NULL, -- semantic versioning
  description TEXT,
  
  -- Snapshot (stored as JSON)
  indicators TEXT NOT NULL,
  parameters TEXT NOT NULL,
  scoring_rules TEXT NOT NULL,
  form_templates TEXT NOT NULL,
  
  -- Metadata
  is_active BOOLEAN NOT NULL DEFAULT 0,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  applied_at TIMESTAMP,
  applied_by VARCHAR(100)
);

-- 6. History tables for audit
CREATE TABLE IF NOT EXISTS indicators_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  indicator_id VARCHAR(50) NOT NULL,
  version INTEGER NOT NULL,
  data TEXT NOT NULL, -- JSON snapshot
  changed_by VARCHAR(100) NOT NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parameters_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parameter_id VARCHAR(50) NOT NULL,
  version INTEGER NOT NULL,
  data TEXT NOT NULL, -- JSON snapshot
  changed_by VARCHAR(100) NOT NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes separately to avoid transaction issues
CREATE INDEX IF NOT EXISTS idx_indicators_category ON indicators(category);
CREATE INDEX IF NOT EXISTS idx_indicators_active ON indicators(is_active);
CREATE INDEX IF NOT EXISTS idx_parameters_indicator ON parameters(indicator_id);
CREATE INDEX IF NOT EXISTS idx_parameters_order ON parameters(indicator_id, "order");
CREATE INDEX IF NOT EXISTS idx_extended_scoring_rules_indicator ON extended_scoring_rules(indicator_id);
CREATE INDEX IF NOT EXISTS idx_extended_scoring_rules_parameter ON extended_scoring_rules(parameter_id);
CREATE INDEX IF NOT EXISTS idx_form_templates_indicator ON form_templates(indicator_id);
CREATE INDEX IF NOT EXISTS idx_form_templates_active ON form_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_config_versions_active ON configuration_versions(is_active);
CREATE INDEX IF NOT EXISTS idx_config_versions_number ON configuration_versions(version_number);
CREATE INDEX IF NOT EXISTS idx_indicators_history ON indicators_history(indicator_id, version);
CREATE INDEX IF NOT EXISTS idx_parameters_history ON parameters_history(parameter_id, version);

-- Insert default indicators from existing system
INSERT INTO indicators (id, name, description, category, max_points, weight, scoring_method, created_by, updated_by)
VALUES 
  ('iccs', 'Internal Corruption Control Systems (ICCS)', 'Functioning of the agency''s four core integrity systems', 'prevention', 28, 28, 'weighted', 'system', 'system'),
  ('training', 'Integrity Capacity Building', 'Staff Training & Awareness + ACC''s e-Learning Completion', 'education', 26, 26, 'percentage', 'system', 'system'),
  ('ad', 'Asset Declaration Compliance', 'Percentage of covered officials submitting Asset Declarations on time', 'prevention', 16, 16, 'percentage', 'system', 'system'),
  ('cases', 'Corruption Case Severity & Resolution', 'Weighted severity of corruption cases involving agency staff', 'enforcement', 20, 20, 'weighted', 'system', 'system'),
  ('atr', 'ATR Responsiveness', 'Percentage of ATRs submitted by agency within ACC''s deadlines', 'enforcement', 10, 10, 'percentage', 'system', 'system');

-- Create initial configuration version
INSERT INTO configuration_versions (id, version_name, version_number, description, indicators, parameters, scoring_rules, form_templates, is_active, created_by)
VALUES (
  'initial-v1',
  'Initial Configuration',
  '1.0.0',
  'Initial configuration with 5 default indicators',
  '[]',
  '[]',
  '[]',
  '[]',
  1,
  'system'
);

-- Create a view for scoring rules to combine existing and extended
CREATE VIEW IF NOT EXISTS v_scoring_rules AS
SELECT 
  sr.id,
  sr.indicator_id,
  NULL as parameter_id,
  NULL as parameter_value,
  sr.condition,
  sr.min_value,
  sr.max_value,
  sr.points,
  sr.description,
  NULL as calculation_formula,
  NULL as depends_on,
  sr.is_active,
  sr.created_at,
  sr.updated_at
FROM scoring_rules sr
UNION ALL
SELECT 
  esr.id + 1000000 as id, -- Offset to avoid ID conflicts
  esr.indicator_id,
  esr.parameter_id,
  esr.parameter_value,
  esr.condition,
  esr.min_value,
  esr.max_value,
  esr.points,
  esr.description,
  esr.calculation_formula,
  esr.depends_on,
  esr.is_active,
  esr.created_at,
  esr.updated_at
FROM extended_scoring_rules esr;
