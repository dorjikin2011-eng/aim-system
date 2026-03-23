// backend/migrate-agencies-status.js
const { getDB, runAsync } = require('./dist/models/db');

async function addStatusColumn() {
  const db = getDB();
  
  try {
    // Check if column exists
    const columns = await new Promise((resolve, reject) => {
      db.all("PRAGMA table_info(agencies)", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    const hasStatus = columns.some(col => col.name === 'status');
    
    if (!hasStatus) {
      console.log('Adding status column to agencies table...');
      
      // Add column
      await runAsync(db, 
        'ALTER TABLE agencies ADD COLUMN status TEXT DEFAULT "active" CHECK(status IN ("active", "inactive", "archived"))'
      );
      
      // Update existing rows
      await runAsync(db, 'UPDATE agencies SET status = "active" WHERE status IS NULL');
      
      console.log('✅ Added status column to agencies table');
    } else {
      console.log('✅ Status column already exists');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

addStatusColumn();