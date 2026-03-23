// backend/init-db.js
const { initializeDatabase } = require('./src/models/db');

initializeDatabase()
  .then(() => {
    console.log('✅ Database initialized successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Database initialization failed:', err);
    process.exit(1);
  });