/**
 * Test script to verify indicator API works after fixes - FIXED VERSION
 */

import sqlite3 from 'sqlite3';

// Promisify helper functions
function getAsync<T>(db: sqlite3.Database, sql: string, params: any[] = []): Promise<T | null> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T || null);
    });
  });
}

function allAsync<T>(db: sqlite3.Database, sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
}

function runAsync(db: sqlite3.Database, sql: string, params: any[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, err => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function testIndicatorAPI() {
  console.log('🧪 Testing Indicator Configuration API Fix...\n');
  
  const db = new sqlite3.Database(process.env.HOME + '/aim-system.db');
  
  try {
    // 1. Test database connection
    console.log('1. Testing database connection...');
    const tableCount = await getAsync<{ count: number }>(
      db,
      "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'"
    );
    console.log(`   ✅ Database connected, ${tableCount?.count || 0} tables found\n`);
    
    // 2. Check indicators_history table structure
    console.log('2. Checking indicators_history table...');
    const historyColumns = await allAsync<any>(
      db,
      "PRAGMA table_info(indicators_history)"
    );
    
    console.log('   Table columns:');
    historyColumns.forEach((col: any) => {
      console.log(`   - ${col.name} (${col.type})${col.notnull ? ' NOT NULL' : ''}`);
    });
    console.log('');
    
    // 3. Check CHECK constraint
    console.log('3. Verifying CHECK constraint...');
    const tableInfo = await getAsync<{ sql: string }>(
      db,
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='indicators_history'"
    );
    
    if (tableInfo?.sql) {
      const hasLowercaseConstraint = tableInfo.sql.includes("'create', 'update', 'delete', 'activate', 'deactivate'");
      const hasUppercaseConstraint = tableInfo.sql.includes("'CREATE', 'UPDATE', 'DELETE', 'ACTIVATE', 'DEACTIVATE'");
      
      if (hasLowercaseConstraint) {
        console.log('   ✅ CHECK constraint: Lowercase (CORRECT)');
      } else if (hasUppercaseConstraint) {
        console.log('   ❌ CHECK constraint: Uppercase (WRONG - needs fixing)');
      } else {
        console.log('   ⚠️  No CHECK constraint found');
      }
    } else {
      console.log('   ❌ Could not read table info');
    }
    console.log('');
    
    // 4. Test inserting with lowercase action (should work)
    console.log('4. Testing history insert with lowercase action...');
    try {
      await runAsync(
        db,
        `INSERT INTO indicators_history (
          indicator_id, version, action, changed_by, snapshot
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          'test_indicator',
          1,
          'update',  // lowercase
          'test_user',
          JSON.stringify({ test: 'data' })
        ]
      );
      console.log('   ✅ Lowercase insert successful\n');
      
      // Clean up test data
      await runAsync(
        db,
        'DELETE FROM indicators_history WHERE indicator_id = ?',
        ['test_indicator']
      );
    } catch (error: any) {
      console.log(`   ❌ Lowercase insert failed: ${error.message}\n`);
    }
    
    // 5. Test inserting with uppercase action (should fail or be converted)
    console.log('5. Testing history insert with uppercase action...');
    try {
      await runAsync(
        db,
        `INSERT INTO indicators_history (
          indicator_id, version, action, changed_by, snapshot
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          'test_indicator2',
          2,
          'UPDATE',  // uppercase
          'test_user',
          JSON.stringify({ test: 'data2' })
        ]
      );
      console.log('   ⚠️  Uppercase insert succeeded (might have trigger converting it)\n');
      
      // Clean up test data
      await runAsync(
        db,
        'DELETE FROM indicators_history WHERE indicator_id = ?',
        ['test_indicator2']
      );
    } catch (error: any) {
      console.log(`   ✅ Uppercase insert correctly failed: ${error.message}\n`);
    }
    
    // 6. Count existing history entries
    console.log('6. Checking existing history entries...');
    const historyCount = await getAsync<{ count: number }>(
      db,
      'SELECT COUNT(*) as count FROM indicators_history'
    );
    console.log(`   Total history entries: ${historyCount?.count || 0}`);
    
    const actionTypes = await allAsync<{ action: string; count: number }>(
      db,
      'SELECT action, COUNT(*) as count FROM indicators_history GROUP BY action'
    );
    
    if (actionTypes.length > 0) {
      console.log('   Action types breakdown:');
      actionTypes.forEach((row: { action: string; count: number }) => {
        console.log(`   - ${row.action}: ${row.count} entries`);
      });
    }
    console.log('');
    
    // 7. Check if indicators are properly seeded
    console.log('7. Verifying AIMS indicators...');
    const indicators = await allAsync<any>(
      db,
      'SELECT id, name, weight, category, is_active FROM indicators ORDER BY display_order'
    );
    
    console.log(`   Total indicators: ${indicators.length}`);
    indicators.forEach((ind: any) => {
      console.log(`   - ${ind.id}: ${ind.name} (${ind.weight}%, ${ind.category}, ${ind.is_active ? 'active' : 'inactive'})`);
    });
    
    // Check total weight
    const totalWeight = indicators.reduce((sum: number, ind: any) => sum + (ind.weight || 0), 0);
    console.log(`\n   Total weight: ${totalWeight}% ${totalWeight === 100 ? '✅' : '❌'}`);
    
    // 8. Check for any triggers
    console.log('\n8. Checking for triggers...');
    const triggers = await allAsync<{ name: string; sql: string }>(
      db,
      "SELECT name, sql FROM sqlite_master WHERE type='trigger' AND name LIKE '%indicators_history%'"
    );
    
    if (triggers.length > 0) {
      console.log('   Found triggers:');
      triggers.forEach((trigger: any) => {
        console.log(`   - ${trigger.name}`);
      });
    } else {
      console.log('   No triggers found');
    }
    
    console.log('\n🎉 Indicator Configuration Test Complete!');
    console.log('\nSummary:');
    console.log(`   - Database: ${tableCount?.count || 0} tables`);
    console.log(`   - Indicators: ${indicators.length} (${totalWeight}% total weight)`);
    console.log(`   - History entries: ${historyCount?.count || 0}`);
    
    if (totalWeight === 100) {
      console.log('\n✅ AIMS indicators properly seeded with 100% total weight');
    } else {
      console.log(`\n⚠️  Warning: Total weight is ${totalWeight}%, should be 100%`);
    }
    
    console.log('\nNext steps:');
    console.log('1. Restart the backend server');
    console.log('2. Test the ConfigPage UI');
    console.log('3. Create test assessment with AIMS indicators');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    db.close();
  }
}

// Run test
testIndicatorAPI().catch(console.error);