-- Debug script to see what's happening with indicator updates

-- Check the current state
SELECT 
  i.id,
  i.name,
  i.version,
  COUNT(h.id) as history_entries
FROM indicators i
LEFT JOIN indicator_history h ON i.id = h.indicator_id
GROUP BY i.id
ORDER BY i.display_order;

-- See what action types exist in history
SELECT DISTINCT action FROM indicator_history;

-- Check if there are any pending issues with the API call
SELECT 'Current time:' as label, datetime('now') as current_time;

-- Test inserting with different action types to see which work
BEGIN TRANSACTION;

-- This should work (lowercase):
INSERT INTO indicator_history (indicator_id, version, action, changed_by, snapshot)
VALUES ('test_ind', 1, 'update', 'debug', '{"test": "data"}');

-- This should fail (uppercase):
INSERT INTO indicator_history (indicator_id, version, action, changed_by, snapshot)
VALUES ('test_ind', 2, 'UPDATE', 'debug', '{"test": "data2"}');

ROLLBACK; -- Roll back test inserts

SELECT '✅ Debug complete - check which insert worked/failed' as message;