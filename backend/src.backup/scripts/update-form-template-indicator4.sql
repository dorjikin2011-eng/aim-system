-- Update form template to include weighted_sum field for Indicator 4
-- This makes the calculated field visible in the UI

-- First, check current form template
SELECT 
  id,
  name,
  json_extract(sections, '$[0].title') as first_section,
  json_array_length(indicator_ids) as indicator_count
FROM form_templates 
WHERE id = 'template_aims_assessment';

-- Update the form template to include weighted_sum field for Indicator 4
UPDATE form_templates 
SET sections = json('[
  {
    "id": "section_basic",
    "title": "Agency Information",
    "description": "Basic agency details",
    "fields": [
      {"type": "text", "name": "agency_name", "label": "Agency Name", "required": true},
      {"type": "text", "name": "fiscal_year", "label": "Fiscal Year", "required": true},
      {"type": "text", "name": "contact_person", "label": "Contact Person", "required": true}
    ]
  },
  {
    "id": "section_indicators",
    "title": "Indicator Assessment",
    "description": "Assess all 5 AIMS indicators",
    "repeatable": false,
    "fields": [
      {
        "type": "section",
        "title": "Indicator 4: Corruption Case Severity & Resolution",
        "description": "Enter case counts - weighted sum will be calculated automatically",
        "fields": [
          {
            "type": "number",
            "name": "convictions",
            "label": "Number of Convictions",
            "description": "Convictions in the Fiscal Year",
            "required": false,
            "min": 0
          },
          {
            "type": "number", 
            "name": "prosecutions",
            "label": "Number of Prosecutions/OAG Referrals",
            "description": "Prosecutions or OAG referrals",
            "required": false,
            "min": 0
          },
          {
            "type": "number",
            "name": "admin_actions", 
            "label": "Number of Administrative Actions",
            "description": "ACC-confirmed administrative actions",
            "required": false,
            "min": 0
          },
          {
            "type": "calculated",
            "name": "weighted_sum",
            "label": "Calculated Weighted Severity Score",
            "description": "Automatically calculated: (Convictions×3) + (Prosecutions×2) + (Admin Actions×1)",
            "readonly": true,
            "formula": "(convictions * 3) + (prosecutions * 2) + (admin_actions * 1)"
          },
          {
            "type": "display",
            "name": "scoring_info",
            "label": "Scoring Information",
            "content": "Scoring: 0 cases = 20 points, 1-2 weighted score = 10 points, 3-4 = 5 points, ≥5 = 0 points"
          }
        ]
      }
    ]
  }
]')
WHERE id = 'template_aims_assessment';

-- Verify the update
SELECT 
  json_extract(sections, '$[1].fields[0].title') as indicator4_section,
  json_extract(sections, '$[1].fields[0].fields[3].type') as weighted_sum_type,
  json_extract(sections, '$[1].fields[0].fields[3].readonly') as weighted_sum_readonly
FROM form_templates 
WHERE id = 'template_aims_assessment';