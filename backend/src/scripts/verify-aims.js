// backend/src/scripts/verify-aims.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../aim-system.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Verifying AIMS setup in aim-system.db...\n');

// Check indicators
db.all("SELECT code, name, weight, max_score, is_active FROM indicators WHERE is_active = 1 ORDER BY display_order", (err, rows) => {
  if (err) {
    console.error('❌ Error:', err.message);
    db.close();
    return;
  }
  
  console.log(`📊 Active Indicators (${rows.length}):`);
  rows.forEach(row => {
    console.log(`   ${row.code} - ${row.name} (${row.weight}/${row.max_score} points)`);
  });
  
  // Check AIMS specific
  const aimsCodes = ['ICCS', 'INTEGRITY_TRAINING', 'ASSET_DECLARATION', 'CORRUPTION_CASES', 'ATR_RESPONSIVENESS'];
  const foundCodes = rows.map(r => r.code);
  console.log('\n🎯 AIMS Indicators Check:');
  aimsCodes.forEach(code => {
    if (foundCodes.includes(code)) {
      console.log(`   ${code}: ✅ Found`);
    } else {
      console.log(`   ${code}: ❌ Missing`);
    }
  });
  
  // Check templates
  db.all("SELECT code, name FROM form_templates WHERE is_active = 1", (err, templateRows) => {
    if (err) {
      console.error('❌ Error:', err.message);
      db.close();
      return;
    }
    
    console.log(`\n📝 Active Templates (${templateRows.length}):`);
    templateRows.forEach(row => {
      console.log(`   ${row.code} - ${row.name}`);
    });
    
    console.log('\n' + '='.repeat(50));
    if (rows.length >= 5 && templateRows.length >= 5) {
      console.log('✅ SETUP SUCCESSFUL!');
      console.log('Prevention officers can now use dynamic forms.');
    } else {
      console.log('⚠️  Setup may be incomplete.');
      console.log(`   Expected: 5 indicators, Found: ${rows.length}`);
      console.log(`   Expected: 5 templates, Found: ${templateRows.length}`);
    }
    console.log('='.repeat(50));
    
    db.close();
  });
});