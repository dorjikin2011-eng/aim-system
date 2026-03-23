// backend/src/scripts/fix-scoring-tables.ts
import sqlite3 from 'sqlite3';
import path from 'path';

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

async function fixTables() {
  console.log('🔧 Fixing database tables for auto-scoring...\n');
  
  try {
    // 1. Create assessment_scores table
    console.log('📊 Creating assessment_scores table...');
    await run(`
      CREATE TABLE IF NOT EXISTS assessment_scores (
        id TEXT PRIMARY KEY,
        assessment_id TEXT NOT NULL,
        indicator_id TEXT NOT NULL,
        parameter_code TEXT,
        calculated_value REAL,
        score REAL,
        scoring_rule_applied TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
        FOREIGN KEY (indicator_id) REFERENCES indicators(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Created assessment_scores table');

    // 2. Add auto-scoring configuration to indicators table
    console.log('\n⚙️ Adding auto-scoring config to indicators...');
    
    // Check if column exists
    const hasConfigColumn = await run(`
      SELECT COUNT(*) as exists 
      FROM pragma_table_info('indicators') 
      WHERE name='scoring_config'
    `).catch(() => null);
    
    if (!hasConfigColumn) {
      await run('ALTER TABLE indicators ADD COLUMN scoring_config TEXT DEFAULT "{}"');
      console.log('✅ Added scoring_config column');
    } else {
      console.log('✅ scoring_config column already exists');
    }

    // 3. Update indicators with auto-scoring config
    console.log('\n🔄 Updating indicators with auto-scoring config...');
    
    const indicators = await new Promise<any[]>((resolve, reject) => {
      db.all('SELECT id, code, scoring_method FROM indicators', (err, rows) => {
        if (err) reject(err);
        else resolve(rows as any[]);
      });
    });

    for (const indicator of indicators) {
      let scoringConfig = {
        enableAutoScoring: true,
        showCalculatedScores: true,
        allowManualOverride: false,
        autoCalculateOnChange: true,
        calculationMethod: indicator.scoring_method,
        scoringType: indicator.scoring_method === 'formula' ? 'system_status' : 
                    indicator.scoring_method === 'percentage' ? 'percentage' :
                    indicator.scoring_method === 'weighted' ? 'weighted_sum' : 'conditional'
      };

      await run(
        'UPDATE indicators SET scoring_config = ? WHERE id = ?',
        [JSON.stringify(scoringConfig), indicator.id]
      );
      console.log(`✅ Updated ${indicator.code} with auto-scoring config`);
    }

    // 4. Add calculation fields to parameters in indicators table
    console.log('\n🧮 Updating parameters with calculation fields...');
    
    const indicatorDetails = await new Promise<any[]>((resolve, reject) => {
      db.all('SELECT id, code, parameters FROM indicators', (err, rows) => {
        if (err) reject(err);
        else resolve(rows as any[]);
      });
    });

    for (const indicator of indicatorDetails) {
      let params = JSON.parse(indicator.parameters || '[]');
      let updated = false;
      
      // Add calculation config to appropriate parameters
      params = params.map((param: any) => {
        if (indicator.code === 'ICCS') {
          if (param.code === 'proactive_level') {
            return {
              ...param,
              calculationConfig: {
                calculationType: 'select_scoring',
                scoringOptions: [
                  { value: 'full', label: 'Present & Functioning', points: 7 },
                  { value: 'baseline', label: 'No ACC Recommendations', points: 3 },
                  { value: 'zero', label: 'ACC Recommendations Not Implemented', points: 0 }
                ],
                autoCalculate: true
              }
            };
          }
        }
        else if (['TRAINING', 'AD', 'ATR'].includes(indicator.code)) {
          if (param.type === 'number') {
            return {
              ...param,
              calculationConfig: {
                calculationType: 'percentage_input',
                autoCalculate: true,
                validation: { min: 0 }
              }
            };
          }
        }
        else if (indicator.code === 'CASES') {
          if (param.type === 'number' && param.weight) {
            return {
              ...param,
              calculationConfig: {
                calculationType: 'weighted_input',
                weight: param.weight,
                autoCalculate: true
              }
            };
          }
        }
        return param;
      });
      
      if (updated) {
        await run(
          'UPDATE indicators SET parameters = ? WHERE id = ?',
          [JSON.stringify(params), indicator.id]
        );
      }
    }

    // 5. Create auto_scoring_log table for debugging
    console.log('\n📝 Creating auto_scoring_log table...');
    await run(`
      CREATE TABLE IF NOT EXISTS auto_scoring_log (
        id TEXT PRIMARY KEY,
        assessment_id TEXT,
        indicator_id TEXT,
        action TEXT,
        data_before TEXT,
        data_after TEXT,
        calculated_score REAL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created auto_scoring_log table');

    console.log('\n🎉 Database tables fixed for auto-scoring!');
    console.log('\n🔧 Changes made:');
    console.log('1. Created assessment_scores table');
    console.log('2. Added scoring_config to indicators');
    console.log('3. Updated indicators with auto-scoring settings');
    console.log('4. Enhanced parameters with calculation config');
    console.log('5. Created scoring log table');

  } catch (error: any) {
    console.error('❌ Error fixing tables:', error.message);
  } finally {
    db.close();
  }
}

// Run the fix
fixTables();