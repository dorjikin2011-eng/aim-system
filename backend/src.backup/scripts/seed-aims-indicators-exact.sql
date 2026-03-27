-- Seed exact AIMS indicators from guideline matrix
-- This updates the existing indicators to match AIMS guideline exactly

BEGIN TRANSACTION;

-- ====================================================================
-- 1. UPDATE EXISTING INDICATORS TO MATCH AIMS GUIDELINE EXACTLY
-- ====================================================================

-- Indicator 1: ICCS (28 points)
UPDATE indicators SET
  name = 'Internal Corruption Control Systems (ICCS)',
  description = 'Functioning of the agency''s four core integrity systems',
  weight = 28,
  max_score = 28,
  parameters = json('[
    {
      "id": "iccs_complaint_exists",
      "code": "complaint_exists",
      "name": "Complaint Management Mechanism - Exists",
      "type": "boolean",
      "description": "System for reporting violation of code of conduct exists",
      "required": true,
      "scoring_rules": [{"condition": "true", "points": 3}]
    },
    {
      "id": "iccs_complaint_functions",
      "code": "complaint_functions",
      "name": "Complaint Management Mechanism - Functions",
      "type": "boolean",
      "description": "System for reporting violation of code of conduct functions",
      "required": true,
      "scoring_rules": [{"condition": "true", "points": 4}]
    },
    {
      "id": "iccs_conflict_exists",
      "code": "conflict_exists",
      "name": "Conflict of Interest Declaration System - Exists",
      "type": "boolean",
      "description": "Conflict of Interest Declaration System exists",
      "required": true,
      "scoring_rules": [{"condition": "true", "points": 3}]
    },
    {
      "id": "iccs_conflict_functions",
      "code": "conflict_functions",
      "name": "Conflict of Interest Declaration System - Functions",
      "type": "boolean",
      "description": "Conflict of Interest Declaration System functions",
      "required": true,
      "scoring_rules": [{"condition": "true", "points": 4}]
    },
    {
      "id": "iccs_gift_exists",
      "code": "gift_exists",
      "name": "Gift Register & Reporting System - Exists",
      "type": "boolean",
      "description": "Gift Register & Reporting System exists",
      "required": true,
      "scoring_rules": [{"condition": "true", "points": 3}]
    },
    {
      "id": "iccs_gift_functions",
      "code": "gift_functions",
      "name": "Gift Register & Reporting System - Functions",
      "type": "boolean",
      "description": "Gift Register & Reporting System functions",
      "required": true,
      "scoring_rules": [{"condition": "true", "points": 4}]
    },
    {
      "id": "iccs_proactive_level",
      "code": "proactive_level",
      "name": "Proactive Measures Level",
      "type": "select",
      "description": "ACC''s Systemic Recommendations OR agency''s proactive corruption risk prevention/mitigation measures",
      "required": true,
      "options": ["level1", "level2", "level3"],
      "option_labels": {
        "level1": "ACC Recommendations Present & Functioning (7 points)",
        "level2": "No ACC Recommendations AND No Proactive Measures (3 points)",
        "level3": "ACC Recommendations Exist BUT Not Implemented (0 points)"
      },
      "scoring_rules": [
        {"condition": "level1", "points": 7},
        {"condition": "level2", "points": 3},
        {"condition": "level3", "points": 0}
      ]
    }
  ]'),
  scoring_rules = json('[]'),
  display_order = 1,
  updated_at = CURRENT_TIMESTAMP,
  updated_by = 'system'
WHERE id = 'ind_iccs';

-- Indicator 2: Integrity Capacity Building (26 points)
UPDATE indicators SET
  name = 'Integrity Capacity Building',
  description = 'Staff Training & Awareness + ACC''s e-Learning completion',
  weight = 26,
  max_score = 26,
  parameters = json('[
    {
      "id": "training_completion_rate",
      "code": "completion_rate",
      "name": "E-Learning Completion Rate",
      "type": "percentage",
      "description": "% of employees completing ACC''s e-Learning course",
      "required": true,
      "validation": {"min": 0, "max": 100},
      "scoring_rules": [
        {"condition": ">=85", "points": 26},
        {"condition": ">=70", "points": 18},
        {"condition": ">=50", "points": 10},
        {"condition": "<50", "points": 0}
      ]
    }
  ]'),
  scoring_rules = json('[]'),
  display_order = 2,
  updated_at = CURRENT_TIMESTAMP,
  updated_by = 'system'
WHERE id = 'ind_training';

