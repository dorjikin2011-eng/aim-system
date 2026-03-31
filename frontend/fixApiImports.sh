# fixApiImports.sh
#!/bin/bash

# Root directory
ROOT_DIR="./src"

# Find all .ts/.tsx/.js/.jsx files containing 'API_BASE' import
grep -rl "API_BASE" $ROOT_DIR --include \*.{ts,tsx,js,jsx} | while read file; do
  # Determine relative path depth to src/config.ts
  depth=$(echo "$file" | awk -F"/" '{print NF-2}')  # NF-2 assumes ROOT_DIR is ./src
  relativePath=$(printf '../%.0s' $(seq 2 $depth))
  relativePath="${relativePath}config"

  # Replace existing import of API_BASE with correct relative path
  sed -i '' -E "s|import \{ API_BASE \} from .+;|import { API_BASE } from '${relativePath}';|" "$file"
done

echo "All API_BASE imports fixed!"