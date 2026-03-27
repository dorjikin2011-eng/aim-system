-- Check how parameters are stored in the database

-- 1. Check if separate parameters table exists
SELECT name FROM sqlite_master WHERE type='table' AND name='parameters';

-- 2. Check indicators table parameters column
SELECT 
  id,
  name,
  json_array_length(parameters) as param_count,
  substr(parameters, 1, 200) as params_preview
FROM indicators 
ORDER BY display_order;

-- 3. Check one indicator's parameters in detail
SELECT 
  json_extract(parameters, '$[0].code') as param1_code,
  json_extract(parameters, '$[0].name') as param1_name,
  json_extract(parameters, '$[0].type') as param1_type,
  json_extract(parameters, '$[1].code') as param2_code,
  json_extract(parameters, '$[1].name') as param2_name,
  json_extract(parameters, '$[1].type') as param2_type
FROM indicators 
WHERE id = 'ind_iccs';

-- 4. Check parameter_definitions table (if exists)
SELECT name FROM sqlite_master WHERE type='table' AND name='parameter_definitions';

-- 5. Summary
SELECT 'Current State:' as summary;
SELECT '  - Parameters stored as JSON in indicators.parameters' as storage_method;
SELECT '  - Separate parameters table: ' || 
  CASE WHEN EXISTS (SELECT 1 FROM sqlite_master WHERE name='parameters') 
  THEN 'EXISTS' ELSE 'DOES NOT EXIST' END as param_table_status;
SELECT '  - parameter_definitions table: ' ||
  CASE WHEN EXISTS (SELECT 1 FROM sqlite_master WHERE name='parameter_definitions') 
  THEN 'EXISTS' ELSE 'DOES NOT EXIST' END as param_def_status;