-- Fix for indicator history inserts - ensure lowercase actions
-- This creates a trigger to automatically convert uppercase to lowercase

-- Create a trigger to convert action to lowercase before insert
DROP TRIGGER IF EXISTS trg_indicator_history_lowercase_action;

CREATE TRIGGER trg_indicator_history_lowercase_action
BEFORE INSERT ON indicator_history
FOR EACH ROW
BEGIN
    -- Convert action to lowercase
    SET NEW.action = LOWER(NEW.action);
END;

-- Test the trigger
BEGIN TRANSACTION;

INSERT INTO indicator_history (indicator_id, version, action, changed_by, snapshot)
VALUES ('test_trigger', 1, 'UPDATE', 'trigger_test', '{"test": "trigger works"}');

-- Check if it was inserted with lowercase
SELECT action FROM indicator_history WHERE indicator_id = 'test_trigger';

ROLLBACK; -- Clean up test

SELECT '✅ Trigger created to convert action to lowercase on insert' as message;
SELECT '   - Now UPDATE, CREATE, DELETE will be converted to update, create, delete' as detail;
SELECT '   - This fixes the API error without changing backend code' as detail2;