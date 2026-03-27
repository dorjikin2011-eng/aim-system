-- Migration script to add weighted_sum to existing Indicator 4 responses
-- Run this once to update existing data

-- First, check existing Indicator 4 responses
SELECT COUNT(*) as total_responses FROM dynamic_assessment_responses WHERE indicator_id = 'ind_cases';

-- Update existing responses to calculate weighted_sum
UPDATE dynamic_assessment_responses 
SET response_data = json_set(
  response_data,
  '$.weighted_sum',
  (
    (CAST(json_extract(response_data, '$.convictions') AS INTEGER) * 3) +
    (CAST(json_extract(response_data, '$.prosecutions') AS INTEGER) * 2) + 
    (CAST(json_extract(response_data, '$.admin_actions') AS INTEGER) * 1)
  )
)
WHERE indicator_id = 'ind_cases' 
AND json_extract(response_data, '$.weighted_sum') IS NULL;

-- Update calculated scores based on weighted_sum
UPDATE dynamic_assessment_responses 
SET calculated_score = CASE
  WHEN CAST(json_extract(response_data, '$.weighted_sum') AS INTEGER) = 0 THEN 20
  WHEN CAST(json_extract(response_data, '$.weighted_sum') AS INTEGER) BETWEEN 1 AND 2 THEN 10
  WHEN CAST(json_extract(response_data, '$.weighted_sum') AS INTEGER) BETWEEN 3 AND 4 THEN 5
  ELSE 0
END
WHERE indicator_id = 'ind_cases' 
AND calculated_score IS NULL;

-- Show migration results
SELECT 
  COUNT(*) as total_updated,
  SUM(CASE WHEN json_extract(response_data, '$.weighted_sum') IS NOT NULL THEN 1 ELSE 0 END) as with_weighted_sum,
  SUM(CASE WHEN calculated_score IS NOT NULL THEN 1 ELSE 0 END) as with_calculated_score
FROM dynamic_assessment_responses 
WHERE indicator_id = 'ind_cases';