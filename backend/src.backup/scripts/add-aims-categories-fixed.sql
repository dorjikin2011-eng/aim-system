-- Add AIMS-specific indicator categories as reference categories
-- Since the indicators table has a CHECK constraint, we'll map AIMS categories to existing ones

-- Create reference categories (they won't be used in CHECK constraint but for display)
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

-- Map AIMS categories to existing allowed categories:
-- integrity_promotion → compliance (for ICCS, AD) and capacity (for Training)
-- corruption_accountability → enforcement (for Cases) and responsiveness (for ATR)

-- Note: Categories remain as is for now since CHECK constraint prevents changing them
-- This script just creates reference categories for UI display purposes

-- Verify current categories
SELECT 
  i.id,
  i.name,
  i.category as current_category,
  CASE 
    WHEN i.id IN ('ind_iccs', 'ind_ad') THEN 'integrity_promotion (mapped to compliance)'
    WHEN i.id = 'ind_training' THEN 'integrity_promotion (mapped to capacity)'
    WHEN i.id = 'ind_cases' THEN 'corruption_accountability (mapped to enforcement)'
    WHEN i.id = 'ind_atr' THEN 'corruption_accountability (mapped to responsiveness)'
  END as aims_category_mapping,
  i.weight
FROM indicators i
ORDER BY i.display_order;

-- Expected output shows current mapping is already correct:
-- ind_iccs → compliance (OK for ICCS)
-- ind_training → capacity (OK for Training)  
-- ind_ad → compliance (OK for AD)
-- ind_cases → enforcement (OK for Cases)
-- ind_atr → responsiveness (OK for ATR)