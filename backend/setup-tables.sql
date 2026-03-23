-- setup-tables.sql
-- Dynamic AIMS Configuration Tables

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- ============================================================================
-- 1. CORE DYNAMIC TABLES
-- ============================================================================

-- Indicator Categories - for grouping indicators
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

-- Indicators - the main scoring components (can be added/modified/deleted)
CREATE TABLE IF NOT EXISTS indicators (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category_id TEXT,
    weight REAL DEFAULT 0,
    max_score REAL DEFAULT 100,
    scoring_method TEXT DEFAULT 'manual',
    is_active BOOLEAN DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    version INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES indicator_categories(id)
);

-- Parameters - data points for each indicator (fully dynamic)
CREATE TABLE IF NOT EXISTS parameters (
    id TEXT PRIMARY KEY,
    indicator_id TEXT NOT NULL,
    code TEXT NOT NULL,
    label TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    required BOOLEAN DEFAULT 0,
    options TEXT DEFAULT '[]',
    validation_config TEXT DEFAULT '{}',
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(indicator_id, code),
    FOREIGN KEY (indicator_id) REFERENCES indicators(id) ON DELETE CASCADE
);

-- Scoring Rules - how parameters are scored (dynamic)
CREATE TABLE IF NOT EXISTS scoring_rules (
    id TEXT PRIMARY KEY,
    indicator_id TEXT NOT NULL,
    parameter_code TEXT,
    rule_type TEXT NOT NULL,
    condition TEXT,
    min_value REAL,
    max_value REAL,
    points REAL NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (indicator_id) REFERENCES indicators(id) ON DELETE CASCADE
);

-- ============================================================================
-- 2. FORM TEMPLATES (Dynamic Forms)
-- ============================================================================

CREATE TABLE IF NOT EXISTS form_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    template_type TEXT NOT NULL,
    indicator_ids TEXT DEFAULT '[]',
    sections TEXT NOT NULL DEFAULT '[]',
    config TEXT DEFAULT '{}',
    version TEXT DEFAULT '1.0.0',
    is_active BOOLEAN DEFAULT 1,
    is_default BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 3. INSERT DEFAULT DATA (Based on AIMS Guideline - but can be changed)
-- ============================================================================

-- Insert default categories
INSERT OR IGNORE INTO indicator_categories (id, code, name, description, color, display_order) VALUES
('cat-integrity', 'INTEGRITY_PROMOTION', 'Integrity Promotion', 'Actions to prevent corruption', '#10B981', 1),
('cat-accountability', 'CORRUPTION_ACCOUNTABILITY', 'Corruption Accountability', 'Corruption incidents and responses', '#EF4444', 2);

-- Insert the 5 AIMS indicators (as examples - can be modified)
INSERT OR IGNORE INTO indicators (id, code, name, description, category_id, weight, max_score, scoring_method, display_order) VALUES
-- ICCS (28 points)
('ind-iccs', 'ICCS', 'Internal Corruption Control Systems', 
 'Functioning of four core integrity systems', 'cat-integrity', 28, 28, 'boolean_sum', 1),
-- Training (26 points)
('ind-training', 'TRAINING', 'Integrity Capacity Building', 
 'Staff training and e-learning completion', 'cat-integrity', 26, 26, 'percentage', 2),
-- AD Compliance (16 points)
('ind-ad', 'AD', 'Asset Declaration Compliance', 
 'AD submission compliance rate', 'cat-integrity', 16, 16, 'percentage', 3),
-- Cases (20 points)
('ind-cases', 'CASES', 'Corruption Case Severity', 
 'Weighted severity of corruption cases', 'cat-accountability', 20, 20, 'weighted_sum', 4),
-- ATR (10 points)
('ind-atr', 'ATR', 'ATR Responsiveness', 
 'Timeliness of ATR submissions', 'cat-accountability', 10, 10, 'percentage', 5);

