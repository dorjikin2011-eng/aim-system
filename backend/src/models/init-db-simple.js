// init-db-simple.js
// Use CommonJS require to avoid ES module issues
const { initializeDatabase } = require('./backend/src/models/db');

async function main() {
  console.log('🚀 Starting database initialization...');
  const success = await initializeDatabase();
  
  if (success) {
    console.log('✅ Database setup complete!');
    process.exit(0);
  } else {
    console.error('❌ Database setup failed!');
    process.exit(1);
  }
}

// Run it
main().catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});