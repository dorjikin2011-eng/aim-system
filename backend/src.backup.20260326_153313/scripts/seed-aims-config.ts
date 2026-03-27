// backend/src/scripts/seed-aims-config.ts
import db from '../models/db';  // This imports the default export

/**
 * Seed script for AIMS configuration (compatible with your sqlite3 setup)
 * This will add the AIMS indicators to your database
 */

async function seedAIMSConfig() {
  console.log('🚀 Seeding AIMS configuration...\n');
  
  try {
    // Get the database instance
    const database = db.getDB();
    
    console.log('📊 Checking existing data...');
    
    // Check if indicators already exist
    const existingIndicators = await db.allAsync<any>(
      database, 
      'SELECT COUNT(*) as count FROM indicators'
    );
    
    if (existingIndicators[0].count > 0) {
      console.log('✅ AIMS indicators already exist in database');
      console.log(`📊 Current count: ${existingIndicators[0].count} indicators`);
      return;
    }
    
    console.log('📝 Inserting AIMS indicators...');
    
    // Insert the 5 AIMS indicators (simplified version)
    const indicators = [
      // ICCS
      {
        id: 'ind_iccs',
        code: 'ICCS',
        name: 'Internal Corruption Control Systems (ICCS)',
        description: 'Functioning of the agency\'s four core integrity systems',
        category: 'compliance',
        weight: 28,
        max_score: 28,
        scoring_method: 'formula',
        parameters: JSON.stringify([
          { code: 'complaint_exists', label: 'Complaint System Exists', type: 'boolean' },
          { code: 'complaint_functions', label: 'Complaint System Functions', type: 'boolean' },
          { code: 'conflict_exists', label: 'Conflict System Exists', type: 'boolean' },
          { code: 'conflict_functions', label: 'Conflict System Functions', type: 'boolean' },
          { code: 'gift_exists', label: 'Gift System Exists', type: 'boolean' },
          { code: 'gift_functions', label: 'Gift System Functions', type: 'boolean' },
          { 
            code: 'proactive_level', 
            label: 'ACC Recommendations / Proactive Measures', 
            type: 'select',
            options: [
              { value: 'full', label: 'Present & Functioning (7 pts)' },
              { value: 'baseline', label: 'No ACC Recommendations (3 pts)' },
              { value: 'zero', label: 'ACC Recommendations Not Implemented (0 pts)' }
            ]
          }
        ]),
        scoring_rules: JSON.stringify([
          { parameterCode: 'complaint_exists', condition: 'true', points: 3 },
          { parameterCode: 'complaint_functions', condition: 'true', points: 4 },
          { parameterCode: 'conflict_exists', condition: 'true', points: 3 },
          { parameterCode: 'conflict_functions', condition: 'true', points: 4 },
          { parameterCode: 'gift_exists', condition: 'true', points: 3 },
          { parameterCode: 'gift_functions', condition: 'true', points: 4 },
          { parameterCode: 'proactive_level', condition: 'value === "full"', points: 7 },
          { parameterCode: 'proactive_level', condition: 'value === "baseline"', points: 3 },
          { parameterCode: 'proactive_level', condition: 'value === "zero"', points: 0 }
        ]),
        is_active: 1,
        display_order: 1,
        created_by: 'system',
        updated_by: 'system'
      },
      // Training
      {
        id: 'ind_training',
        code: 'TRAINING',
        name: 'Integrity Capacity Building',
        description: 'Staff Training & Awareness + ACC\'s e-Learning completion',
        category: 'capacity',
        weight: 26,
        max_score: 26,
        scoring_method: 'conditional',
        parameters: JSON.stringify([
          { code: 'total_employees', label: 'Total Employees', type: 'number' },
          { code: 'completed_employees', label: 'Employees Completed e-Learning', type: 'number' }
        ]),
        scoring_rules: JSON.stringify([
          { condition: 'percentage >= 85', points: 26 },
          { condition: 'percentage >= 70 && percentage <= 84', points: 18 },
          { condition: 'percentage >= 50 && percentage <= 69', points: 10 },
          { condition: 'percentage < 50', points: 0 }
        ]),
        is_active: 1,
        display_order: 2,
        created_by: 'system',
        updated_by: 'system'
      },
      // AD
      {
        id: 'ind_ad',
        code: 'AD',
        name: 'Asset Declaration (AD) Compliance',
        description: '% of covered officials submitting AD on time',
        category: 'compliance',
        weight: 16,
        max_score: 16,
        scoring_method: 'conditional',
        parameters: JSON.stringify([
          { code: 'total_covered_officials', label: 'Total Covered Officials', type: 'number' },
          { code: 'officials_submitted_on_time', label: 'Officials Submitted On Time', type: 'number' }
        ]),
        scoring_rules: JSON.stringify([
          { condition: 'percentage === 100', points: 16 },
          { condition: 'percentage >= 95 && percentage <= 99', points: 10 },
          { condition: 'percentage >= 90 && percentage <= 94', points: 5 },
          { condition: 'percentage < 90', points: 0 }
        ]),
        is_active: 1,
        display_order: 3,
        created_by: 'system',
        updated_by: 'system'
      },
      // Cases
      {
        id: 'ind_cases',
        code: 'CASES',
        name: 'Corruption Case Severity & Resolution',
        description: 'Weighted severity of corruption cases involving agency staff',
        category: 'enforcement',
        weight: 20,
        max_score: 20,
        scoring_method: 'weighted',
        parameters: JSON.stringify([
          { code: 'convictions', label: 'Convictions', type: 'number', weight: 3 },
          { code: 'prosecutions', label: 'Prosecutions/OAG Referrals', type: 'number', weight: 2 },
          { code: 'admin_actions', label: 'Administrative Actions', type: 'number', weight: 1 }
        ]),
        scoring_rules: JSON.stringify([
          { condition: 'weightedSum <= 0', points: 20 },
          { condition: 'weightedSum >= 1 && weightedSum <= 2', points: 10 },
          { condition: 'weightedSum >= 3 && weightedSum <= 4', points: 5 },
          { condition: 'weightedSum >= 5', points: 0 }
        ]),
        is_active: 1,
        display_order: 4,
        created_by: 'system',
        updated_by: 'system'
      },
      // ATR
      {
        id: 'ind_atr',
        code: 'ATR',
        name: 'ATR Responsiveness',
        description: '% of ATRs submitted by agency within ACC\'s deadlines',
        category: 'responsiveness',
        weight: 10,
        max_score: 10,
        scoring_method: 'conditional',
        parameters: JSON.stringify([
          { code: 'total_atrs', label: 'Total ATRs', type: 'number' },
          { code: 'atrs_submitted_on_time', label: 'ATRs Submitted On Time', type: 'number' }
        ]),
        scoring_rules: JSON.stringify([
          { condition: 'percentage >= 90', points: 10 },
          { condition: 'percentage >= 70 && percentage <= 89', points: 7 },
          { condition: 'percentage < 70', points: 3 }
        ]),
        is_active: 1,
        display_order: 5,
        created_by: 'system',
        updated_by: 'system'
      }
    ];
    
    // Insert each indicator
    for (const indicator of indicators) {
      await db.runAsync(database, `
        INSERT INTO indicators (
          id, code, name, description, category, weight, max_score, scoring_method,
          parameters, scoring_rules, is_active, display_order, created_by, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        indicator.id,
        indicator.code,
        indicator.name,
        indicator.description,
        indicator.category,
        indicator.weight,
        indicator.max_score,
        indicator.scoring_method,
        indicator.parameters,
        indicator.scoring_rules,
        indicator.is_active,
        indicator.display_order,
        indicator.created_by,
        indicator.updated_by
      ]);
      
      console.log(`✅ ${indicator.name} (${indicator.weight}%)`);
    }
    
    console.log('\n🎉 AIMS configuration seeded successfully!');
    console.log('📊 5 indicators added to database');
    
  } catch (error) {
    console.error('❌ Error seeding AIMS configuration:', error);
    process.exit(1);
  }
}

// Run the seed
seedAIMSConfig();