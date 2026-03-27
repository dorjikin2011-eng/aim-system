// backend/src/scripts/fix-admin-role.ts
import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.resolve('./aim-system.db');
console.log(`📁 Database: ${dbPath}`);

const db = new sqlite3.Database(dbPath);

async function fixAdminRole() {
  console.log('👑 Fixing admin role...\n');
  
  try {
    // First, check what valid roles the system expects
    console.log('📋 Checking valid roles in database schema...');
    
    const schema = await new Promise<any>((resolve, reject) => {
      db.get(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='users'",
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (schema?.sql) {
      // Extract role check constraint
      const roleMatch = schema.sql.match(/role.*CHECK.*role IN \((.*?)\)/i);
      if (roleMatch) {
        console.log('Valid roles:', roleMatch[1]);
      }
    }
    
    // Check current admin role
    const admin = await new Promise<any>((resolve, reject) => {
      db.get(
        'SELECT email, role FROM users WHERE email = ?',
        ['admin@acc.gov'],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    console.log(`\nCurrent admin role: ${admin?.role}`);
    
    // Update to a valid role - try 'system_admin' or 'commissioner'
    const validRoles = ['system_admin', 'commissioner', 'director', 'prevention_officer', 'agency_head', 'focal_person'];
    
    // Try system_admin first
    await new Promise<void>((resolve, reject) => {
      db.run(
        'UPDATE users SET role = ? WHERE email = ?',
        ['system_admin', 'admin@acc.gov'],
        function(err) {
          if (err) {
            console.log(`❌ Cannot set role to system_admin: ${err.message}`);
            reject(err);
          } else {
            console.log(`✅ Updated role to system_admin`);
            console.log(`Rows affected: ${this.changes}`);
            resolve();
          }
        }
      );
    });
    
    // Verify
    const updated = await new Promise<any>((resolve, reject) => {
      db.get(
        'SELECT email, role FROM users WHERE email = ?',
        ['admin@acc.gov'],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    console.log('\n✅ Updated admin account:');
    console.log(`   Email: ${updated.email}`);
    console.log(`   Role: ${updated.role}`);
    console.log('\n🚀 Login with:');
    console.log(`   Email: admin@acc.gov`);
    console.log(`   Password: admin123`);
    
  } catch (error: any) {
    console.error('❌ Role fix failed:', error.message);
    
    // Try alternative role
    try {
      await new Promise<void>((resolve, reject) => {
        db.run(
          'UPDATE users SET role = ? WHERE email = ?',
          ['commissioner', 'admin@acc.gov'],
          function(err) {
            if (err) reject(err);
            else {
              console.log(`\n✅ Updated role to commissioner as fallback`);
              resolve();
            }
          }
        );
      });
    } catch (fallbackError: any) {
      console.error('❌ Fallback also failed:', fallbackError.message);
    }
  } finally {
    db.close();
  }
}

fixAdminRole();