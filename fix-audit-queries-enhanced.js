// fix-audit-queries-enhanced.js
const fs = require('fs');
const path = require('path');

const files = [
  'backend/src/controllers/adminLogController.ts',
  'backend/src/controllers/commissionDashboardController.ts',
  'backend/src/controllers/directorController.ts'
];

const dryRun = process.argv.includes('--dry-run');
const verbose = process.argv.includes('--verbose') || process.argv.includes('-v');

const replacements = [
  { pattern: /\bal\.user_id\b/g, replacement: 'al.actor_id' },
  { pattern: /\baudit_logs\.user_id\b/g, replacement: 'audit_logs.actor_id' },
  { pattern: /\bWHERE\s+user_id\s*=/gi, replacement: 'WHERE actor_id =' },
  { pattern: /\buser_id\s+as\s+(\w+)/gi, replacement: 'actor_id as $1' },
  { pattern: /['"]user_id['"]\s*:/g, replacement: '"actor_id":' },
  { pattern: /'user_id'\s*:/g, replacement: "'actor_id':" },
];

console.log('🔧 Fixing audit log queries...\n');
if (dryRun) console.log('⚠️  DRY RUN - No files will be modified\n');

let totalFiles = 0;
let filesFixed = 0;
let changesCount = 0;

files.forEach(filePath => {
  totalFiles++;
  try {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;
      
      // Apply all replacements
      replacements.forEach(({ pattern, replacement }) => {
        content = content.replace(pattern, replacement);
      });
      
      if (content !== originalContent) {
        filesFixed++;
        
        if (!dryRun) {
          // Create backup first
          const backupPath = filePath + '.backup-' + Date.now();
          fs.copyFileSync(filePath, backupPath);
          
          fs.writeFileSync(filePath, content, 'utf8');
          console.log(`✅ Fixed: ${filePath}`);
          console.log(`   Backup: ${backupPath}`);
        } else {
          console.log(`📝 Would fix: ${filePath}`);
        }
        
        // Show changes
        const originalLines = originalContent.split('\n');
        const newLines = content.split('\n');
        const changedLines = [];
        
        newLines.forEach((line, index) => {
          const origLine = originalLines[index] || '';
          if (line !== origLine && (line.includes('actor_id') || line.includes('user_id'))) {
            changedLines.push({ line: line.trim(), index: index + 1 });
            changesCount++;
          }
        });
        
        if (changedLines.length > 0 && verbose) {
          console.log('   Changes:');
          changedLines.forEach(({ line, index }) => {
            console.log(`   Line ${index}: ${line}`);
          });
        } else if (changedLines.length > 0) {
          console.log(`   Made ${changedLines.length} change(s)`);
        }
      } else {
        console.log(`✓ No changes needed: ${filePath}`);
      }
    } else {
      console.log(`❌ File not found: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error.message);
  }
});

console.log('\n🎉 Fixes completed!');
console.log('\n📊 Summary Report:');
console.log(`   Total files processed: ${totalFiles}`);
console.log(`   Files modified: ${filesFixed}`);
console.log(`   Total changes made: ${changesCount}`);

if (!dryRun) {
  console.log('\nNext steps:');
  console.log('1. Restart your backend server');
  console.log('2. Check if audit log errors are gone');
  console.log('3. If errors persist, check for additional user_id references');
  console.log('4. Consider running database migrations if column name changed');
}
