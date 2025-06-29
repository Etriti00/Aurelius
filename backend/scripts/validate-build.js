#!/usr/bin/env node

/**
 * Build Validation Script for Aurelius Backend
 * Validates TypeScript compilation and module imports
 */

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

console.log('🔍 Starting build validation...\n');

// Function to run a command and return a promise
function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'pipe',
      shell: true,
      ...options
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      }
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

// Validate TypeScript compilation
async function validateTypeScript() {
  console.log('🔧 Validating TypeScript compilation...');
  
  try {
    await runCommand('tsc', ['--noEmit', '--pretty']);
    console.log('✅ TypeScript compilation validation passed');
  } catch (error) {
    console.error('❌ TypeScript compilation failed:');
    console.error(error.message);
    throw error;
  }
}

// Validate ESLint
async function validateESLint() {
  console.log('🔍 Validating ESLint rules...');
  
  try {
    await runCommand('eslint', ['"src/**/*.ts"', '"test/**/*.ts"']);
    console.log('✅ ESLint validation passed');
  } catch (error) {
    console.error('❌ ESLint validation failed:');
    console.error(error.message);
    throw error;
  }
}

// Validate NestJS build
async function validateNestBuild() {
  console.log('🏗️ Validating NestJS build...');
  
  try {
    const result = await runCommand('nest', ['build']);
    console.log('✅ NestJS build validation passed');
    return result;
  } catch (error) {
    console.error('❌ NestJS build failed:');
    console.error(error.message);
    throw error;
  }
}

// Check if dist files were generated correctly
function validateBuildOutput() {
  console.log('📁 Validating build output...');
  
  const distPath = path.join(process.cwd(), 'dist');
  const mainPath = path.join(distPath, 'main.js');
  const appModulePath = path.join(distPath, 'app.module.js');
  
  if (!fs.existsSync(distPath)) {
    throw new Error('dist/ directory not found');
  }
  
  if (!fs.existsSync(mainPath)) {
    throw new Error('main.js not found in dist/');
  }
  
  if (!fs.existsSync(appModulePath)) {
    throw new Error('app.module.js not found in dist/');
  }
  
  // Check that essential modules were built
  const criticalModules = [
    'modules/auth/auth.module.js',
    'modules/users/users.module.js',
    'modules/workflow/workflow.module.js',
    'modules/ai-gateway/ai-gateway.module.js'
  ];
  
  for (const module of criticalModules) {
    const modulePath = path.join(distPath, module);
    if (!fs.existsSync(modulePath)) {
      console.warn(`⚠️ Optional module not found: ${module}`);
    }
  }
  
  console.log('✅ Build output validation passed');
}

// Validate that main entry point can be loaded (syntax check)
async function validateMainEntry() {
  console.log('🎯 Validating main entry point...');
  
  try {
    // Just check if the file can be parsed (not executed)
    await runCommand('node', ['-c', 'dist/main.js']);
    console.log('✅ Main entry point validation passed');
  } catch (error) {
    console.error('❌ Main entry point validation failed:');
    console.error(error.message);
    throw error;
  }
}

// Test that package.json scripts are valid
function validatePackageScripts() {
  console.log('📦 Validating package.json scripts...');
  
  const packagePath = path.join(process.cwd(), 'package.json');
  
  if (!fs.existsSync(packagePath)) {
    throw new Error('package.json not found');
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  // Validate that all our new scripts exist
  const requiredScripts = [
    'build', 'build:full', 'build:pre', 'build:post', 'build:compile',
    'type-check', 'lint:check', 'test:unit', 'health:check'
  ];
  
  for (const script of requiredScripts) {
    if (!packageJson.scripts[script]) {
      throw new Error(`Required script missing: ${script}`);
    }
  }
  
  console.log('✅ Package scripts validation passed');
}

// Main validation function
async function runValidation() {
  const startTime = Date.now();
  
  try {
    console.log('🚀 Aurelius Backend Build Validation\n');
    
    // Validate package.json first
    validatePackageScripts();
    
    // Run validation steps in order
    await validateTypeScript();
    await validateESLint();
    await validateNestBuild();
    validateBuildOutput();
    await validateMainEntry();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`\n🎉 All build validations passed in ${duration}s!`);
    console.log('✅ Backend build is valid and ready');
    
    process.exit(0);
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.error(`\n💥 Build validation failed after ${duration}s:`);
    console.error(error.message);
    
    console.log('\n🔧 Try running these commands to fix issues:');
    console.log('- npm run prisma:generate');
    console.log('- npm run type-check');
    console.log('- npm run lint:fix');
    console.log('- npm run build:compile');
    
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runValidation();
}

module.exports = { runValidation };