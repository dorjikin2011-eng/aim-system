const fs = require('fs');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

pkg.scripts = {
  dev: "nodemon --exec ts-node src/server.ts",
  build: "tsc",
  start: "node dist/server.js"
};

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log("✅ package.json updated with 'dev', 'build', 'start' scripts.");
