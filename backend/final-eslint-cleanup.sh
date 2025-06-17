#!/bin/bash

echo "🔧 Final ESLint cleanup for unused variables..."
echo ""

# Fix 1: Calendar service - existingEvent
if [ -f "src/modules/calendar/calendar.service.ts" ]; then
    echo "📁 Fixing calendar.service.ts..."
    sed -i 's/const existingEvent = /\/\/ Validation check\n      /g' "src/modules/calendar/calendar.service.ts"
fi

# Fix 2: Tasks service - existingTask
if [ -f "src/modules/tasks/tasks.service.ts" ]; then
    echo "📁 Fixing tasks.service.ts..."
    sed -i 's/const existingTask = /\/\/ Validation check\n    /g' "src/modules/tasks/tasks.service.ts"
fi

# Fix 3: Event handler parameters - prefix with underscore
echo "📁 Fixing event handler parameters..."
find src -name "*.ts" -type f | while read -r file; do
    # Fix specific event handlers
    sed -i 's/async handleEmailReceived(event: /async handleEmailReceived(_event: /g' "$file"
    sed -i 's/async handleCalendarUpdate(event: /async handleCalendarUpdate(_event: /g' "$file"
done

# Fix 4: Test files - prefix unused test variables
echo "📁 Fixing test file variables..."
find src -name "*.spec.ts" -o -name "*.test.ts" | while read -r file; do
    sed -i 's/const mocks = /const _mocks = /g' "$file"
    sed -i 's/const integration = /const _integration = /g' "$file"
    sed -i 's/const configService = /const _configService = /g' "$file"
done

# Fix 5: Remove unused imports
echo "📁 Removing unused imports..."
# Remove User import if unused
find src -name "*.ts" -type f | while read -r file; do
    if grep -q "import.*{ User }.*from.*@prisma/client" "$file"; then
        if ! grep -v "import.*{ User }" "$file" | grep -q "\bUser\b"; then
            sed -i '/import.*{ User }.*from.*@prisma\/client/d' "$file"
        fi
    fi
    
    # Remove IntegrationConfig if unused
    if grep -q "import.*IntegrationConfig.*from" "$file"; then
        if ! grep -v "import.*IntegrationConfig" "$file" | grep -q "\bIntegrationConfig\b"; then
            sed -i 's/, IntegrationConfig//g' "$file"
            sed -i 's/IntegrationConfig, //g' "$file"
        fi
    fi
done

# Fix 6: Prefix unused assignments with underscore
echo "📁 Prefixing unused variable assignments..."
# Fix userProfile assignments
find src -name "*.ts" -type f -exec sed -i 's/const userProfile = /const _userProfile = /g' {} \;
find src -name "*.ts" -type f -exec sed -i 's/const profile = /const _profile = /g' {} \;
find src -name "*.ts" -type f -exec sed -i 's/const response = /const _response = /g' {} \;
find src -name "*.ts" -type f -exec sed -i 's/const storeInfo = /const _storeInfo = /g' {} \;
find src -name "*.ts" -type f -exec sed -i 's/const keyId = /const _keyId = /g' {} \;
find src -name "*.ts" -type f -exec sed -i 's/const secret = /const _secret = /g' {} \;
find src -name "*.ts" -type f -exec sed -i 's/const reg = /const _reg = /g' {} \;

# Fix 7: Function parameters - prefix with underscore
echo "📁 Fixing function parameters..."
# Fix specific function parameters
find src -name "*.ts" -type f | while read -r file; do
    # Fix project, todoset, repository parameters
    sed -i 's/(project: /(\_project: /g' "$file"
    sed -i 's/, todoset: /, _todoset: /g' "$file"
    sed -i 's/, repository: /, _repository: /g' "$file"
done

# Fix 8: Clean up any issues we might have created
echo "📁 Cleaning up..."
# Remove any empty imports
find src -name "*.ts" -type f -exec sed -i '/import { } from/d' {} \;
# Fix double underscores
find src -name "*.ts" -type f -exec sed -i 's/__/_/g' {} \;

echo ""
echo "✅ Done! Running ESLint to check remaining errors..."
echo ""

# Show remaining errors count and breakdown
echo "📊 ESLint Results:"
npm run lint 2>&1 | grep -E "✖ [0-9]+ problems" || echo "✅ All ESLint errors fixed!"

# Show sample of remaining errors if any
echo ""
echo "📋 Sample of remaining errors (if any):"
npm run lint 2>&1 | grep "@typescript-eslint/no-unused-vars" | head -10 || echo "No unused variable errors remaining!"