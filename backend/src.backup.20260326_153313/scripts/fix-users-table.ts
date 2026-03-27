// backend/src/scripts/fix-users-table.ts
import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.resolve('./aim-system.db');
console.log(`📁 Database: ${dbPath}`);

const db = new sqlite3.Database(dbPath);

function run(sql: string): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function fixUsersTable() {
  console.log('🔧 Fixing users table schema...\n');
  
  try {
    // Check current columns
    const columns = await new Promise<any[]>((resolve, reject) => {
      db.all("SELECT name, type FROM pragma_table_info('users')", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log('Current columns:', columns.map(c => c.name).join(', '));
    
    // Add missing columns if they don't exist
    const missingColumns = [
      'lock_until DATETIME',
      'login_attempts INTEGER DEFAULT 0',
      'last_password_change DATETIME DEFAULT CURRENT_TIMESTAMP',
      'last_login DATETIME',
      'password_reset_token TEXT',
      'password_reset_expires DATETIME',
      'department TEXT',
      'phone TEXT',
      'profile_image TEXT'
    ];
    
    for (const columnDef of missingColumns) {
      const columnName = columnDef.split(' ')[0];
      
      if (!columns.some(c => c.name === columnName)) {
        try {
          await run(`ALTER TABLE users ADD COLUMN ${columnDef}`);
          console.log(`✅ Added column: ${columnName}`);
        } catch (error: any) {
          console.log(`⚠️  Could not add ${columnName}: ${error.message}`);
        }
      } else {
        console.log(`✅ Column already exists: ${columnName}`);
      }
    }
    
    // Also fix the email for admin login
    console.log('\n📧 Fixing admin email...');
    await run(`UPDATE users SET email = 'admin@acc.gov' WHERE email = 'admin@aims.gov'`);
    console.log('✅ Updated admin email to admin@acc.gov');
    
    // Verify fix
    const fixedColumns = await new Promise<any[]>((resolve, reject) => {
      db.all("SELECT name FROM pragma_table_info('users')", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log('\n🎉 Users table fixed!');
    console.log(`Total columns: ${fixedColumns.length}`);
    
  } catch (error: any) {
    console.error('❌ Fix failed:', error.message);
  } finally {
    db.close();
    console.log('\n🚀 Restart your backend and try login again.');
  }
}

fixUsersTable();