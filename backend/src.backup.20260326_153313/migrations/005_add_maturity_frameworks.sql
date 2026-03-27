-- backend/migrations/005_add_maturity_frameworks.sql

-- Maturity frameworks table
CREATE TABLE IF NOT EXISTS maturity_frameworks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  indicator_id TEXT NOT NULL UNIQUE,
  levels TEXT NOT NULL, -- JSON array of MaturityLevelDefinition
  scoring_rule TEXT NOT NULL, -- JSON object of MaturityScoringRule
  enabled BOOLEAN DEFAULT 1,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (indicator_id) REFERENCES indicators(id) ON DELETE CASCADE
);

CREATE INDEX idx_maturity_frameworks_indicator ON maturity_frameworks(indicator_id);

-- ICCS subsystems table
CREATE TABLE IF NOT EXISTS iccs_subsystems (
  id TEXT PRIMARY KEY,
  indicator_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  weight REAL NOT NULL,
  maturity_framework TEXT NOT NULL, -- JSON object of MaturityFramework
  display_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT 1,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (indicator_id) REFERENCES indicators(id) ON DELETE CASCADE
);

CREATE INDEX idx_iccs_subsystems_indicator ON iccs_subsystems(indicator_id);
CREATE INDEX idx_iccs_subsystems_order ON iccs_subsystems(display_order);

-- Maturity framework templates table
CREATE TABLE IF NOT EXISTS maturity_framework_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  applicable_to TEXT NOT NULL, -- JSON array of indicator IDs
  framework TEXT NOT NULL, -- JSON object of MaturityFramework
  is_default BOOLEAN DEFAULT 0,
  version TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_framework_templates_default ON maturity_framework_templates(is_default);