// backend/src/scripts/check-db.ts
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

// Check database location
const dbPath = path.resolve('./aim-system.db');
console.log(`🔍 Checking database: ${dbPath}`);

if (!fs.existsSync(dbPath)) {
  console.error('❌ Database file not found!');
  process.exit(1);
}

const db = new sqlite3.Database(dbPath);

function query<T>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
}

async function checkDatabase() {
  try {
    console.log('\n📊 Database Analysis:');
    
    // 1. List all tables
    const tables = await query<{name: string}>(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    );
    
    console.log(`\n📋 Found ${tables.length} tables:`);
    tables.forEach(table => console.log(`   - ${table.name}`));
    
    // 2. Check assessments table specifically
    console.log('\n🔍 Checking assessments table:');
    const assessmentsColumns = await query<{name: string, type: string}>(
      "SELECT name, type FROM pragma_table_info('assessments')"
    );
    
    console.log(`   Columns (${assessmentsColumns.length}):`);
    assessmentsColumns.forEach(col => {
      const hasFinalScore = col.name === 'final_score' ? ' ✅' : '';
      console.log(`   - ${col.name} (${col.type})${hasFinalScore}`);
    });
    
    // 3. Check if final_score exists
    const hasFinalScore = assessmentsColumns.some(col => col.name === 'final_score');
    
    if (hasFinalScore) {
      console.log('\n✅ final_score column EXISTS in database!');
      console.log('\n💡 The error might be from:');
      console.log('   • A different database file');
      console.log('   • Cached query in backend');
      console.log('   • Need to restart backend');
    } else {
      console.log('\n❌ final_score column is MISSING!');
      console.log('\n🚀 Running fix...');
      
      // Add the column
      await new Promise<void>((resolve, reject) => {
        db.run('ALTER TABLE assessments ADD COLUMN final_score REAL', (err) => {
          if (err) {
            // Try a different approach
            console.log('   Trying alternative fix...');
            db.run('ALTER TABLE assessments ADD COLUMN final_score REAL DEFAULT NULL', (err2) => {
              if (err2) reject(err2);
              else {
                console.log('✅ Added final_score column');
                resolve();
              }
            });
          } else {
            console.log('✅ Added final_score column');
            resolve();
          }
        });
      });
    }
    
    // 4. Check current backend stats query
    console.log('\n📈 Sample stats query test:');
    
    try {
      const stats = await query<{total_assessments: number, avg_score: number}>(
        `SELECT 
          COUNT(*) as total_assessments,
          AVG(COALESCE(final_score, overall_score)) as avg_score
         FROM assessments`
      );
      
      console.log(`   Total assessments: ${stats[0]?.total_assessments || 0}`);
      console.log(`   Average score: ${stats[0]?.avg_score || 0}`);
    } catch (error: any) {
      console.log(`   Query error: ${error.message}`);
    }
    
  } catch (error: any) {
    console.error('❌ Check failed:', error.message);
  } finally {
    db.close();
    console.log('\n🔧 FIX INSTRUCTIONS:');
    console.log('1. If final_score was added, RESTART your backend');
    console.log('2. Refresh ConfigPage in browser');
    console.log('3. Check if error is gone');
    console.log('\nIf error persists, check:');
    console.log('• Backend is using correct database file');
    console.log('• No other database files exist');
    console.log('• Clear browser cache');
  }
}

checkDatabase();