-- Indicator 3: Asset Declaration Compliance (16 points)
UPDATE indicators SET
  name = 'Asset Declaration (AD) Compliance',
  description = '% of covered officials submitting AD on time',
  weight = 16,
  max_score = 16,
  parameters = json('[
    {
      "id": "ad_submission_rate",
      "code": "submission_rate",
      "name": "Asset Declaration Submission Rate",
      "type": "percentage",
      "description": "% of covered officials submitting AD on time",
      "required": true,
      "validation": {"min": 0, "max": 100},
      "scoring_rules": [
        {"condition": "=100", "points": 16},
        {"condition": ">=95", "points": 10},
        {"condition": ">=90", "points": 5},
        {"condition": "<90", "points": 0}
      ]
    }
  ]'),
  scoring_rules = json('[]'),
  display_order = 3,
  updated_at = CURRENT_TIMESTAMP,
  updated_by = 'system'
WHERE id = 'ind_ad';

-- Indicator 4: Corruption Case Severity & Resolution (20 points)
-- Already updated with weighted calculation in previous script
UPDATE indicators SET
  name = 'Corruption Case Severity & Resolution',
  description = 'Weighted severity of corruption cases involving agency staff within the Fiscal Year',
  weight = 20,
  max_score = 20,
  display_order = 4,
  updated_at = CURRENT_TIMESTAMP,
  updated_by = 'system'
WHERE id = 'ind_cases';

-- Indicator 5: ATR Responsiveness (10 points)
UPDATE indicators SET
  name = 'ATR Responsiveness',
  description = '% of ATRs submitted by agency within ACC''s deadlines',
  weight = 10,
  max_score = 10,
  parameters = json('[
    {
      "id": "atr_timeliness_rate",
      "code": "timeliness_rate",
      "name": "ATR Timeliness Rate",
      "type": "percentage",
      "description": "% of ATRs submitted within ACC''s deadlines",
      "required": true,
      "validation": {"min": 0, "max": 100},
      "scoring_rules": [
        {"condition": ">=90", "points": 10},
        {"condition": ">=70", "points": 7},
        {"condition": "<70", "points": 3}
      ]
    }
  ]'),
  scoring_rules = json('[]'),
  display_order = 5,
  updated_at = CURRENT_TIMESTAMP,
  updated_by = 'system'
WHERE id = 'ind_atr';

-- ====================================================================
-- 2. VERIFY THE SEEDING
-- ====================================================================

SELECT 
  id,
  name,
  weight,
  max_score,
  json_array_length(parameters) as param_count,
  (SELECT SUM(json_extract(value, '$.weight')) 
   FROM json_each(parameters) 
   WHERE json_extract(value, '$.weight') IS NOT NULL) as total_param_weight
FROM indicators 
ORDER BY display_order;

-- ====================================================================
-- 3. UPDATE FORM TEMPLATE WITH EXACT AIMS STRUCTURE
-- ====================================================================

