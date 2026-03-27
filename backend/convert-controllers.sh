#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting controller conversion...${NC}"

# Create backup
BACKUP_DIR="src.backup.$(date +%Y%m%d_%H%M%S)"
echo -e "${YELLOW}Creating backup in $BACKUP_DIR${NC}"
cp -r src "$BACKUP_DIR"

# Count files to convert
TOTAL_FILES=$(find src/controllers -name "*.ts" | wc -l | tr -d ' ')
CONVERTED=0

echo -e "${YELLOW}Found $TOTAL_FILES controller files to convert${NC}"

# Convert each controller file
for file in src/controllers/*.ts; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}Converting $file${NC}"
        
        # Add imports if not present
        if ! grep -q "import.*getAsync.*from.*\.\.\/models\/db" "$file"; then
            sed -i '' '1s/^/import { getDB, getAsync, runAsync, allAsync } from '\''..\/models\/db'\'';\n/' "$file"
        fi
        
        # Replace db.get with await getAsync
        sed -i '' 's/db\.get(/await getAsync(db, /g' "$file"
        
        # Replace db.run with await runAsync
        sed -i '' 's/db\.run(/await runAsync(db, /g' "$file"
        
        # Replace db.all with await allAsync
        sed -i '' 's/db\.all(/await allAsync(db, /g' "$file"
        
        # Add try-catch wrapper around async operations
        # This is a simple replacement - manual fixes may be needed
        sed -i '' 's/const db = getDB();/const db = getDB();\n  try {/g' "$file"
        
        CONVERTED=$((CONVERTED + 1))
    fi
done

echo -e "${GREEN}Converted $CONVERTED out of $TOTAL_FILES files${NC}"
echo -e "${YELLOW}Please review the converted files and fix any remaining issues${NC}"
echo -e "${YELLOW}Backup saved to $BACKUP_DIR${NC}"
