// fixApiBase.mjs
import fs from 'fs';
import path from 'path';

const SRC_DIR = path.join(process.cwd(), 'src');

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(filePath));
    } else if (/\.(js|ts|jsx|tsx)$/.test(file)) {
      results.push(filePath);
    }
  });
  return results;
}

function fixApiCalls(file) {
  let content = fs.readFileSync(file, 'utf-8');

  // Fix accidental double ${API_BASE}${API_BASE}
  content = content.replace(/\$\{API_BASE\}\$\{API_BASE\}/g, '${API_BASE}');

  // Replace '/api/' calls with `${API_BASE}/api/`
  content = content.replace(/(['"`])\/api\//g, '`${API_BASE}/');

  fs.writeFileSync(file, content, 'utf-8');
  console.log(`Fixed API calls in: ${file}`);
}

const files = walkDir(SRC_DIR);
files.forEach(fixApiCalls);

console.log('✅ All API calls fixed.');