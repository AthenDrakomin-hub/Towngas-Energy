#!/bin/bash
set -e
cd /opt/carbon-nebula

# 1. 添加 bcryptjs 和 postgres 依赖
python3 -c "
import json
with open('package.json') as f:
    pkg = json.load(f)
pkg['dependencies']['bcryptjs'] = '^2.4.3'
pkg['dependencies']['postgres'] = '^3.4.4'
pkg['devDependencies']['@types/bcryptjs'] = '^2.4.6'
with open('package.json', 'w') as f:
    json.dump(pkg, f, indent=2)
print('package.json updated')
"

# 2. 修复 Dockerfile: npm ci -> npm install
sed -i 's/RUN npm ci/RUN npm install --no-audit --no-fund/' Dockerfile
echo "Dockerfile fixed:"
grep "npm install" Dockerfile

# 3. 确认依赖
echo "=== dependencies ==="
grep -E 'bcryptjs|postgres|next|drizzle' package.json
