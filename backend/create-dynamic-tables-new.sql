-- backend/create-dynamic-tables-new.sql
-- This script handles existing tables gracefully

PRAGMA foreign_keys = OFF; -- Temporarily disable foreign keys

-- ============================================================================
-- DROP EXISTING TABLES (if they exist) - Comment out if you want to keep data
-- ============================================================================

-- First drop tables that depend on others (reverse order)
DROP TABLE IF EXISTS configuration_changes;
DROP TABLE IF EXISTS assessment_scores;
DROP TABLE IF EXISTS assessment_responses;
DROP TABLE IF EXISTS assessments;
DROP TABLE IF EXISTS form_fields;
DROP TABLE IF EXISTS form_sections;
DROP TABLE IF EXISTS form_templates;
DROP TABLE IF EXISTS scoring_rules;
DROP TABLE IF EXISTS scoring_formulas;
DROP TABLE IF EXISTS parameters;
DROP TABLE IF EXISTS indicators;
DROP TABLE IF EXISTS configuration_snapshots;
DROP TABLE IF EXISTS scoring_rule_types;
DROP TABLE IF EXISTS parameter_types;
DROP TABLE IF EXISTS indicator_categories;
DROP TABLE IF EXISTS form_template_types;

-- Keep users and agencies tables if they exist and have data
-- DROP TABLE IF EXISTS agencies;
-- DROP TABLE IF EXISTS users;

-- ============================================================================
-- CREATE NEW TABLES
-- ============================================================================

