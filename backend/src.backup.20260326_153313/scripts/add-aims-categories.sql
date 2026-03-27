-- Add AIMS-specific indicator categories
-- Run this script to add the two main AIMS categories

INSERT OR IGNORE INTO indicator_categories (id, name, description, display_order, is_active) VALUES
  (
    'integrity_promotion',
    'Integrity Promotion',
    'AIMS Category: Positive actions agencies take to prevent corruption (70 points total)',
    1,
    1
  ),
  (
    'corruption_accountability', 
    'Corruption Accountability',
    'AIMS Category: Incidents of corruption or poor accountability in agencies (30 points total)',
    2,
    1
  );

-- Update existing default indicators to use AIMS categories
UPDATE indicators 
SET category = 'integrity_promotion'
WHERE id IN ('ind_iccs', 'ind_training', 'ind_ad');

UPDATE indicators 
SET category = 'corruption_accountability' 
WHERE id IN ('ind_cases', 'ind_atr');

-- Verify the changes
SELECT 
  i.id,
  i.name,
  i.category,
  i.weight,
  c.name as category_name,
  c.description as category_description
FROM indicators i
LEFT JOIN indicator_categories c ON i.category = c.id
ORDER BY i.display_order;

-- Expected output:
-- ind_iccs      | Integrity Promotion | 28
-- ind_training  | Integrity Promotion | 26  
-- ind_ad        | Integrity Promotion | 16
-- ind_cases     | Corruption Accountability | 20
-- ind_atr       | Corruption Accountability | 10