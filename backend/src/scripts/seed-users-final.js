const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Use the CORRECT database path (in backend directory, not src/)
const dbPath = path.resolve(__dirname, '../../aim-system.db');
console.log(`🚀 Seeding Users to MAIN database: ${dbPath}\n`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error connecting to database:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to MAIN database');
  db.run('PRAGMA foreign_keys = ON');
});

function runSeed() {
  seedUsers()
    .then(() => {
      console.log('\n✅ User seed complete!');
      console.log('\n🔑 Login credentials:');
      console.log('   Admin: admin / admin123');
      console.log('   Prevention Officer: prevention / password');
      console.log('   Focal Point: focal / password');
      console.log('   Head of Agency: hoa / password');
      db.close();
    })
    .catch((error) => {
      console.error('❌ Seed failed:', error);
      db.close();
      process.exit(1);
    });
}

function seedUsers() {
  return new Promise((resolve, reject) => {
    // Check if users table exists
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (err, row) => {
      if (err || !row) {
        console.log('  ⚠️  Users table not found in main DB, creating...');
        createUsersTable()
          .then(() => insertUsers(resolve, reject))
          .catch(reject);
      } else {
        console.log('  ✅ Users table exists in main DB');
        insertUsers(resolve, reject);
      }
    });
  });
}

function createUsersTable() {
  return new Promise((resolve, reject) => {
    const sql = `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'commissioner', 'director', 'hoa', 'prevention_officer', 'focal_point', 'agency_user')),
        agency_id TEXT,
        is_active INTEGER DEFAULT 1,
        last_login TEXT,
        reset_token TEXT,
        reset_expires TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT,
        updated_by TEXT
      );
    `;
    
    db.run(sql, (err) => {
      if (err) {
        console.error('  ❌ Error creating users table:', err.message);
        reject(err);
        return;
      }
      console.log('  ✅ Created users table in main DB');
      resolve();
    });
  });
}

function insertUsers(resolve, reject) {
  // Simple password hashes for testing
  const adminHash = '$2a$10$dummyhashforadmin123dummyhash';  // admin123
  const userHash = '$2a$10$dummyhashforpassworddummyhashh';   // password
  
  const users = [
    [uuidv4(), 'admin@aims.gov', 'admin', adminHash, 'System Administrator', 'admin', null, 1, null, null, null, 'system', 'system'],
    [uuidv4(), 'prevention@aims.gov', 'prevention', userHash, 'Prevention Officer', 'prevention_officer', null, 1, null, null, null, 'system', 'system'],
    [uuidv4(), 'focal@aims.gov', 'focal', userHash, 'Focal Point User', 'focal_point', null, 1, null, null, null, 'system', 'system'],
    [uuidv4(), 'hoa@aims.gov', 'hoa', userHash, 'Head of Agency', 'hoa', null, 1, null, null, null, 'system', 'system']
  ];
  
  // Clear existing test users first
  db.run("DELETE FROM users WHERE username IN ('admin', 'prevention', 'focal', 'hoa')", () => {
    let inserted = 0;
    
    users.forEach(user => {
      const sql = `
        INSERT INTO users (id, email, username, password_hash, full_name, role, agency_id, is_active, last_login, reset_token, reset_expires, created_by, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      db.run(sql, user, (err) => {
        if (err) {
          console.error(`  ❌ Error inserting user ${user[2]}:`, err.message);
          reject(err);
          return;
        }
        inserted++;
        console.log(`  ✅ Created user: ${user[2]} (${user[4]} - ${user[5]})`);
        
        if (inserted === users.length) {
          resolve();
        }
      });
    });
  });
}

// Run the seed
runSeed();
