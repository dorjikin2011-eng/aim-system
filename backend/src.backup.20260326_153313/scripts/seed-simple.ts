// backend/src/scripts/seed-simple.ts
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

// Create a direct database connection WITHOUT WAL mode
const dbPath = path.resolve('./aim-system.db');
console.log(`📁 Database: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to database');
});

// Helper functions
function run(sql: string, params: any[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve();
    });
  });
}

function get<T>(sql: string, params: any[] = []): Promise<T | null> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T || null);
    });
  });
}

async function seedSimple() {
  console.log('🚀 Seeding AIMS configuration (simple method)...\n');
  
  try {
    // Check existing data
    const existing = await get<{ count: number }>('SELECT COUNT(*) as count FROM indicators');
    console.log(`📊 Existing indicators: ${existing?.count || 0}`);
    
    if (existing && existing.count > 0) {
      console.log('✅ Indicators already exist. Skipping seed.');
      db.close();
      return;
    }
    
    console.log('📝 Inserting 5 AIMS indicators...');
    
    // Insert indicators
    const indicators = [
      // ICCS
      `INSERT INTO indicators (
        id, code, name, description, category, weight, max_score, scoring_method,
        parameters, scoring_rules, is_active, display_order, created_by, updated_by
      ) VALUES (
        'ind_iccs', 'ICCS', 'Internal Corruption Control Systems (ICCS)',
        'Functioning of the agency''s four core integrity systems',
        'compliance', 28, 28, 'formula',
        '[
          {"code":"complaint_exists","label":"Complaint System Exists","type":"boolean"},
          {"code":"complaint_functions","label":"Complaint System Functions","type":"boolean"},
          {"code":"conflict_exists","label":"Conflict System Exists","type":"boolean"},
          {"code":"conflict_functions","label":"Conflict System Functions","type":"boolean"},
          {"code":"gift_exists","label":"Gift System Exists","type":"boolean"},
          {"code":"gift_functions","label":"Gift System Functions","type":"boolean"},
          {"code":"proactive_level","label":"ACC Recommendations / Proactive Measures","type":"select",
           "options":[{"value":"full","label":"Present & Functioning (7 pts)"},
                     {"value":"baseline","label":"No ACC Recommendations (3 pts)"},
                     {"value":"zero","label":"ACC Recommendations Not Implemented (0 pts)"}]}
        ]',
        '[
          {"parameterCode":"complaint_exists","condition":"true","points":3},
          {"parameterCode":"complaint_functions","condition":"true","points":4},
          {"parameterCode":"conflict_exists","condition":"true","points":3},
          {"parameterCode":"conflict_functions","condition":"true","points":4},
          {"parameterCode":"gift_exists","condition":"true","points":3},
          {"parameterCode":"gift_functions","condition":"true","points":4},
          {"parameterCode":"proactive_level","condition":"value === \\"full\\"","points":7},
          {"parameterCode":"proactive_level","condition":"value === \\"baseline\\"","points":3},
          {"parameterCode":"proactive_level","condition":"value === \\"zero\\"","points":0}
        ]',
        1, 1, 'system', 'system'
      )`,
      
      // Training
      `INSERT INTO indicators (
        id, code, name, description, category, weight, max_score, scoring_method,
        parameters, scoring_rules, is_active, display_order, created_by, updated_by
      ) VALUES (
        'ind_training', 'TRAINING', 'Integrity Capacity Building',
        'Staff Training & Awareness + ACC''s e-Learning completion',
        'capacity', 26, 26, 'conditional',
        '[
          {"code":"total_employees","label":"Total Employees","type":"number"},
          {"code":"completed_employees","label":"Employees Completed e-Learning","type":"number"}
        ]',
        '[
          {"condition":"percentage >= 85","points":26},
          {"condition":"percentage >= 70 && percentage <= 84","points":18},
          {"condition":"percentage >= 50 && percentage <= 69","points":10},
          {"condition":"percentage < 50","points":0}
        ]',
        1, 2, 'system', 'system'
      )`,
      
      // AD
      `INSERT INTO indicators (
        id, code, name, description, category, weight, max_score, scoring_method,
        parameters, scoring_rules, is_active, display_order, created_by, updated_by
      ) VALUES (
        'ind_ad', 'AD', 'Asset Declaration (AD) Compliance',
        '% of covered officials submitting AD on time',
        'compliance', 16, 16, 'conditional',
        '[
          {"code":"total_covered_officials","label":"Total Covered Officials","type":"number"},
          {"code":"officials_submitted_on_time","label":"Officials Submitted On Time","type":"number"}
        ]',
        '[
          {"condition":"percentage === 100","points":16},
          {"condition":"percentage >= 95 && percentage <= 99","points":10},
          {"condition":"percentage >= 90 && percentage <= 94","points":5},
          {"condition":"percentage < 90","points":0}
        ]',
        1, 3, 'system', 'system'
      )`,
      
      // Cases
      `INSERT INTO indicators (
        id, code, name, description, category, weight, max_score, scoring_method,
        parameters, scoring_rules, is_active, display_order, created_by, updated_by
      ) VALUES (
        'ind_cases', 'CASES', 'Corruption Case Severity & Resolution',
        'Weighted severity of corruption cases involving agency staff',
        'enforcement', 20, 20, 'weighted',
        '[
          {"code":"convictions","label":"Convictions","type":"number","weight":3},
          {"code":"prosecutions","label":"Prosecutions/OAG Referrals","type":"number","weight":2},
          {"code":"admin_actions","label":"Administrative Actions","type":"number","weight":1}
        ]',
        '[
          {"condition":"weightedSum <= 0","points":20},
          {"condition":"weightedSum >= 1 && weightedSum <= 2","points":10},
          {"condition":"weightedSum >= 3 && weightedSum <= 4","points":5},
          {"condition":"weightedSum >= 5","points":0}
        ]',
        1, 4, 'system', 'system'
      )`,
      
      // ATR
      `INSERT INTO indicators (
        id, code, name, description, category, weight, max_score, scoring_method,
        parameters, scoring_rules, is_active, display_order, created_by, updated_by
      ) VALUES (
        'ind_atr', 'ATR', 'ATR Responsiveness',
        '% of ATRs submitted by agency within ACC''s deadlines',
        'responsiveness', 10, 10, 'conditional',
        '[
          {"code":"total_atrs","label":"Total ATRs","type":"number"},
          {"code":"atrs_submitted_on_time","label":"ATRs Submitted On Time","type":"number"}
        ]',
        '[
          {"condition":"percentage >= 90","points":10},
          {"condition":"percentage >= 70 && percentage <= 89","points":7},
          {"condition":"percentage < 70","points":3}
        ]',
        1, 5, 'system', 'system'
      )`
    ];
    
    // Execute each insert
    for (let i = 0; i < indicators.length; i++) {
      try {
        await run(indicators[i]);
        console.log(`✅ Indicator ${i + 1} inserted`);
      } catch (error: any) {
        console.error(`❌ Error inserting indicator ${i + 1}:`, error.message);
      }
    }
    
    console.log('\n🎉 AIMS indicators seeded successfully!');
    console.log('📊 5 indicators added');
    
  } catch (error) {
    console.error('❌ Seed error:', error);
  } finally {
    db.close();
  }
}

// Run the seed
seedSimple();