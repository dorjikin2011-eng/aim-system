import fs from 'fs';
import path from 'path';

const SRC_DIR = path.join(process.cwd(), 'src');
const IMPORT_LINE = "import { API_BASE } from '../../config';\n";

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Skip if the import already exists
  if (content.includes('API_BASE')) {
    const firstLine = content.split('\n')[0];
    if (!firstLine.includes('API_BASE')) {
      fs.writeFileSync(filePath, IMPORT_LINE + content, 'utf-8');
      console.log(`Added import to: ${filePath}`);
    }
  }
}

function walkDir(dir) {
  fs.readdirSync(dir).forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (/\.(ts|tsx|js|jsx)$/.test(file)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      if (content.includes('API_BASE')) {
        processFile(fullPath);
      }
    }
  });
}

walkDir(SRC_DIR);

console.log('✅ Done adding API_BASE imports!');