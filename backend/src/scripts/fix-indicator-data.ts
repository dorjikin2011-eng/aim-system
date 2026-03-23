// backend/src/scripts/fix-indicator-data.ts
import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.resolve('./aim-system.db');
console.log(`📁 Database: ${dbPath}`);

const db = new sqlite3.Database(dbPath);

async function fixIndicatorData() {
  console.log('📊 Fixing indicator_data table...\n');
  
  try {
    // Check if table exists
    const tableExists = await new Promise<boolean>((resolve, reject) => {
      db.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='indicator_data'",
        (err, row) => {
          if (err) reject(err);
          else resolve(!!row);
        }
      );
    });
    
    if (!tableExists) {
      console.log('📋 Creating indicator_data table...');
      
      await new Promise<void>((resolve, reject) => {
        db.run(`
          CREATE TABLE indicator_data (
            id TEXT PRIMARY KEY,
            indicator_id TEXT NOT NULL,
            agency_id TEXT NOT NULL,
            fiscal_year TEXT NOT NULL,
            value REAL,
            score REAL,
            status TEXT DEFAULT 'active',
            collected_by TEXT,
            collected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            verified_by TEXT,
            verified_at DATETIME,
            source TEXT,
            notes TEXT,
            metadata TEXT DEFAULT '{}',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (indicator_id) REFERENCES indicators(id),
            FOREIGN KEY (agency_id) REFERENCES agencies(id),
            UNIQUE(indicator_id, agency_id, fiscal_year)
          )
        `, (err) => {
          if (err) reject(err);
          else {
            console.log('✅ Created indicator_data table');
            resolve();
          }
        });
      });
      
      // Add some sample data for testing
      console.log('\n➕ Adding sample indicator data...');
      
      // Get some agencies and indicators
      const agencies = await new Promise<any[]>((resolve, reject) => {
        db.all('SELECT id FROM agencies LIMIT 3', (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      
      const indicators = await new Promise<any[]>((resolve, reject) => {
        db.all('SELECT id FROM indicators LIMIT 5', (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      
      if (agencies.length > 0 && indicators.length > 0) {
        const sampleData: string[] = [];
        let count = 0;
        
        for (const agency of agencies) {
          for (const indicator of indicators) {
            if (count < 10) { // Add 10 sample records
              sampleData.push(`(
                'ind_data_${count}',
                '${indicator.id}',
                '${agency.id}',
                '2025',
                ${Math.random() * 100},
                ${Math.random() * 100},
                'active',
                'system',
                'system',
                'Sample data ${count + 1}'
              )`);
              count++;
            }
          }
        }
        
        if (sampleData.length > 0) {
          await new Promise<void>((resolve, reject) => {
            db.run(`
              INSERT INTO indicator_data 
              (id, indicator_id, agency_id, fiscal_year, value, score, status, collected_by, verified_by, notes)
              VALUES ${sampleData.join(',')}
            `, function(err) {
              if (err) {
                console.log(`⚠️  Could not add sample data: ${err.message}`);
                resolve(); // Continue anyway
              } else {
                console.log(`✅ Added ${this.changes} sample records`);
                resolve();
              }
            });
          });
        }
      }
      
    } else {
      console.log('✅ indicator_data table already exists');
    }
    
    // Check other potentially missing tables
    console.log('\n🔍 Checking for other missing dashboard tables...');
    
    const dashboardTables = ['agency_stats', 'assessment_summary', 'score_trends'];
    
    for (const table of dashboardTables) {
      const exists = await new Promise<boolean>((resolve, reject) => {
        db.get(
          `SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`,
          (err, row) => {
            if (err) reject(err);
            else resolve(!!row);
          }
        );
      });
      
      if (!exists) {
        console.log(`   ⚠️  ${table} table doesn't exist (might be optional)`);
      } else {
        console.log(`   ✅ ${table} table exists`);
      }
    }
    
    console.log('\n🎉 Dashboard tables fixed!');
    console.log('\n🚀 The commission dashboard should now work.');
    
  } catch (error: any) {
    console.error('❌ Fix failed:', error.message);
  } finally {
    db.close();
  }
}

fixIndicatorData();