# Aurelius Backend Build Scripts

This directory contains comprehensive build and validation scripts for the Aurelius backend.

## Scripts Overview

### 🏥 `health-check.js`
Comprehensive health check that validates:
- Build artifacts exist
- Critical source files are present
- Environment configuration
- Prisma setup
- Service modules
- Package.json scripts

**Usage:** `npm run health:check`

### 🔍 `validate-build.js`
Build validation that ensures:
- TypeScript compilation passes
- ESLint validation passes
- NestJS build succeeds
- Build output is correct
- Main entry point is valid
- Package scripts are configured

**Usage:** `npm run health:services`

## Build Process Overview

The new build process follows this comprehensive flow:

1. **Pre-build (`npm run build:pre`)**
   - Generate Prisma client
   - Run TypeScript type checks
   - Run ESLint checks

2. **Build (`npm run build:compile`)**
   - Compile with NestJS

3. **Post-build (`npm run build:post`)**
   - Run unit tests
   - Run health checks
   - Validate service instantiation

## Available Commands

### Main Build Commands
- `npm run build` - Full comprehensive build
- `npm run build:full` - Same as build
- `npm run build:compile` - Just compile (old behavior)
- `npm run build:ci` - Optimized for CI/CD
- `npm run build:check` - Quick validation

### Validation Commands
- `npm run validate` - Full validation suite
- `npm run health:check` - Health validation
- `npm run type-check` - TypeScript validation
- `npm run lint:check` - ESLint validation

### Development Commands
- `npm run start:check` - Start with pre-checks
- `npm run type-check:watch` - Watch mode type checking

### Git Hooks
- `npm run pre-commit` - Fast checks for commits
- `npm run pre-push` - Full build for pushes

## Features

### 🎯 Comprehensive Validation
- TypeScript type safety
- ESLint code quality
- Service instantiation
- Environment configuration
- Dependency security

### 🚀 Developer Experience
- Clear emoji indicators
- Helpful error messages
- Fast feedback loops
- Informative progress messages

### 🔧 CI/CD Ready
- Exit codes for automation
- Optimized CI commands
- Parallel execution where possible
- Detailed logging

### 🛡️ Quality Assurance
- No shortcuts allowed
- Strict type checking
- Comprehensive testing
- Security auditing

## Error Handling

Scripts provide clear error messages and suggested fixes:
- Missing dependencies
- Configuration issues
- Build failures
- Type errors
- Linting violations

## Integration

These scripts integrate with:
- Git hooks (pre-commit, pre-push)
- CI/CD pipelines
- Development workflow
- Code quality tools
- Monitoring systems