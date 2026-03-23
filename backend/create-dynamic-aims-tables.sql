-- backend/create-dynamic-aims-tables.sql
-- COMPLETELY DYNAMIC AIMS DATABASE SCHEMA
-- Supports adding/modifying/deleting indicators, parameters, scoring rules, and forms at runtime
-- Run: sqlite3 aim-system.db < create-dynamic-aims-tables.sql

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;

-- ============================================================================
-- CORE SYSTEM TABLES (Static)
-- ============================================================================

-- Users table
DROP TABLE IF EXISTS users;
CREATE TABLE users (
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

-- Agencies table
DROP TABLE IF EXISTS agencies;
CREATE TABLE agencies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    sector TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- DYNAMIC CONFIGURATION TABLES (Fully Dynamic)
-- ============================================================================

-- Indicator categories (dynamic categories)
DROP TABLE IF EXISTS indicator_categories;
CREATE TABLE indicator_categories (
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

-- Indicators table (fully dynamic)
DROP TABLE IF EXISTS indicators;
CREATE TABLE indicators (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    
    -- Dynamic category reference
    category_id TEXT,
    
    -- Configuration that can change
    weight REAL DEFAULT 0 CHECK(weight >= 0 AND weight <= 100),
    max_score REAL DEFAULT 100,
    
    -- Scoring method (dynamic)
    scoring_method TEXT NOT NULL DEFAULT 'manual' CHECK(scoring_method IN (
        'manual', 'formula', 'percentage', 'weighted_sum', 
        'boolean_sum', 'range_based', 'custom'
    )),
    
    -- Data sources (dynamic JSON array)
    data_sources TEXT DEFAULT '[]',
    
    -- Assessment frequency (can change)
    assessment_frequency TEXT DEFAULT 'annual' CHECK(assessment_frequency IN (
        'annual', 'quarterly', 'semi_annual', 'monthly', 'custom'
    )),
    
    -- Status and display
    is_active BOOLEAN DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    version INTEGER DEFAULT 1,
    
    -- Audit
    created_by TEXT,
    updated_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (category_id) REFERENCES indicator_categories(id)
);

-- Parameter types (dynamic - can add new types)
DROP TABLE IF EXISTS parameter_types;
CREATE TABLE parameter_types (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    ui_component TEXT NOT NULL, -- 'Checkbox', 'NumberInput', 'Select', 'TextArea', etc.
    validation_rules TEXT DEFAULT '{}', -- JSON validation rules
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Parameter definitions (completely dynamic)
DROP TABLE IF EXISTS parameters;
CREATE TABLE parameters (
    id TEXT PRIMARY KEY,
    indicator_id TEXT NOT NULL,
    code TEXT NOT NULL,
    label TEXT NOT NULL,
    description TEXT,
    
    -- Dynamic type reference
    type_id TEXT NOT NULL,
    
    -- Validation (dynamic JSON)
    validation_config TEXT DEFAULT '{}',
    required BOOLEAN DEFAULT 0,
    default_value TEXT,
    
    -- Options for select/radio types (dynamic JSON)
    options TEXT DEFAULT '[]',
    
    -- UI settings (dynamic JSON)
    ui_settings TEXT DEFAULT '{}',
    
    -- Calculation configuration (for calculated parameters)
    calculation_config TEXT DEFAULT '{}',
    
    -- Display
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    
    -- Constraints
    UNIQUE(indicator_id, code),
    FOREIGN KEY (indicator_id) REFERENCES indicators(id) ON DELETE CASCADE,
    FOREIGN KEY (type_id) REFERENCES parameter_types(id)
);

-- Scoring rule types (dynamic)
DROP TABLE IF EXISTS scoring_rule_types;
CREATE TABLE scoring_rule_types (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    template TEXT, -- JSON template for rule configuration
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Scoring rules (completely dynamic)
DROP TABLE IF EXISTS scoring_rules;
CREATE TABLE scoring_rules (
    id TEXT PRIMARY KEY,
    indicator_id TEXT NOT NULL,
    
    -- Can be tied to a specific parameter or general
    parameter_id TEXT,
    
    -- Rule type (dynamic)
    rule_type_id TEXT NOT NULL,
    
    -- Rule configuration (dynamic JSON)
    rule_config TEXT NOT NULL DEFAULT '{}',
    
    -- Scoring
    points REAL NOT NULL,
    min_points REAL,
    max_points REAL,
    
    -- Conditions (for complex rules)
    condition TEXT,
    condition_type TEXT DEFAULT 'javascript' CHECK(condition_type IN (
        'javascript', 'formula', 'simple', 'custom'
    )),
    
    -- Description
    description TEXT,
    
    -- Display
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    
    -- Constraints
    FOREIGN KEY (indicator_id) REFERENCES indicators(id) ON DELETE CASCADE,
    FOREIGN KEY (parameter_id) REFERENCES parameters(id) ON DELETE CASCADE,
    FOREIGN KEY (rule_type_id) REFERENCES scoring_rule_types(id)
);

-- Formula definitions (for complex scoring)
DROP TABLE IF EXISTS scoring_formulas;
CREATE TABLE scoring_formulas (
    id TEXT PRIMARY KEY,
    indicator_id TEXT NOT NULL,
    name TEXT NOT NULL,
    formula TEXT NOT NULL, -- JavaScript or custom formula language
    variables TEXT NOT NULL DEFAULT '{}', -- JSON variable definitions
    description TEXT,
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (indicator_id) REFERENCES indicators(id) ON DELETE CASCADE
);

-- ============================================================================
-- DYNAMIC FORM TEMPLATE SYSTEM
-- ============================================================================

-- Form template types
DROP TABLE IF EXISTS form_template_types;
CREATE TABLE form_template_types (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Form templates (completely dynamic)
DROP TABLE IF EXISTS form_templates;
CREATE TABLE form_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    
    -- Dynamic type
    template_type_id TEXT NOT NULL,
    
    -- Configuration
    config JSON NOT NULL DEFAULT '{}', -- All configuration in one JSON field
    
    -- Versioning
    version TEXT DEFAULT '1.0.0',
    version_notes TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT 1,
    is_default BOOLEAN DEFAULT 0,
    
    -- Audit
    created_by TEXT,
    updated_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (template_type_id) REFERENCES form_template_types(id)
);

-- Form sections (dynamic structure)
DROP TABLE IF EXISTS form_sections;
CREATE TABLE form_sections (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL,
    parent_section_id TEXT, -- For nested sections
    
    title TEXT NOT NULL,
    description TEXT,
    
    -- Layout
    layout_type TEXT DEFAULT 'vertical' CHECK(layout_type IN (
        'vertical', 'horizontal', 'grid', 'tabs', 'accordion'
    )),
    columns INTEGER DEFAULT 1,
    
    -- Display
    display_order INTEGER DEFAULT 0,
    is_collapsible BOOLEAN DEFAULT 0,
    is_expanded BOOLEAN DEFAULT 1,
    
    -- Constraints
    FOREIGN KEY (template_id) REFERENCES form_templates(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_section_id) REFERENCES form_sections(id) ON DELETE CASCADE
);

-- Form fields (dynamic mapping to parameters)
DROP TABLE IF EXISTS form_fields;
CREATE TABLE form_fields (
    id TEXT PRIMARY KEY,
    section_id TEXT NOT NULL,
    parameter_id TEXT NOT NULL,
    
    -- Override settings (if different from parameter defaults)
    label_override TEXT,
    description_override TEXT,
    required_override BOOLEAN,
    ui_settings_override TEXT DEFAULT '{}',
    
    -- Display
    display_order INTEGER DEFAULT 0,
    column_span INTEGER DEFAULT 1,
    is_visible BOOLEAN DEFAULT 1,
    
    -- Validation
    validation_rules TEXT DEFAULT '{}',
    
    -- Dependencies (show/hide based on other fields)
    dependencies TEXT DEFAULT '{}',
    
    -- Constraints
    UNIQUE(section_id, parameter_id),
    FOREIGN KEY (section_id) REFERENCES form_sections(id) ON DELETE CASCADE,
    FOREIGN KEY (parameter_id) REFERENCES parameters(id) ON DELETE CASCADE
);

-- ============================================================================
-- ASSESSMENT SYSTEM (Dynamic)
-- ============================================================================

-- Assessments
DROP TABLE IF EXISTS assessments;
CREATE TABLE assessments (
    id TEXT PRIMARY KEY,
    agency_id TEXT NOT NULL,
    fiscal_year TEXT NOT NULL,
    
    -- Template used (can change over time)
    template_id TEXT,
    
    -- Status (dynamic workflow)
    status TEXT NOT NULL CHECK(status IN (
        'DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW',
        'RETURNED', 'APPROVED', 'REJECTED', 'ARCHIVED'
    )) DEFAULT 'DRAFT',
    
    -- Scores (calculated dynamically)
    overall_score REAL,
    integrity_level TEXT,
    
    -- Workflow
    assigned_to TEXT,
    submitted_by TEXT,
    submitted_at DATETIME,
    reviewed_by TEXT,
    reviewed_at DATETIME,
    approved_by TEXT,
    approved_at DATETIME,
    
    -- Metadata
    metadata TEXT DEFAULT '{}',
    
    -- Audit
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (agency_id) REFERENCES agencies(id),
    FOREIGN KEY (template_id) REFERENCES form_templates(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (submitted_by) REFERENCES users(id),
    FOREIGN KEY (reviewed_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Assessment responses (stores responses for ALL parameters dynamically)
DROP TABLE IF EXISTS assessment_responses;
CREATE TABLE assessment_responses (
    id TEXT PRIMARY KEY,
    assessment_id TEXT NOT NULL,
    parameter_id TEXT NOT NULL,
    
    -- Response value (stored as text, interpreted by parameter type)
    value TEXT,
    
    -- Files/attachments (JSON array of file metadata)
    attachments TEXT DEFAULT '[]',
    
    -- Calculated values (for formulas)
    calculated_value TEXT,
    calculated_score REAL,
    
    -- Manual overrides
    manual_score REAL,
    final_score REAL,
    
    -- Comments
    comments TEXT,
    
    -- Validation
    is_valid BOOLEAN DEFAULT 1,
    validation_errors TEXT DEFAULT '[]',
    
    -- Audit
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(assessment_id, parameter_id),
    FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
    FOREIGN KEY (parameter_id) REFERENCES parameters(id)
);

-- Assessment scores (calculated scores per indicator)
DROP TABLE IF EXISTS assessment_scores;
CREATE TABLE assessment_scores (
    id TEXT PRIMARY KEY,
    assessment_id TEXT NOT NULL,
    indicator_id TEXT NOT NULL,
    
    -- Scores
    calculated_score REAL,
    manual_score REAL,
    final_score REAL,
    
    -- Breakdown
    score_breakdown TEXT DEFAULT '{}', -- JSON breakdown by parameter/rule
    
    -- Status
    is_validated BOOLEAN DEFAULT 0,
    validated_by TEXT,
    validated_at DATETIME,
    
    -- Comments
    comments TEXT,
    
    -- Audit
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(assessment_id, indicator_id),
    FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
    FOREIGN KEY (indicator_id) REFERENCES indicators(id),
    FOREIGN KEY (validated_by) REFERENCES users(id)
);

-- ============================================================================
-- CONFIGURATION VERSIONING & HISTORY
-- ============================================================================

-- Configuration snapshots (for rollback)
DROP TABLE IF EXISTS configuration_snapshots;
CREATE TABLE configuration_snapshots (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version_number TEXT NOT NULL,
    description TEXT,
    
    -- Complete configuration snapshot
    snapshot_data TEXT NOT NULL, -- JSON containing all config
    
    -- Metadata
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    applied_at DATETIME,
    applied_by TEXT,
    is_active BOOLEAN DEFAULT 0,
    
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (applied_by) REFERENCES users(id)
);

-- Configuration changes audit log
DROP TABLE IF EXISTS configuration_changes;
CREATE TABLE configuration_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL CHECK(entity_type IN (
        'indicator', 'parameter', 'scoring_rule', 'form_template',
        'category', 'parameter_type', 'rule_type'
    )),
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('CREATE', 'UPDATE', 'DELETE', 'ACTIVATE', 'DEACTIVATE')),
    
    -- Change details
    changes TEXT NOT NULL, -- JSON diff of changes
    previous_state TEXT, -- JSON previous state
    new_state TEXT, -- JSON new state
    
    -- User and context
    changed_by TEXT NOT NULL,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    change_reason TEXT,
    
    FOREIGN KEY (changed_by) REFERENCES users(id)
);

-- ============================================================================
-- DEFAULT DYNAMIC DATA
-- ============================================================================

-- Insert default admin
INSERT OR IGNORE INTO users (id, name, email, password_hash, role, is_active) VALUES
('admin-001', 'System Administrator', 'admin@acc.gov', 
 '$2b$10$N9qo8uLOickgx2ZMRZoMye.Az5Z6QlR5R7HjR6Z2XgDpJQ1WcYbW2', 
 'system_admin', 1);

-- Insert default agencies
INSERT OR IGNORE INTO agencies (id, name, code, sector) VALUES
('agency-001', 'Ministry of Finance', 'MOF', 'Finance'),
('agency-002', 'Royal Civil Service Commission', 'RCSC', 'Administration'),
('agency-003', 'Anti-Corruption Commission', 'ACC', 'Integrity');

-- Insert dynamic categories (based on AIMS guideline but customizable)
INSERT OR IGNORE INTO indicator_categories (id, code, name, description, color, display_order) VALUES
('cat-integrity', 'INTEGRITY_PROMOTION', 'Integrity Promotion', 
 'Positive actions agencies take to prevent corruption', '#10B981', 1),
('cat-accountability', 'CORRUPTION_ACCOUNTABILITY', 'Corruption Accountability', 
 'Incidents of corruption or poor accountability in agencies', '#EF4444', 2),
('cat-capacity', 'CAPACITY_BUILDING', 'Capacity Building', 
 'Training and awareness programs', '#3B82F6', 3),
('cat-compliance', 'COMPLIANCE', 'Compliance', 
 'Adherence to rules and regulations', '#8B5CF6', 4);

-- Insert parameter types (extensible)
INSERT OR IGNORE INTO parameter_types (id, code, name, description, ui_component, validation_rules) VALUES
('type-bool', 'BOOLEAN', 'Yes/No', 'Boolean true/false field', 'Checkbox', '{"type": "boolean"}'),
('type-number', 'NUMBER', 'Number', 'Numeric input field', 'NumberInput', '{"type": "number", "min": 0}'),
('type-percent', 'PERCENTAGE', 'Percentage', 'Percentage field (0-100)', 'PercentageInput', '{"type": "number", "min": 0, "max": 100}'),
('type-select', 'SELECT', 'Dropdown', 'Single selection from options', 'Select', '{"type": "string"}'),
('type-text', 'TEXT', 'Text', 'Single line text input', 'TextInput', '{"type": "string", "maxLength": 255}'),
('type-textarea', 'TEXTAREA', 'Text Area', 'Multi-line text input', 'TextArea', '{"type": "string", "maxLength": 2000}'),
('type-date', 'DATE', 'Date', 'Date picker', 'DatePicker', '{"type": "date"}'),
('type-file', 'FILE', 'File Upload', 'File attachment', 'FileUpload', '{"type": "file", "maxSize": 10485760}');

-- Insert scoring rule types (extensible)
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

-- Insert initial AIMS indicators (as EXAMPLE - can be modified/deleted)
INSERT OR IGNORE INTO indicators (id, code, name, description, category_id, weight, max_score, scoring_method) VALUES
-- These are EXAMPLES that can be modified through ConfigPage
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

-- Insert sample parameters (EXAMPLE - can be modified)
INSERT OR IGNORE INTO parameters (id, indicator_id, code, label, description, type_id, required, display_order) VALUES
-- ICCS parameters
('param-1-1', 'ind-1', 'complaint_exists', 'Complaint System Exists', 
 'Does complaint system exist?', 'type-bool', 1, 1),
('param-1-2', 'ind-1', 'complaint_functions', 'Complaint System Functions', 
 'Does complaint system function?', 'type-bool', 1, 2),
('param-1-3', 'ind-1', 'conflict_exists', 'Conflict System Exists', 
 'Does conflict system exist?', 'type-bool', 1, 3),
('param-1-4', 'ind-1', 'conflict_functions', 'Conflict System Functions', 
 'Does conflict system function?', 'type-bool', 1, 4),
('param-1-5', 'ind-1', 'gift_exists', 'Gift Register Exists', 
 'Does gift register exist?', 'type-bool', 1, 5),
('param-1-6', 'ind-1', 'gift_functions', 'Gift Register Functions', 
 'Does gift register function?', 'type-bool', 1, 6),
('param-1-7', 'ind-1', 'proactive_level', 'Proactive Measures Level', 
 'Level of proactive measures', 'type-select', 1, 7),

-- Training parameters
('param-2-1', 'ind-2', 'total_employees', 'Total Employees', 
 'Total number of employees', 'type-number', 1, 1),
('param-2-2', 'ind-2', 'trained_employees', 'Trained Employees', 
 'Number of trained employees', 'type-number', 1, 2);

-- Insert sample scoring rules (EXAMPLE - can be modified)
INSERT OR IGNORE INTO scoring_rules (id, indicator_id, parameter_id, rule_type_id, rule_config, points, description) VALUES
-- Boolean rules for ICCS
('rule-1-1', 'ind-1', 'param-1-1', 'rule-boolean', '{"condition": "true"}', 3, 'Complaint system exists'),
('rule-1-2', 'ind-1', 'param-1-2', 'rule-boolean', '{"condition": "true"}', 4, 'Complaint system functions'),
('rule-1-7', 'ind-1', 'param-1-7', 'rule-custom', '{"logic": "if(value === \"full\") return 7; if(value === \"baseline\") return 3; return 0;"}', 0, 'Proactive measures scoring');

-- Insert sample form template (EXAMPLE - can be modified)
INSERT OR IGNORE INTO form_templates (id, name, description, template_type_id, config, is_default) VALUES
('tpl-default', 'Default AIMS Assessment', 'Complete AIMS assessment form', 'type-assessment', 
 '{"showProgress": true, "allowSaveDraft": true, "autoCalculate": true}', 1);

-- Insert initial configuration snapshot
INSERT OR IGNORE INTO configuration_snapshots (id, name, version_number, description, snapshot_data, created_by, is_active) VALUES
('snap-1', 'Initial Configuration', '1.0.0', 'Initial AIMS configuration',
 '{"timestamp": "' || CURRENT_TIMESTAMP || '", "indicators": 5, "parameters": 9, "rules": 3}', 'admin-001', 1);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

-- Agencies indexes
CREATE INDEX idx_agencies_code ON agencies(code);
CREATE INDEX idx_agencies_status ON agencies(status);

-- Indicators indexes
CREATE INDEX idx_indicators_category ON indicators(category_id);
CREATE INDEX idx_indicators_active ON indicators(is_active);
CREATE INDEX idx_indicators_order ON indicators(display_order);
CREATE INDEX idx_indicators_code ON indicators(code);

-- Parameters indexes
CREATE INDEX idx_params_indicator ON parameters(indicator_id);
CREATE INDEX idx_params_type ON parameters(type_id);
CREATE INDEX idx_params_active ON parameters(is_active);

-- Scoring rules indexes
CREATE INDEX idx_rules_indicator ON scoring_rules(indicator_id);
CREATE INDEX idx_rules_param ON scoring_rules(parameter_id);
CREATE INDEX idx_rules_type ON scoring_rules(rule_type_id);

-- Form templates indexes
CREATE INDEX idx_templates_type ON form_templates(template_type_id);
CREATE INDEX idx_templates_active ON form_templates(is_active);
CREATE INDEX idx_templates_default ON form_templates(is_default);

-- Form sections indexes
CREATE INDEX idx_sections_template ON form_sections(template_id);
CREATE INDEX idx_sections_parent ON form_sections(parent_section_id);
CREATE INDEX idx_sections_order ON form_sections(display_order);

-- Form fields indexes
CREATE INDEX idx_fields_section ON form_fields(section_id);
CREATE INDEX idx_fields_param ON form_fields(parameter_id);
CREATE INDEX idx_fields_order ON form_fields(display_order);

-- Assessments indexes
CREATE INDEX idx_assessments_agency ON assessments(agency_id);
CREATE INDEX idx_assessments_status ON assessments(status);
CREATE INDEX idx_assessments_template ON assessments(template_id);
CREATE INDEX idx_assessments_year ON assessments(fiscal_year);
CREATE INDEX idx_assessments_agency_year ON assessments(agency_id, fiscal_year);

-- Assessment responses indexes
CREATE INDEX idx_responses_assessment ON assessment_responses(assessment_id);
CREATE INDEX idx_responses_param ON assessment_responses(parameter_id);
CREATE INDEX idx_responses_assessment_param ON assessment_responses(assessment_id, parameter_id);

-- Assessment scores indexes
CREATE INDEX idx_scores_assessment ON assessment_scores(assessment_id);
CREATE INDEX idx_scores_indicator ON assessment_scores(indicator_id);

-- Configuration changes indexes
CREATE INDEX idx_changes_entity ON configuration_changes(entity_type, entity_id);
CREATE INDEX idx_changes_user ON configuration_changes(changed_by);
CREATE INDEX idx_changes_time ON configuration_changes(changed_at);

-- ============================================================================
-- VIEWS FOR EASIER QUERYING
-- ============================================================================

-- View for active indicators with categories
DROP VIEW IF EXISTS vw_active_indicators;
CREATE VIEW vw_active_indicators AS
SELECT 
    i.id, i.code, i.name, i.description,
    ic.name as category_name, ic.color as category_color,
    i.weight, i.max_score, i.scoring_method,
    i.display_order, i.version,
    COUNT(DISTINCT p.id) as parameter_count,
    COUNT(DISTINCT r.id) as rule_count
FROM indicators i
LEFT JOIN indicator_categories ic ON i.category_id = ic.id
LEFT JOIN parameters p ON i.id = p.indicator_id AND p.is_active = 1
LEFT JOIN scoring_rules r ON i.id = r.indicator_id AND r.is_active = 1
WHERE i.is_active = 1
GROUP BY i.id, i.code, i.name, i.description, ic.name, ic.color, 
         i.weight, i.max_score, i.scoring_method, i.display_order, i.version
ORDER BY i.display_order;

-- View for form templates with details
DROP VIEW IF EXISTS vw_form_templates;
CREATE VIEW vw_form_templates AS
SELECT 
    ft.id, ft.name, ft.description,
    ftt.name as template_type, ftt.icon,
    ft.version, ft.is_active, ft.is_default,
    COUNT(DISTINCT fs.id) as section_count,
    COUNT(DISTINCT ff.id) as field_count,
    ft.created_at, ft.updated_at
FROM form_templates ft
LEFT JOIN form_template_types ftt ON ft.template_type_id = ftt.id
LEFT JOIN form_sections fs ON ft.id = fs.template_id
LEFT JOIN form_fields ff ON fs.id = ff.section_id
GROUP BY ft.id, ft.name, ft.description, ftt.name, ftt.icon,
         ft.version, ft.is_active, ft.is_default, ft.created_at, ft.updated_at;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT '✅ DYNAMIC AIMS DATABASE CREATED SUCCESSFULLY' as status;

-- Show dynamic capabilities
SELECT '🔄 DYNAMIC FEATURES:' as features;
SELECT '  • Add/Remove indicators at runtime' as feature;
SELECT '  • Modify indicator weights and scoring methods' as feature;
SELECT '  • Create custom parameter types' as feature;
SELECT '  • Define custom scoring rules' as feature;
SELECT '  • Build forms visually through ConfigPage' as feature;
SELECT '  • Version and rollback configurations' as feature;
SELECT '  • Full audit trail of all changes' as feature;

-- Show initial data
SELECT '
📊 INITIAL DATA SUMMARY:' as summary;
SELECT 
    (SELECT COUNT(*) FROM indicator_categories) as categories,
    (SELECT COUNT(*) FROM indicators WHERE is_active = 1) as active_indicators,
    (SELECT COUNT(*) FROM parameter_types) as parameter_types,
    (SELECT COUNT(*) FROM scoring_rule_types) as rule_types,
    (SELECT COUNT(*) FROM form_template_types) as template_types,
    (SELECT COUNT(*) FROM configuration_snapshots) as snapshots;