UPDATE form_templates SET
  sections = json('[
    {
      "id": "section_agency_info",
      "title": "Agency Information",
      "description": "Basic agency details for AIMS assessment",
      "fields": [
        {
          "id": "field_agency_name",
          "parameterCode": "agency_name",
          "label": "Agency Name",
          "type": "text",
          "required": true,
          "displayOrder": 1
        },
        {
          "id": "field_fiscal_year", 
          "parameterCode": "fiscal_year",
          "label": "Fiscal Year",
          "type": "text",
          "required": true,
          "displayOrder": 2
        },
        {
          "id": "field_contact_person",
          "parameterCode": "contact_person",
          "label": "AIMS Focal Person",
          "type": "text",
          "required": true,
          "displayOrder": 3
        }
      ]
    },
    {
      "id": "section_indicator1",
      "title": "Indicator 1: Internal Corruption Control Systems (ICCS)",
      "description": "28 points - Functioning of four core integrity systems",
      "fields": [
        {
          "id": "field_complaint_exists",
          "parameterCode": "complaint_exists",
          "label": "Complaint Management System Exists",
          "type": "checkbox",
          "required": true,
          "displayOrder": 1,
          "uiSettings": {"help_text": "Does the complaint system exist? (3 points if yes)"}
        },
        {
          "id": "field_complaint_functions",
          "parameterCode": "complaint_functions", 
          "label": "Complaint Management System Functions",
          "type": "checkbox",
          "required": true,
          "displayOrder": 2,
          "uiSettings": {"help_text": "Does the complaint system function properly? (4 points if yes)"}
        },
        {
          "id": "field_conflict_exists",
          "parameterCode": "conflict_exists",
          "label": "Conflict of Interest System Exists",
          "type": "checkbox",
          "required": true,
          "displayOrder": 3,
          "uiSettings": {"help_text": "Does the conflict of interest system exist? (3 points if yes)"}
        },
        {
          "id": "field_conflict_functions",
          "parameterCode": "conflict_functions",
          "label": "Conflict of Interest System Functions",
          "type": "checkbox",
          "required": true,
          "displayOrder": 4,
          "uiSettings": {"help_text": "Does the conflict of interest system function? (4 points if yes)"}
        },
        {
          "id": "field_gift_exists",
          "parameterCode": "gift_exists",
          "label": "Gift Register System Exists",
          "type": "checkbox",
          "required": true,
          "displayOrder": 5,
          "uiSettings": {"help_text": "Does the gift register system exist? (3 points if yes)"}
        },
        {
          "id": "field_gift_functions",
          "parameterCode": "gift_functions",
          "label": "Gift Register System Functions",
          "type": "checkbox",
          "required": true,
          "displayOrder": 6,
          "uiSettings": {"help_text": "Does the gift register system function? (4 points if yes)"}
        },
        {
          "id": "field_proactive_level",
          "parameterCode": "proactive_level",
          "label": "Proactive Measures Level",
          "type": "select",
          "required": true,
          "displayOrder": 7,
          "uiSettings": {
            "options": [
              {"label": "Level 1: ACC Recommendations Present & Functioning (7 points)", "value": "level1"},
              {"label": "Level 2: No Recommendations & No Proactive Measures (3 points)", "value": "level2"},
              {"label": "Level 3: ACC Recommendations Exist But Not Implemented (0 points)", "value": "level3"}
            ],
            "help_text": "Select the appropriate level based on ACC recommendations"
          }
        },
        {
          "id": "field_iccs_score",
          "parameterCode": "iccs_score",
          "label": "ICCS Total Score",
          "type": "calculated",
          "required": false,
          "displayOrder": 8,
          "uiSettings": {
            "calculation_description": "Auto-calculated: Sum of all ICCS subsystem scores",
            "readonly": true,
            "show_calculation": true
          }
        }
      ]
    },
    {
      "id": "section_indicator2",
      "title": "Indicator 2: Integrity Capacity Building",
      "description": "26 points - Staff Training & e-Learning completion",
      "fields": [
        {
          "id": "field_completion_rate",
          "parameterCode": "completion_rate",
          "label": "E-Learning Completion Rate (%)",
          "type": "number",
          "required": true,
          "displayOrder": 1,
          "uiSettings": {
            "min": 0,
            "max": 100,
            "step": 1,
            "help_text": "Enter percentage of employees completing ACC e-learning (0-100%)"
          }
        },
        {
          "id": "field_training_score",
          "parameterCode": "training_score",
          "label": "Training Score",
          "type": "calculated",
          "required": false,
          "displayOrder": 2,
          "uiSettings": {
            "calculation_description": "Auto-calculated based on completion rate",
            "readonly": true,
            "show_calculation": true
          }
        }
      ]
    },
    {
      "id": "section_indicator3",
      "title": "Indicator 3: Asset Declaration Compliance",
      "description": "16 points - AD submission compliance",
      "fields": [
        {
          "id": "field_submission_rate",
          "parameterCode": "submission_rate",
          "label": "AD Submission Rate (%)",
          "type": "number",
          "required": true,
          "displayOrder": 1,
          "uiSettings": {
            "min": 0,
            "max": 100,
            "step": 1,
            "help_text": "Enter percentage of covered officials submitting AD on time"
          }
        },
        {
          "id": "field_ad_score",
          "parameterCode": "ad_score",
          "label": "AD Compliance Score",
          "type": "calculated",
          "required": false,
          "displayOrder": 2,
          "uiSettings": {
            "calculation_description": "Auto-calculated based on submission rate",
            "readonly": true,
            "show_calculation": true
          }
        }
      ]
    },
    {
      "id": "section_indicator4",
      "title": "Indicator 4: Corruption Case Severity & Resolution",
      "description": "20 points - Weighted case severity scoring",
      "fields": [
        {
          "id": "field_convictions",
          "parameterCode": "convictions",
          "label": "Number of Convictions",
          "type": "number",
          "required": false,
          "displayOrder": 1,
          "uiSettings": {
            "min": 0,
            "help_text": "Number of convictions in the Fiscal Year (weight = 3)"
          }
        },
        {
          "id": "field_prosecutions",
          "parameterCode": "prosecutions",
          "label": "Number of Prosecutions/OAG Referrals",
          "type": "number",
          "required": false,
          "displayOrder": 2,
          "uiSettings": {
            "min": 0,
            "help_text": "Number of prosecutions or OAG referrals (weight = 2)"
          }
        },
        {
          "id": "field_admin_actions",
          "parameterCode": "admin_actions",
          "label": "Number of Administrative Actions",
          "type": "number",
          "required": false,
          "displayOrder": 3,
          "uiSettings": {
            "min": 0,
            "help_text": "Number of ACC-confirmed administrative actions (weight = 1)"
          }
        },
        {
          "id": "field_weighted_sum",
          "parameterCode": "weighted_sum",
          "label": "Weighted Severity Score",
          "type": "calculated",
          "required": false,
          "displayOrder": 4,
          "uiSettings": {
            "calculation_description": "Auto-calculated: (Convictions×3) + (Prosecutions×2) + (Admin Actions×1)",
            "readonly": true,
            "show_calculation": true,
            "show_scoring_info": true
          }
        }
      ]
    },
    {
      "id": "section_indicator5",
      "title": "Indicator 5: ATR Responsiveness",
      "description": "10 points - Timeliness of ATR submissions",
      "fields": [
        {
          "id": "field_timeliness_rate",
          "parameterCode": "timeliness_rate",
          "label": "ATR Timeliness Rate (%)",
          "type": "number",
          "required": true,
          "displayOrder": 1,
          "uiSettings": {
            "min": 0,
            "max": 100,
            "step": 1,
            "help_text": "Enter percentage of ATRs submitted within ACC deadlines"
          }
        },
        {
          "id": "field_atr_score",
          "parameterCode": "atr_score",
          "label": "ATR Responsiveness Score",
          "type": "calculated",
          "required": false,
          "displayOrder": 2,
          "uiSettings": {
            "calculation_description": "Auto-calculated based on timeliness rate",
            "readonly": true,
            "show_calculation": true
          }
        }
      ]
    },
    {
      "id": "section_summary",
      "title": "AIMS Assessment Summary",
      "description": "Total score and integrity level",
      "fields": [
        {
          "id": "field_total_score",
          "parameterCode": "total_score",
          "label": "Total AIMS Score",
          "type": "calculated",
          "required": false,
          "displayOrder": 1,
          "uiSettings": {
            "calculation_description": "Sum of all 5 indicator scores",
            "readonly": true,
            "show_calculation": true
          }
        },
        {
          "id": "field_integrity_level",
          "parameterCode": "integrity_level",
          "label": "Integrity Level",
          "type": "display",
          "required": false,
          "displayOrder": 2,
          "uiSettings": {
            "content": "Will display: High Integrity (≥80), Medium Integrity (50-79), or Needs Improvement (≤49)"
          }
        }
      ]
    }
  ]'),
  updated_at = CURRENT_TIMESTAMP,
  updated_by = 'system'
