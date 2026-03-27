// backend/src/scripts/test-connection.ts
import { getDB } from '../models/db';

console.log('🔌 Testing database connection from your app...');

try {
  const db = getDB();
  
  // Test the exact query that's failing
  db.get(`
    SELECT 
      COUNT(*) as total_assessments,
      AVG(final_score) as avg_score
    FROM assessments
  `, (err, row: any) => {
    if (err) {
      console.error('❌ Query failed:', err.message);
      
      // Try alternative query
      console.log('\n🔧 Trying alternative query...');
      db.get(`
        SELECT 
          COUNT(*) as total_assessments,
          AVG(COALESCE(final_score, overall_score)) as avg_score
        FROM assessments
      `, (err2, row2: any) => {
        if (err2) {
          console.error('❌ Alternative also failed:', err2.message);
        } else {
          console.log('✅ Alternative query works!');
          console.log('Result:', row2);
        }
        process.exit(0);
      });
    } else {
      console.log('✅ Query successful!');
      console.log('Result:', row);
      process.exit(0);
    }
  });
  
} catch (error: any) {
  console.error('❌ Connection test failed:', error.message);
  process.exit(1);
}