-- Users table (keep if exists, otherwise create)
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
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Agencies table (keep if exists, otherwise create)
CREATE TABLE IF NOT EXISTS agencies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    sector TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indicator categories
CREATE TABLE IF NOT EXISTS indicator_categories (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3B82F6',
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indicators table
CREATE TABLE IF NOT EXISTS indicators (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category_id TEXT,
    weight REAL DEFAULT 0 CHECK(weight >= 0 AND weight <= 100),
    max_score REAL DEFAULT 100,
    scoring_method TEXT NOT NULL DEFAULT 'manual' CHECK(scoring_method IN (
        'manual', 'formula', 'percentage', 'weighted_sum', 
        'boolean_sum', 'range_based', 'custom'
    )),
    data_sources TEXT DEFAULT '[]',
    assessment_frequency TEXT DEFAULT 'annual' CHECK(assessment_frequency IN (
        'annual', 'quarterly', 'semi_annual', 'monthly', 'custom'
    )),
    is_active BOOLEAN DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    version INTEGER DEFAULT 1,
    created_by TEXT,
    updated_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES indicator_categories(id)
);

-- Parameter types
CREATE TABLE IF NOT EXISTS parameter_types (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    ui_component TEXT NOT NULL,
    validation_rules TEXT DEFAULT '{}',
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Parameters
CREATE TABLE IF NOT EXISTS parameters (
    id TEXT PRIMARY KEY,
    indicator_id TEXT NOT NULL,
    code TEXT NOT NULL,
    label TEXT NOT NULL,
    description TEXT,
    type_id TEXT NOT NULL,
    validation_config TEXT DEFAULT '{}',
    required BOOLEAN DEFAULT 0,
    default_value TEXT,
    options TEXT DEFAULT '[]',
    ui_settings TEXT DEFAULT '{}',
    calculation_config TEXT DEFAULT '{}',
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    UNIQUE(indicator_id, code),
    FOREIGN KEY (indicator_id) REFERENCES indicators(id) ON DELETE CASCADE,
    FOREIGN KEY (type_id) REFERENCES parameter_types(id)
);

-- Scoring rule types
CREATE TABLE IF NOT EXISTS scoring_rule_types (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    template TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Scoring rules
CREATE TABLE IF NOT EXISTS scoring_rules (
    id TEXT PRIMARY KEY,
    indicator_id TEXT NOT NULL,
    parameter_id TEXT,
    rule_type_id TEXT NOT NULL,
    rule_config TEXT NOT NULL DEFAULT '{}',
    points REAL NOT NULL,
    min_points REAL,
    max_points REAL,
    condition TEXT,
    condition_type TEXT DEFAULT 'javascript' CHECK(condition_type IN (
        'javascript', 'formula', 'simple', 'custom'
    )),
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY (indicator_id) REFERENCES indicators(id) ON DELETE CASCADE,
    FOREIGN KEY (parameter_id) REFERENCES parameters(id) ON DELETE CASCADE,
    FOREIGN KEY (rule_type_id) REFERENCES scoring_rule_types(id)
);

-- Scoring formulas
CREATE TABLE IF NOT EXISTS scoring_formulas (
    id TEXT PRIMARY KEY,
    indicator_id TEXT NOT NULL,
    name TEXT NOT NULL,
    formula TEXT NOT NULL,
    variables TEXT NOT NULL DEFAULT '{}',
    description TEXT,
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (indicator_id) REFERENCES indicators(id) ON DELETE CASCADE
);

-- Form template types
CREATE TABLE IF NOT EXISTS form_template_types (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Form templates
CREATE TABLE IF NOT EXISTS form_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    template_type_id TEXT NOT NULL,
    config TEXT NOT NULL DEFAULT '{}',
    version TEXT DEFAULT '1.0.0',
    version_notes TEXT,
    is_active BOOLEAN DEFAULT 1,
    is_default BOOLEAN DEFAULT 0,
    created_by TEXT,
    updated_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (template_type_id) REFERENCES form_template_types(id)
);

-- Form sections
CREATE TABLE IF NOT EXISTS form_sections (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL,
    parent_section_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    layout_type TEXT DEFAULT 'vertical' CHECK(layout_type IN (
        'vertical', 'horizontal', 'grid', 'tabs', 'accordion'
    )),
    columns INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    is_collapsible BOOLEAN DEFAULT 0,
    is_expanded BOOLEAN DEFAULT 1,
    FOREIGN KEY (template_id) REFERENCES form_templates(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_section_id) REFERENCES form_sections(id) ON DELETE CASCADE
);

-- Form fields
CREATE TABLE IF NOT EXISTS form_fields (
    id TEXT PRIMARY KEY,
    section_id TEXT NOT NULL,
    parameter_id TEXT NOT NULL,
    label_override TEXT,
    description_override TEXT,
    required_override BOOLEAN,
    ui_settings_override TEXT DEFAULT '{}',
    display_order INTEGER DEFAULT 0,
    column_span INTEGER DEFAULT 1,
    is_visible BOOLEAN DEFAULT 1,
    validation_rules TEXT DEFAULT '{}',
    dependencies TEXT DEFAULT '{}',
    UNIQUE(section_id, parameter_id),
    FOREIGN KEY (section_id) REFERENCES form_sections(id) ON DELETE CASCADE,
    FOREIGN KEY (parameter_id) REFERENCES parameters(id) ON DELETE CASCADE
);

-- Assessments
CREATE TABLE IF NOT EXISTS assessments (
    id TEXT PRIMARY KEY,
    agency_id TEXT NOT NULL,
    fiscal_year TEXT NOT NULL,
    template_id TEXT,
    status TEXT NOT NULL CHECK(status IN (
        'DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW',
        'RETURNED', 'APPROVED', 'REJECTED', 'ARCHIVED'
    )) DEFAULT 'DRAFT',
    overall_score REAL,
    integrity_level TEXT,
    assigned_to TEXT,
    submitted_by TEXT,
    submitted_at DATETIME,
    reviewed_by TEXT,
    reviewed_at DATETIME,
    approved_by TEXT,
    approved_at DATETIME,
    metadata TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agency_id) REFERENCES agencies(id),
    FOREIGN KEY (template_id) REFERENCES form_templates(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (submitted_by) REFERENCES users(id),
    FOREIGN KEY (reviewed_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Assessment responses
CREATE TABLE IF NOT EXISTS assessment_responses (
    id TEXT PRIMARY KEY,
    assessment_id TEXT NOT NULL,
    parameter_id TEXT NOT NULL,
    value TEXT,
    attachments TEXT DEFAULT '[]',
    calculated_value TEXT,
    calculated_score REAL,
    manual_score REAL,
    final_score REAL,
    comments TEXT,
    is_valid BOOLEAN DEFAULT 1,
    validation_errors TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assessment_id, parameter_id),
    FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
    FOREIGN KEY (parameter_id) REFERENCES parameters(id)
);

-- Assessment scores
CREATE TABLE IF NOT EXISTS assessment_scores (
    id TEXT PRIMARY KEY,
    assessment_id TEXT NOT NULL,
    indicator_id TEXT NOT NULL,
    calculated_score REAL,
    manual_score REAL,
    final_score REAL,
    score_breakdown TEXT DEFAULT '{}',
    is_validated BOOLEAN DEFAULT 0,
    validated_by TEXT,
    validated_at DATETIME,
    comments TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assessment_id, indicator_id),
    FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
    FOREIGN KEY (indicator_id) REFERENCES indicators(id),
    FOREIGN KEY (validated_by) REFERENCES users(id)
);

-- Configuration snapshots
CREATE TABLE IF NOT EXISTS configuration_snapshots (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version_number TEXT NOT NULL,
    description TEXT,
    snapshot_data TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    applied_at DATETIME,
    applied_by TEXT,
    is_active BOOLEAN DEFAULT 0,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (applied_by) REFERENCES users(id)
);

-- Configuration changes
CREATE TABLE IF NOT EXISTS configuration_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL CHECK(entity_type IN (
        'indicator', 'parameter', 'scoring_rule', 'form_template',
        'category', 'parameter_type', 'rule_type'
    )),
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('CREATE', 'UPDATE', 'DELETE', 'ACTIVATE', 'DEACTIVATE')),
    changes TEXT NOT NULL,
    previous_state TEXT,
    new_state TEXT,
    changed_by TEXT NOT NULL,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    change_reason TEXT,
    FOREIGN KEY (changed_by) REFERENCES users(id)
);

PRAGMA foreign_keys = ON; -- Re-enable foreign keys

-- ============================================================================
-- INSERT DEFAULT DATA
-- ============================================================================

-- Insert default admin if not exists
INSERT OR IGNORE INTO users (id, name, email, password_hash, role, is_active) VALUES
('admin-001', 'System Administrator', 'admin@acc.gov', 
 '$2b$10$N9qo8uLOickgx2ZMRZoMye.Az5Z6QlR5R7HjR6Z2XgDpJQ1WcYbW2', 
 'system_admin', 1);

-- Insert default agencies
INSERT OR IGNORE INTO agencies (id, name, code, sector) VALUES
('agency-001', 'Ministry of Finance', 'MOF', 'Finance'),
('agency-002', 'Royal Civil Service Commission', 'RCSC', 'Administration'),
('agency-003', 'Anti-Corruption Commission', 'ACC', 'Integrity');

-- Insert dynamic categories
INSERT OR IGNORE INTO indicator_categories (id, code, name, description, color, display_order) VALUES
('cat-integrity', 'INTEGRITY_PROMOTION', 'Integrity Promotion', 
 'Positive actions agencies take to prevent corruption', '#10B981', 1),
('cat-accountability', 'CORRUPTION_ACCOUNTABILITY', 'Corruption Accountability', 
 'Incidents of corruption or poor accountability in agencies', '#EF4444', 2),
('cat-capacity', 'CAPACITY_BUILDING', 'Capacity Building', 
 'Training and awareness programs', '#3B82F6', 3),
('cat-compliance', 'COMPLIANCE', 'Compliance', 
 'Adherence to rules and regulations', '#8B5CF6', 4);

-- Insert parameter types
INSERT OR IGNORE INTO parameter_types (id, code, name, description, ui_component, validation_rules) VALUES
('type-bool', 'BOOLEAN', 'Yes/No', 'Boolean true/false field', 'Checkbox', '{"type": "boolean"}'),
('type-number', 'NUMBER', 'Number', 'Numeric input field', 'NumberInput', '{"type": "number", "min": 0}'),
('type-percent', 'PERCENTAGE', 'Percentage', 'Percentage field (0-100)', 'PercentageInput', '{"type": "number", "min": 0, "max": 100}'),
('type-select', 'SELECT', 'Dropdown', 'Single selection from options', 'Select', '{"type": "string"}'),
('type-text', 'TEXT', 'Text', 'Single line text input', 'TextInput', '{"type": "string", "maxLength": 255}'),
('type-textarea', 'TEXTAREA', 'Text Area', 'Multi-line text input', 'TextArea', '{"type": "string", "maxLength": 2000}'),
('type-date', 'DATE', 'Date', 'Date picker', 'DatePicker', '{"type": "date"}'),
('type-file', 'FILE', 'File Upload', 'File attachment', 'FileUpload', '{"type": "file", "maxSize": 10485760}');

-- Insert scoring rule types
INSERT OR IGNORE INTO scoring_rule_types (id, code, name, description, template) VALUES
('rule-boolean', 'BOOLEAN', 'Boolean Rule', 'Score based on true/false value', '{"condition": "boolean", "points": "number"}'),
('rule-range', 'RANGE', 'Range Rule', 'Score based on value range', '{"min": "number", "max": "number", "points": "number"}'),
('rule-threshold', 'THRESHOLD', 'Threshold Rule', 'Score based on minimum threshold', '{"threshold": "number", "points": "number", "operator": "string"}'),
('rule-percentage', 'PERCENTAGE', 'Percentage Rule', 'Score based on percentage ranges', '{"ranges": [{"min": "number", "max": "number", "points": "number"}]}'),
('rule-formula', 'FORMULA', 'Formula Rule', 'Score calculated by formula', '{"formula": "string", "variables": "object"}'),
('rule-custom', 'CUSTOM', 'Custom Rule', 'Custom scoring logic', '{"logic": "string"}');

-- Insert form template types
INSERT OR IGNORE INTO form_template_types (id, code, name, description, icon) VALUES
('type-assessment', 'ASSESSMENT', 'Assessment Form', 'Complete assessment form', 'DocumentText'),
('type-test', 'TEST', 'Test Form', 'Testing and validation form', 'Beaker'),
('type-report', 'REPORT', 'Report Template', 'Reporting template', 'ChartBar'),
('type-custom', 'CUSTOM', 'Custom Form', 'Custom form template', 'Cog');

-- Insert initial AIMS indicators
INSERT OR IGNORE INTO indicators (id, code, name, description, category_id, weight, max_score, scoring_method) VALUES
('ind-1', 'ICCS', 'Internal Corruption Control Systems', 
 'Functioning of integrity systems', 'cat-integrity', 28, 28, 'boolean_sum'),
('ind-2', 'TRAINING', 'Integrity Capacity Building', 
 'Staff training completion', 'cat-capacity', 26, 26, 'percentage'),
('ind-3', 'AD_COMPLIANCE', 'Asset Declaration Compliance', 
 'AD submission compliance', 'cat-compliance', 16, 16, 'percentage'),
('ind-4', 'CASES', 'Corruption Case Severity', 
 'Case severity and resolution', 'cat-accountability', 20, 20, 'weighted_sum'),
('ind-5', 'ATR', 'ATR Responsiveness', 
 'ATR submission timeliness', 'cat-compliance', 10, 10, 'percentage');

-- Insert sample parameters
INSERT OR IGNORE INTO parameters (id, indicator_id, code, label, description, type_id, required, display_order) VALUES
('param-1-1', 'ind-1', 'complaint_exists', 'Complaint System Exists', 'Does complaint system exist?', 'type-bool', 1, 1),
('param-1-2', 'ind-1', 'complaint_functions', 'Complaint System Functions', 'Does complaint system function?', 'type-bool', 1, 2),
('param-1-3', 'ind-1', 'conflict_exists', 'Conflict System Exists', 'Does conflict system exist?', 'type-bool', 1, 3),
('param-1-4', 'ind-1', 'conflict_functions', 'Conflict System Functions', 'Does conflict system function?', 'type-bool', 1, 4),
('param-1-5', 'ind-1', 'gift_exists', 'Gift Register Exists', 'Does gift register exist?', 'type-bool', 1, 5),
('param-1-6', 'ind-1', 'gift_functions', 'Gift Register Functions', 'Does gift register function?', 'type-bool', 1, 6),
('param-1-7', 'ind-1', 'proactive_level', 'Proactive Measures Level', 'Level of proactive measures', 'type-select', 1, 7),
('param-2-1', 'ind-2', 'total_employees', 'Total Employees', 'Total number of employees', 'type-number', 1, 1),
('param-2-2', 'ind-2', 'trained_employees', 'Trained Employees', 'Number of trained employees', 'type-number', 1, 2);

-- Insert sample scoring rules
INSERT OR IGNORE INTO scoring_rules (id, indicator_id, parameter_id, rule_type_id, rule_config, points, description) VALUES
('rule-1-1', 'ind-1', 'param-1-1', 'rule-boolean', '{"condition": "true"}', 3, 'Complaint system exists'),
('rule-1-2', 'ind-1', 'param-1-2', 'rule-boolean', '{"condition": "true"}', 4, 'Complaint system functions'),
('rule-1-7', 'ind-1', 'param-1-7', 'rule-custom', '{"logic": "if(value === \"full\") return 7; if(value === \"baseline\") return 3; return 0;"}', 0, 'Proactive measures scoring');

-- Insert sample form template
INSERT OR IGNORE INTO form_templates (id, name, description, template_type_id, config, is_default) VALUES
('tpl-default', 'Default AIMS Assessment', 'Complete AIMS assessment form', 'type-assessment', 
 '{"showProgress": true, "allowSaveDraft": true, "autoCalculate": true}', 1);

-- Insert initial configuration snapshot
INSERT OR IGNORE INTO configuration_snapshots (id, name, version_number, description, snapshot_data, created_by, is_active) VALUES
('snap-1', 'Initial Configuration', '1.0.0', 'Initial AIMS configuration',
 '{"timestamp": "' || CURRENT_TIMESTAMP || '", "indicators": 5, "parameters": 9, "rules": 3}', 'admin-001', 1);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT '✅ DATABASE SETUP COMPLETE' as status;
SELECT '📊 Current tables:' as tables;
SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;