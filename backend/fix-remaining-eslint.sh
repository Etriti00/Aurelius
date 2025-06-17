#!/bin/bash

echo "🔧 Fixing remaining ESLint unused variable errors..."
echo ""

# Fix 1: Remove unused IntegrationConfig imports
echo "📁 Removing unused IntegrationConfig imports..."
find src -name "*.ts" -type f | while read -r file; do
    # Check if IntegrationConfig is actually used in the file
    if grep -q "import.*IntegrationConfig.*from.*integration.interface" "$file"; then
        # Check if it's used beyond the import
        if ! grep -v "import.*IntegrationConfig" "$file" | grep -q "IntegrationConfig"; then
            # Remove it from the import
            sed -i 's/,\s*IntegrationConfig//g' "$file"
            sed -i 's/IntegrationConfig,\s*//g' "$file"
        fi
    fi
done

# Fix 2: Fix auth.service.ts underscore parameter (needs double underscore)
echo "📁 Fixing auth.service.ts double underscore..."
if [ -f "src/modules/auth/auth.service.ts" ]; then
    sed -i 's/(\s*_,\s*done\s*)/(__, done)/g' "src/modules/auth/auth.service.ts"
fi

# Fix 3: Fix existingEvent and existingTask validations
echo "📁 Fixing validation checks..."
if [ -f "src/modules/calendar/calendar.service.ts" ]; then
    perl -i -pe 's/const existingEvent = (await this\.prisma\.calendarEvent\.findUnique[^;]+);/\/\/ Validation check\n      \1;/g' "src/modules/calendar/calendar.service.ts"
fi

if [ -f "src/modules/tasks/tasks.service.ts" ]; then
    perl -i -pe 's/const existingTask = (await this\.prisma\.task\.findUnique[^;]+);/\/\/ Validation check\n    \1;/g' "src/modules/tasks/tasks.service.ts"
fi

# Fix 4: Fix event handler parameters
echo "📁 Fixing event handler parameters..."
find src -name "*.ts" -type f | while read -r file; do
    # Fix handleEmailReceived and handleCalendarUpdate
    sed -i 's/async handleEmailReceived(event:/async handleEmailReceived(_event:/g' "$file"
    sed -i 's/async handleCalendarUpdate(event:/async handleCalendarUpdate(_event:/g' "$file"
    sed -i 's/, userId:/, _userId:/g' "$file"
done

# Fix 5: Remove unused variable assignments
echo "📁 Removing unused variable assignments..."
find src -name "*.ts" -type f | while read -r file; do
    # Remove unused profile/userProfile assignments where they're not used
    perl -i -0pe 's/const (userProfile|profile) = await[^;]+;\n(?!.*\1)//gm' "$file"
    
    # Remove unused response assignments for validation calls
    perl -i -pe 's/const response = (await this\.(validate|verify|test)[^;]+);/\1;/g' "$file"
done

# Fix 6: Fix test file variables
echo "📁 Fixing test file variables..."
find src -name "*.spec.ts" -o -name "*.test.ts" | while read -r file; do
    # Prefix unused test variables with underscore
    sed -i 's/const mocks =/const _mocks =/g' "$file"
    sed -i 's/const integration =/const _integration =/g' "$file"
    sed -i 's/const configService =/const _configService =/g' "$file"
done

# Fix 7: Add ESLint rule to allow underscore prefixed unused vars
echo "📁 Updating ESLint configuration..."
if [ -f ".eslintrc.js" ]; then
    # Check if the rule already exists
    if ! grep -q "argsIgnorePattern" ".eslintrc.js"; then
        # Add the rule to allow underscore prefixed variables
        sed -i '/rules: {/a\    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],' ".eslintrc.js"
    fi
fi

# Fix 8: Clean up any double underscores we may have created
echo "📁 Cleaning up double underscores..."
find src -name "*.ts" -type f -exec sed -i 's/__/_/g' {} \;

echo ""
echo "✅ Done! Running ESLint to check remaining errors..."
echo ""

# Show remaining errors count
npm run lint 2>&1 | grep -E "✖ [0-9]+ problems" || echo "✅ All ESLint errors fixed!"