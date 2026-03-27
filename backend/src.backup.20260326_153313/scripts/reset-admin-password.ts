// backend/src/scripts/reset-admin-password.ts
import sqlite3 from 'sqlite3';
import path from 'path';
import bcrypt from 'bcrypt';

const dbPath = path.resolve('./aim-system.db');
console.log(`📁 Database: ${dbPath}`);

const db = new sqlite3.Database(dbPath);

async function resetPassword() {
  console.log('🔑 Resetting admin password...\n');
  
  try {
    // Hash the new password
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log(`New password: ${password}`);
    console.log(`Hashed: ${hashedPassword.substring(0, 30)}...`);
    
    // Update the admin password
    await new Promise<void>((resolve, reject) => {
      db.run(
        'UPDATE users SET password_hash = ? WHERE email = ?',
        [hashedPassword, 'admin@acc.gov'],
        function(err) {
          if (err) reject(err);
          else {
            console.log(`✅ Password updated for admin@acc.gov`);
            console.log(`Rows affected: ${this.changes}`);
            resolve();
          }
        }
      );
    });
    
    // Verify
    const user = await new Promise<any>((resolve, reject) => {
      db.get(
        'SELECT email, role FROM users WHERE email = ?',
        ['admin@acc.gov'],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    console.log('\n✅ Admin account:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log('\n🚀 Login with:');
    console.log(`   Email: admin@acc.gov`);
    console.log(`   Password: admin123`);
    
  } catch (error: any) {
    console.error('❌ Password reset failed:', error.message);
  } finally {
    db.close();
  }
}

resetPassword();