// backend/src/scripts/fix-name-column.ts
import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.resolve('./aim-system.db');
console.log(`📁 Database: ${dbPath}`);

const db = new sqlite3.Database(dbPath);

async function fixNameColumn() {
  console.log('👤 Fixing name column issue...\n');
  
  try {
    // Check current columns
    const columns = await new Promise<any[]>((resolve, reject) => {
      db.all("SELECT name, type FROM pragma_table_info('users')", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log('Current columns:', columns.map(c => c.name).join(', '));
    
    // Check if we have full_name but not name
    const hasFullName = columns.some(c => c.name === 'full_name');
    const hasName = columns.some(c => c.name === 'name');
    
    if (hasFullName && !hasName) {
      console.log('\n⚠️  Database has full_name column but code expects name column');
      
      // Option 1: Add name column and copy data from full_name
      console.log('🔧 Adding name column...');
      await new Promise<void>((resolve, reject) => {
        db.run('ALTER TABLE users ADD COLUMN name TEXT', (err) => {
          if (err) {
            console.log(`❌ Could not add name column: ${err.message}`);
            reject(err);
          } else {
            console.log('✅ Added name column');
            resolve();
          }
        });
      });
      
      // Copy data from full_name to name
      console.log('📋 Copying full_name to name...');
      await new Promise<void>((resolve, reject) => {
        db.run('UPDATE users SET name = full_name WHERE name IS NULL', function(err) {
          if (err) {
            console.log(`❌ Could not copy data: ${err.message}`);
            reject(err);
          } else {
            console.log(`✅ Copied ${this.changes} records`);
            resolve();
          }
        });
      });
      
    } else if (hasName) {
      console.log('✅ name column already exists');
    }
    
    // Also update the admin's name if it's empty
    console.log('\n👑 Setting admin name...');
    await new Promise<void>((resolve, reject) => {
      db.run(
        "UPDATE users SET name = 'System Administrator' WHERE email = 'admin@acc.gov' AND (name IS NULL OR name = '')",
        function(err) {
          if (err) reject(err);
          else {
            console.log(`✅ Set admin name. Rows affected: ${this.changes}`);
            resolve();
          }
        }
      );
    });
    
    // Verify
    const admin = await new Promise<any>((resolve, reject) => {
      db.get(
        "SELECT email, name, role FROM users WHERE email = 'admin@acc.gov'",
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    console.log('\n✅ Admin account:');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Name: ${admin.name}`);
    console.log(`   Role: ${admin.role}`);
    
    console.log('\n🚀 Ready for login!');
    
  } catch (error: any) {
    console.error('❌ Fix failed:', error.message);
  } finally {
    db.close();
  }
}

fixNameColumn();