WHERE id = 'template_aims_assessment';

COMMIT;

-- ====================================================================
-- 4. CREATE NEW CONFIGURATION VERSION
-- ====================================================================

INSERT INTO configuration_versions (
  id,
  version_name,
  version_number,
  description,
  indicators,
  form_templates,
  system_config,
  is_active,
  created_by
)
SELECT 
  'aims_guideline_v1',
  'AIMS Guideline Configuration',
  '1.1.0',
  'Exact AIMS indicators from guideline with weighted calculation',
  (
    SELECT json_group_array(json_object(
      'id', id,
      'name', name,
      'description', description,
      'weight', weight,
      'category', category,
      'parameters', parameters
    ))
    FROM indicators
    WHERE is_active = 1
    ORDER BY display_order
  ),
  (
    SELECT json_group_array(json_object(
      'id', id,
      'name', name,
      'template_type', template_type
    ))
    FROM form_templates
    WHERE is_active = 1
  ),
  (
    SELECT json_object(
      'high_integrity_min', 80,
      'medium_integrity_min', 50,
      'system_version', '2.1.0',
      'aims_guideline_year', 2025
    )
  ),
  1,
  'system'
WHERE NOT EXISTS (
  SELECT 1 FROM configuration_versions WHERE version_number = '1.1.0'
);

SELECT '✅ AIMS indicators seeded successfully!' as message;
SELECT '   - 5 indicators updated with exact AIMS structure' as detail1;
SELECT '   - Form template updated with calculated fields' as detail2;
SELECT '   - New configuration version created (1.1.0)' as detail3;