-- Insert parameters for ICCS indicator (as example)
INSERT OR IGNORE INTO parameters (id, indicator_id, code, label, description, type, required, display_order) VALUES
-- ICCS parameters
('param-iccs-1', 'ind-iccs', 'complaint_exists', 'Complaint System Exists', 'Does complaint management system exist?', 'boolean', 1, 1),
('param-iccs-2', 'ind-iccs', 'complaint_functions', 'Complaint System Functions', 'Is the complaint system functioning?', 'boolean', 1, 2),
('param-iccs-3', 'ind-iccs', 'conflict_exists', 'Conflict System Exists', 'Does conflict of interest system exist?', 'boolean', 1, 3),
('param-iccs-4', 'ind-iccs', 'conflict_functions', 'Conflict System Functions', 'Is the conflict system functioning?', 'boolean', 1, 4),
('param-iccs-5', 'ind-iccs', 'gift_exists', 'Gift Register Exists', 'Does gift register system exist?', 'boolean', 1, 5),
('param-iccs-6', 'ind-iccs', 'gift_functions', 'Gift Register Functions', 'Is the gift register functioning?', 'boolean', 1, 6),
('param-iccs-7', 'ind-iccs', 'proactive_level', 'Proactive Measures', 'Level of ACC recommendations implementation', 'select', 1, 7),
-- Training parameters
('param-training-1', 'ind-training', 'total_employees', 'Total Employees', 'Total number of employees', 'number', 1, 1),
('param-training-2', 'ind-training', 'trained_employees', 'Trained Employees', 'Number of employees who completed training', 'number', 1, 2);

-- Insert scoring rules (as examples)
INSERT OR IGNORE INTO scoring_rules (id, indicator_id, parameter_code, rule_type, condition, points, description) VALUES
-- ICCS scoring rules
('rule-iccs-1', 'ind-iccs', 'complaint_exists', 'boolean', 'true', 3, 'Complaint system exists (3 points)'),
('rule-iccs-2', 'ind-iccs', 'complaint_functions', 'boolean', 'true', 4, 'Complaint system functions (4 points)'),
('rule-iccs-3', 'ind-iccs', 'conflict_exists', 'boolean', 'true', 3, 'Conflict system exists (3 points)'),
('rule-iccs-4', 'ind-iccs', 'conflict_functions', 'boolean', 'true', 4, 'Conflict system functions (4 points)'),
-- Training scoring rules (percentage based)
('rule-training-1', 'ind-training', NULL, 'percentage', 'completion_rate >= 85', 26, '≥85% completion = 26 points'),
('rule-training-2', 'ind-training', NULL, 'percentage', 'completion_rate >= 70 AND completion_rate <= 84', 18, '70-84% = 18 points'),
('rule-training-3', 'ind-training', NULL, 'percentage', 'completion_rate >= 50 AND completion_rate <= 69', 10, '50-69% = 10 points'),
('rule-training-4', 'ind-training', NULL, 'percentage', 'completion_rate < 50', 0, '<50% = 0 points');

-- Insert default form template
INSERT OR IGNORE INTO form_templates (id, name, description, template_type, indicator_ids, is_default) VALUES
('tpl-aims-complete', 'Complete AIMS Assessment', 'Full assessment with all indicators', 'assessment', 
 '["ind-iccs", "ind-training", "ind-ad", "ind-cases", "ind-atr"]', 1);

-- ============================================================================
-- 4. VERIFICATION
-- ============================================================================

SELECT '✅ DYNAMIC AIMS TABLES CREATED SUCCESSFULLY' as message;
SELECT ' ' as spacer;
SELECT '📊 TABLES CREATED:' as tables_header;
SELECT '  • indicator_categories' as table_name;
SELECT '  • indicators' as table_name;
SELECT '  • parameters' as table_name;
SELECT '  • scoring_rules' as table_name;
SELECT '  • form_templates' as table_name;
SELECT ' ' as spacer;
SELECT '📈 SAMPLE DATA INSERTED:' as data_header;
SELECT '  • ' || COUNT(*) || ' categories' FROM indicator_categories;
SELECT '  • ' || COUNT(*) || ' indicators' FROM indicators;
SELECT '  • ' || COUNT(*) || ' parameters' FROM parameters;
SELECT '  • ' || COUNT(*) || ' scoring rules' FROM scoring_rules;
SELECT '  • ' || COUNT(*) || ' form templates' FROM form_templates;
SELECT ' ' as spacer;
SELECT '🎯 AIMS INDICATORS (Can be modified in ConfigPage):' as indicators_header;
SELECT '  ' || code || ': ' || name || ' (' || weight || '%)' FROM indicators ORDER BY display_order;