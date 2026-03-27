// backend/src/scripts/fix-database-schema.ts
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.resolve('./aim-system.db');
console.log(`📁 Database: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to database');
});

function run(sql: string, params: any[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve();
    });
  });
}

function all<T>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
}

async function fixDatabaseSchema() {
  console.log('🔧 Fixing database schema issues...\n');
  
  try {
    // 1. Check assessments table columns
    console.log('📊 Checking assessments table...');
    const assessmentColumns = await all<{name: string, type: string}>(`
      SELECT name, type FROM pragma_table_info('assessments')
    `);
    
    const columnNames = assessmentColumns.map(col => col.name);
    console.log('Current columns:', columnNames.join(', '));
    
    // Add missing columns to assessments table
    const missingColumns = [
      { name: 'final_score', type: 'REAL', defaultValue: null },
      { name: 'integrity_level', type: 'TEXT', defaultValue: null },
      { name: 'scoring_method', type: 'TEXT', defaultValue: 'auto' },
      { name: 'last_scored_at', type: 'DATETIME', defaultValue: null }
    ];
    
    for (const col of missingColumns) {
      if (!columnNames.includes(col.name)) {
        await run(`ALTER TABLE assessments ADD COLUMN ${col.name} ${col.type}`);
        console.log(`✅ Added column: ${col.name}`);
      } else {
        console.log(`✅ Column already exists: ${col.name}`);
      }
    }
    
    // 2. Check dynamic_assessment_responses table
    console.log('\n📊 Checking dynamic_assessment_responses table...');
    const responseColumns = await all<{name: string, type: string}>(`
      SELECT name, type FROM pragma_table_info('dynamic_assessment_responses')
    `);
    
    const responseColNames = responseColumns.map(col => col.name);
    console.log('Current columns:', responseColNames.join(', '));
    
    // Add missing columns to dynamic_assessment_responses
    const missingResponseColumns = [
      { name: 'auto_calculated_score', type: 'REAL', defaultValue: null },
      { name: 'scoring_details', type: 'TEXT', defaultValue: '{}' },
      { name: 'calculation_timestamp', type: 'DATETIME', defaultValue: null },
      { name: 'validation_status', type: 'TEXT', defaultValue: 'pending' }
    ];
    
    for (const col of missingResponseColumns) {
      if (!responseColNames.includes(col.name)) {
        await run(`ALTER TABLE dynamic_assessment_responses ADD COLUMN ${col.name} ${col.type}`);
        console.log(`✅ Added column: ${col.name}`);
      } else {
        console.log(`✅ Column already exists: ${col.name}`);
      }
    }
    
    // 3. Update system config for auto-scoring
    console.log('\n⚙️ Updating system configuration...');
    await run(`
      INSERT OR REPLACE INTO system_config (config_key, config_value, config_type, category, description)
      VALUES 
      ('scoring.auto_enabled', 'true', 'boolean', 'scoring', 'Enable automatic scoring'),
      ('scoring.calculation_method', 'auto', 'string', 'scoring', 'Scoring calculation method'),
      ('scoring.integrity_threshold_high', '80', 'number', 'scoring', 'High integrity threshold (≥80)'),
      ('scoring.integrity_threshold_medium', '50', 'number', 'scoring', 'Medium integrity threshold (50-79)'),
      ('ui.show_auto_scores', 'true', 'boolean', 'ui', 'Show auto-calculated scores in UI')
    `);
    console.log('✅ Updated system configuration');
    
    // 4. Create a sample assessment to test scoring
    console.log('\n🧪 Creating test assessment for scoring...');
    
    // Check if agencies exist
    const agencies = await all<{id: string}>('SELECT id FROM agencies LIMIT 1');
    const users = await all<{id: string}>('SELECT id FROM users WHERE role = "prevention_officer" LIMIT 1');
    
    if (agencies.length > 0 && users.length > 0) {
      const testAssessmentId = `test-assessment-${Date.now()}`;
      
      await run(`
        INSERT OR REPLACE INTO assessments (
          id, agency_id, fiscal_year, status, overall_score, final_score,
          integrity_level, assigned_officer_id, scoring_method
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        testAssessmentId,
        agencies[0].id,
        '2025',
        'DRAFT',
        0,
        0,
        'pending',
        users[0].id,
        'auto'
      ]);
      
      console.log(`✅ Created test assessment: ${testAssessmentId}`);
    } else {
      console.log('⚠️  Cannot create test assessment - missing agency or officer');
    }
    
    // 5. Verify all tables
    console.log('\n📋 Database schema verification:');
    const tables = await all<{name: string}>(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);
    
    for (const table of tables) {
      const count = await all<{count: number}>(`SELECT COUNT(*) as count FROM ${table.name}`);
      console.log(`   ${table.name}: ${count[0].count} records`);
    }
    
    console.log('\n🎉 Database schema fixed successfully!');
    console.log('\n🚀 Next steps:');
    console.log('1. Restart backend server');
    console.log('2. The error "no such column: final_score" should be gone');
    console.log('3. Check ConfigPage → Test Forms for auto-scoring');
    
  } catch (error: any) {
    console.error('❌ Error fixing schema:', error.message);
  } finally {
    db.close();
  }
}

// Run the fix
fixDatabaseSchema();