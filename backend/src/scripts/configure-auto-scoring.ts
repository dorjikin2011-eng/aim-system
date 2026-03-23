// backend/src/scripts/configure-auto-scoring.ts
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

function get<T>(sql: string, params: any[] = []): Promise<T | null> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T || null);
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

async function configureAutoScoring() {
  console.log('🎯 Configuring auto-scoring logic for AIMS indicators...\n');
  
  try {
    // Get all indicators
    const indicators = await all<any>('SELECT id, code, name, parameters FROM indicators');
    console.log(`Found ${indicators.length} indicators:\n`);
    
    for (const indicator of indicators) {
      console.log(`🔹 ${indicator.code}: ${indicator.name}`);
      
      let params = JSON.parse(indicator.parameters || '[]');
      let updatedParams = false;
      let scoringConfig: any = {};
      
      // Configure based on indicator type
      switch(indicator.code) {
        case 'ICCS':
          console.log('  🎯 Configuring ICCS auto-scoring (system_status)...');
          scoringConfig = {
            enableAutoScoring: true,
            scoringType: 'system_status',
            autoCalculateOnChange: true,
            showCalculatedScores: true,
            calculationLogic: {
              type: 'boolean_scoring',
              systems: [
                { name: 'complaint', existsField: 'complaint_exists', functionsField: 'complaint_functions', points: { exists: 3, functions: 4 } },
                { name: 'conflict', existsField: 'conflict_exists', functionsField: 'conflict_functions', points: { exists: 3, functions: 4 } },
                { name: 'gift', existsField: 'gift_exists', functionsField: 'gift_functions', points: { exists: 3, functions: 4 } },
                { name: 'proactive', field: 'proactive_level', points: { full: 7, baseline: 3, zero: 0 } }
              ],
              maxScore: 28
            }
          };
          
          // Add calculation config to parameters
          params = params.map((param: any) => {
            if (param.code === 'proactive_level') {
              return {
                ...param,
                calculationConfig: {
                  calculationType: 'select_scoring',
                  autoCalculate: true,
                  scoringRules: [
                    { value: 'full', points: 7, label: 'Present & Functioning' },
                    { value: 'baseline', points: 3, label: 'No ACC Recommendations' },
                    { value: 'zero', points: 0, label: 'ACC Recommendations Not Implemented' }
                  ]
                }
              };
            }
            if (param.code.includes('_exists') || param.code.includes('_functions')) {
              return {
                ...param,
                calculationConfig: {
                  calculationType: 'boolean_scoring',
                  autoCalculate: true,
                  points: param.code.includes('_exists') ? 3 : 4
                }
              };
            }
            return param;
          });
          updatedParams = true;
          break;
          
        case 'INTEGRITY_TRAINING':
          console.log('  🎯 Configuring Training auto-scoring (percentage)...');
          scoringConfig = {
            enableAutoScoring: true,
            scoringType: 'percentage',
            autoCalculateOnChange: true,
            showCalculatedScores: true,
            calculationLogic: {
              type: 'percentage_threshold',
              numeratorField: 'completed_employees',
              denominatorField: 'total_employees',
              thresholds: [
                { min: 85, score: 26 },
                { min: 70, max: 84, score: 18 },
                { min: 50, max: 69, score: 10 },
                { max: 49, score: 0 }
              ],
              maxScore: 26
            }
          };
          
          // Add calculation config to number fields
          params = params.map((param: any) => {
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
            return param;
          });
          updatedParams = true;
          break;
          
        case 'ASSET_DECLARATION':
          console.log('  🎯 Configuring AD auto-scoring (percentage)...');
          scoringConfig = {
            enableAutoScoring: true,
            scoringType: 'percentage',
            autoCalculateOnChange: true,
            showCalculatedScores: true,
            calculationLogic: {
              type: 'percentage_threshold',
              numeratorField: 'officials_submitted_on_time',
              denominatorField: 'total_covered_officials',
              thresholds: [
                { min: 100, score: 16 },
                { min: 95, max: 99, score: 10 },
                { min: 90, max: 94, score: 5 },
                { max: 89, score: 0 }
              ],
              maxScore: 16
            }
          };
          
          params = params.map((param: any) => {
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
            return param;
          });
          updatedParams = true;
          break;
          
        case 'CORRUPTION_CASES':
          console.log('  🎯 Configuring Cases auto-scoring (weighted sum)...');
          scoringConfig = {
            enableAutoScoring: true,
            scoringType: 'weighted_sum',
            autoCalculateOnChange: true,
            showCalculatedScores: true,
            calculationLogic: {
              type: 'weighted_threshold',
              weights: { convictions: 3, prosecutions: 2, admin_actions: 1 },
              thresholds: [
                { max: 0, score: 20 },
                { min: 1, max: 2, score: 10 },
                { min: 3, max: 4, score: 5 },
                { min: 5, score: 0 }
              ],
              maxScore: 20
            }
          };
          
          params = params.map((param: any) => {
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
            return param;
          });
          updatedParams = true;
          break;
          
        case 'ATR_RESPONSIVENESS':
          console.log('  🎯 Configuring ATR auto-scoring (percentage)...');
          scoringConfig = {
            enableAutoScoring: true,
            scoringType: 'percentage',
            autoCalculateOnChange: true,
            showCalculatedScores: true,
            calculationLogic: {
              type: 'percentage_threshold',
              numeratorField: 'atrs_submitted_on_time',
              denominatorField: 'total_atrs',
              thresholds: [
                { min: 90, score: 10 },
                { min: 70, max: 89, score: 7 },
                { max: 69, score: 3 }
              ],
              maxScore: 10
            }
          };
          
          params = params.map((param: any) => {
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
            return param;
          });
          updatedParams = true;
          break;
          
        default:
          console.log(`  ⚠️  No specific auto-scoring config for ${indicator.code}`);
          scoringConfig = {
            enableAutoScoring: true,
            autoCalculateOnChange: true,
            showCalculatedScores: true
          };
      }
      
      // Update the indicator with scoring config
      await run(
        'UPDATE indicators SET scoring_config = ? WHERE id = ?',
        [JSON.stringify(scoringConfig), indicator.id]
      );
      
      // Update parameters if modified
      if (updatedParams) {
        await run(
          'UPDATE indicators SET parameters = ? WHERE id = ?',
          [JSON.stringify(params), indicator.id]
        );
      }
      
      console.log(`  ✅ Configured auto-scoring for ${indicator.code}\n`);
    }
    
    // Also update form templates to enable auto-scoring
    console.log('\n📝 Updating form templates for auto-scoring...');
    await run(`
      UPDATE form_templates 
      SET ui_config = json_replace(
        ui_config,
        '$.enableAutoScoring',
        true
      )
      WHERE name LIKE '%AIMS%'
    `);
    
    console.log('✅ Updated form templates');
    
    console.log('\n🎉 Auto-scoring configuration complete!');
    console.log('\n📋 Summary of changes:');
    console.log('• All 5 indicators configured with auto-scoring logic');
    console.log('• Parameters updated with calculation configurations');
    console.log('• Form templates enabled for auto-scoring');
    console.log('\n🚀 Next steps:');
    console.log('1. Restart your backend server');
    console.log('2. Go to ConfigPage → Test Forms');
    console.log('3. Select AIMS form and test auto-scoring');
    
  } catch (error: any) {
    console.error('❌ Error configuring auto-scoring:', error.message);
  } finally {
    db.close();
  }
}

// Run the configuration
configureAutoScoring();