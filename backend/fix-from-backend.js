const fs = require('fs');
const path = require('path');

const files = [
  'src/controllers/adminLogController.ts',
  'src/controllers/commissionDashboardController.ts',
  'src/controllers/directorController.ts'
];

console.log('🔧 Fixing audit log queries from backend directory...\n');

let totalChanges = 0;
let filesModified = 0;

files.forEach(filePath => {
  try {
    console.log(`📄 Processing: ${filePath}`);
    
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;
      const originalLines = content.split('\n');
      
      // Track changes for this file
      let fileChanges = [];
      
      // Fix al.user_id to al.actor_id
      if (content.includes('al.user_id')) {
        const before = (content.match(/al\.user_id/g) || []).length;
        content = content.replace(/al\.user_id/g, 'al.actor_id');
        const after = (content.match(/al\.actor_id/g) || []).length;
        if (before > 0) fileChanges.push(`al.user_id → al.actor_id (${before} occurrences)`);
      }
      
      // Fix audit_logs.user_id to audit_logs.actor_id
      if (content.includes('audit_logs.user_id')) {
        const before = (content.match(/audit_logs\.user_id/g) || []).length;
        content = content.replace(/audit_logs\.user_id/g, 'audit_logs.actor_id');
        const after = (content.match(/audit_logs\.actor_id/g) || []).length;
        if (before > 0) fileChanges.push(`audit_logs.user_id → audit_logs.actor_id (${before} occurrences)`);
      }
      
      // Fix WHERE user_id = to WHERE actor_id =
      if (content.match(/WHERE\s+user_id\s*=/i)) {
        const before = (content.match(/WHERE\s+user_id\s*=/gi) || []).length;
        content = content.replace(/WHERE\s+user_id\s*=/gi, 'WHERE actor_id =');
        if (before > 0) fileChanges.push(`WHERE user_id = → WHERE actor_id = (${before} occurrences)`);
      }
      
      // Fix where user_id = to where actor_id = (lowercase)
      if (content.match(/where\s+user_id\s*=/)) {
        const before = (content.match(/where\s+user_id\s*=/g) || []).length;
        content = content.replace(/where\s+user_id\s*=/g, 'where actor_id =');
        if (before > 0) fileChanges.push(`where user_id = → where actor_id = (${before} occurrences)`);
      }
      
      // Additional common patterns
      const patterns = [
        { from: /\buser_id\s+as\s+\w+/gi, to: match => match.replace('user_id', 'actor_id') },
        { from: /SELECT.*\buser_id\b.*FROM/gi, to: match => match.replace('user_id', 'actor_id') },
        { from: /GROUP BY\s+user_id/gi, to: 'GROUP BY actor_id' },
        { from: /ORDER BY\s+user_id/gi, to: 'ORDER BY actor_id' },
        { from: /JOIN.*ON.*user_id/gi, to: match => match.replace('user_id', 'actor_id') },
        { from: /['"]user_id['"]\s*:/g, to: '"actor_id":' },
        { from: /'user_id'\s*:/g, to: "'actor_id':" },
      ];
      
      patterns.forEach(pattern => {
        if (pattern.from.test(content)) {
          const beforeMatches = content.match(pattern.from) || [];
          content = content.replace(pattern.from, pattern.to);
          if (beforeMatches.length > 0) {
            fileChanges.push(`Pattern fixed (${beforeMatches.length} occurrences)`);
          }
        }
      });
      
      if (content !== originalContent) {
        // Create backup
        const backupPath = filePath + '.backup-' + Date.now();
        fs.writeFileSync(backupPath, originalContent, 'utf8');
        
        // Write fixed file
        fs.writeFileSync(filePath, content, 'utf8');
        
        filesModified++;
        totalChanges += fileChanges.length;
        
        console.log(`  ✅ Fixed (backup: ${backupPath})`);
        
        if (fileChanges.length > 0) {
          console.log('  Changes made:');
          fileChanges.forEach(change => {
            console.log(`    • ${change}`);
          });
        }
      } else {
        console.log(`  ✓ No changes needed`);
      }
    } else {
      console.log(`  ❌ File not found`);
    }
  } catch (error) {
    console.error(`  Error: ${error.message}`);
  }
  
  console.log(''); // Empty line between files
});

console.log('🎉 Fixes completed!');
console.log(`📊 Summary: Modified ${filesModified}/${files.length} files, ${totalChanges} total changes`);

if (filesModified > 0) {
  console.log('\nNext steps:');
  console.log('1. Restart your backend server');
  console.log('2. Check if audit log errors are gone');
}
