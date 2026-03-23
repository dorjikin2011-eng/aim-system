// backend/test-direct-sql.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'src', 'aim-system.db');
const db = new sqlite3.Database(dbPath);

db.get(`
  SELECT scoring_rules FROM indicators WHERE id = ?
`, ['ind_iccs'], (err, row) => {
  if (err) {
    console.error('Error:', err);
    return;
  }
  
  console.log('Raw scoring_rules JSON:');
  console.log(row.scoring_rules);
  
  const rules = JSON.parse(row.scoring_rules);
  console.log('\nParsed first rule:');
  console.log(JSON.stringify(rules[0], null, 2));
  
  console.log('\nKeys in first rule:');
  console.log(Object.keys(rules[0]));
  
  console.log('\nHas parameter_code?', 'parameter_code' in rules[0]);
  console.log('Has parameterCode?', 'parameterCode' in rules[0]);
  console.log('parameter_code value:', rules[0].parameter_code);
  
  db.close();
});
