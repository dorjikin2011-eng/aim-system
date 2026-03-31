const fs = require('fs');
const path = require('path');

// Folder to scan (your frontend src folder)
const SRC_DIR = path.join(__dirname, 'src');

// Regex to find /api/ calls
const API_REGEX = /(['"`])\/api\//g;

// Function to recursively scan files
function scanAndReplace(dir) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      scanAndReplace(fullPath); // recurse into subdirectory
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf-8');
      const newContent = content.replace(API_REGEX, `$1\${API_BASE}/api/`);
      
      if (newContent !== content) {
        fs.writeFileSync(fullPath, newContent, 'utf-8');
        console.log(`Updated: ${fullPath}`);
      }
    }
  });
}

// Run
scanAndReplace(SRC_DIR);
console.log('✅ All /api/ calls replaced with ${API_BASE}/api/');
