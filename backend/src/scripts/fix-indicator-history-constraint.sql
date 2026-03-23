-- Fix indicator_history table CHECK constraint
-- The constraint doesn't match the action types being used

-- First, check current constraint
SELECT sql FROM sqlite_master 
WHERE type = 'table' AND name = 'indicator_history';

-- Temporarily disable foreign keys
PRAGMA foreign_keys = OFF;

-- Create a backup of the table
CREATE TABLE indicator_history_backup AS SELECT * FROM indicator_history;

-- Drop the old table
DROP TABLE indicator_history;

-- Recreate with correct CHECK constraint
CREATE TABLE indicator_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  indicator_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('create', 'update', 'delete', 'activate', 'deactivate')),
  changed_by TEXT NOT NULL,
  changes TEXT,
  snapshot TEXT NOT NULL,
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (indicator_id) REFERENCES indicators(id) ON DELETE CASCADE
);

-- Restore data (converting uppercase to lowercase for action field)
INSERT INTO indicator_history 
  (indicator_id, version, action, changed_by, changes, snapshot, changed_at)
SELECT 
  indicator_id,
  version,
  LOWER(action),  -- Convert to lowercase
  changed_by,
  changes,
  snapshot,
  changed_at
FROM indicator_history_backup;

-- Drop backup table
DROP TABLE indicator_history_backup;

-- Re-enable foreign keys
PRAGMA foreign_keys = ON;

-- Create indexes
CREATE INDEX idx_indicator_history_indicator ON indicator_history(indicator_id);
CREATE INDEX idx_indicator_history_version ON indicator_history(version);

-- Verify the fix
SELECT 
  action,
  COUNT(*) as count,
  MIN(changed_at) as first_change,
  MAX(changed_at) as last_change
FROM indicator_history 
GROUP BY action;

-- Also update the CREATE TABLE statement in db.ts for future use
SELECT '✅ indicator_history table constraint fixed!' as message;
SELECT '   - Changed action constraint to lowercase: create, update, delete, activate, deactivate' as detail1;
SELECT '   - Existing data converted to lowercase' as detail2;
SELECT '   - Indexes recreated' as detail3;