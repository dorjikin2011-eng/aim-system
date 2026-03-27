-- Update Indicator 4 (Corruption Cases) to implement weighted calculation
-- Current limitation: UI doesn't support formula-based scoring
-- Solution: Update parameters and scoring rules to match AIMS guideline

-- First, check current configuration for ind_cases
SELECT 
  id,
  name,
  parameters,
  scoring_rules
FROM indicators 
WHERE id = 'ind_cases';

-- Update the parameters to match AIMS guideline exactly
UPDATE indicators 
SET parameters = json('[
  {
    "id": "param_cases_convictions",
    "code": "convictions",
    "name": "Convictions",
    "type": "number",
    "description": "Number of convictions in the Fiscal Year",
    "required": false,
    "weight": 3,
    "validation": {"min": 0}
  },
  {
    "id": "param_cases_prosecutions", 
    "code": "prosecutions",
    "name": "Prosecutions/OAG Referrals",
    "type": "number",
    "description": "Number of prosecutions or OAG referrals",
    "required": false,
    "weight": 2,
    "validation": {"min": 0}
  },
  {
    "id": "param_cases_admin_actions",
    "code": "admin_actions",
    "name": "Administrative Actions",
    "type": "number", 
    "description": "Number of ACC-confirmed administrative actions",
    "required": false,
    "weight": 1,
    "validation": {"min": 0}
  },
  {
    "id": "param_cases_weighted_sum",
    "code": "weighted_sum",
    "name": "Weighted Severity Score",
    "type": "number",
    "description": "Calculated: (Convictions×3) + (Prosecutions×2) + (Admin Actions×1)",
    "required": true,
    "calculation": "(convictions * 3) + (prosecutions * 2) + (admin_actions * 1)",
    "validation": {"min": 0}
  }
]')
WHERE id = 'ind_cases';

-- Update scoring rules to map weighted_sum to points per AIMS guideline
UPDATE indicators 
SET scoring_rules = json('[
  {
    "id": "rule_cases_weighted_0",
    "parameterCode": "weighted_sum",
    "condition": "value == 0",
    "points": 20,
    "description": "No corruption cases"
  },
  {
    "id": "rule_cases_weighted_1_2",
    "parameterCode": "weighted_sum", 
    "condition": "value >= 1 AND value <= 2",
    "points": 10,
    "description": "Low severity cases (weighted score 1-2)"
  },
  {
    "id": "rule_cases_weighted_3_4",
    "parameterCode": "weighted_sum",
    "condition": "value >= 3 AND value <= 4", 
    "points": 5,
    "description": "Medium severity cases (weighted score 3-4)"
  },
  {
    "id": "rule_cases_weighted_5_plus",
    "parameterCode": "weighted_sum",
    "condition": "value >= 5",
    "points": 0,
    "description": "High severity cases (weighted score ≥5)"
  }
]')
WHERE id = 'ind_cases';

-- Verify the update
SELECT 
  id,
  name,
  json_extract(parameters, '$[0].name') as param1,
  json_extract(parameters, '$[1].name') as param2,
  json_extract(parameters, '$[2].name') as param3,
  json_extract(parameters, '$[3].name') as param4,
  json_extract(scoring_rules, '$[0].description') as rule1,
  json_extract(scoring_rules, '$[0].points') as rule1_points
FROM indicators 
WHERE id = 'ind_cases';

-- Note: The weighted_sum calculation needs to be done:
-- 1. Manually by users entering the calculated value, OR
-- 2. By backend service before saving, OR  
-- 3. By UI enhancement to support formula calculations