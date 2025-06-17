#!/bin/bash

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Aurelius Backend Error Auto-Fixer ===${NC}"
echo ""

# Change to backend directory
cd "$(dirname "$0")/.." || exit 1

# Make scripts executable
chmod +x scripts/*.ts

echo -e "${YELLOW}Step 1: Running TypeScript error fixes...${NC}"
npx ts-node scripts/fix-typescript-errors.ts

echo ""
echo -e "${YELLOW}Step 2: Running ESLint error fixes...${NC}"
npx ts-node scripts/fix-eslint-errors.ts

echo ""
echo -e "${YELLOW}Step 3: Running ESLint auto-fix...${NC}"
npm run lint || true

echo ""
echo -e "${YELLOW}Step 4: Checking TypeScript compilation...${NC}"
NODE_OPTIONS='--max-old-space-size=8192' npx tsc --noEmit 2>&1 | head -20

echo ""
echo -e "${YELLOW}Step 5: Final ESLint check...${NC}"
NODE_OPTIONS='--max-old-space-size=8192' npx eslint "{src,apps,libs,test}/**/*.ts" --format compact | tail -20

echo ""
echo -e "${GREEN}=== Auto-fix complete! ===${NC}"
echo -e "${YELLOW}Review the changes and commit when satisfied.${NC}"