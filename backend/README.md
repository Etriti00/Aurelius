# Aurelius Backend

Revolutionary AI Personal Assistant Backend - A sophisticated NestJS-based backend with comprehensive build validation and health checks.

## 🚀 Enhanced Build System

The Aurelius backend now features a comprehensive build system similar to modern frontend workflows, with extensive validation, health checks, and quality assurance.

### Build Commands

#### 🏗️ Main Build Commands
```bash
# Comprehensive build with all checks (recommended)
npm run build

# Full build with detailed steps
npm run build:full

# Just compilation (legacy mode)
npm run build:compile

# CI/CD optimized build
npm run build:ci

# Quick validation without build
npm run build:check
```

#### 🔍 Validation Commands
```bash
# Complete validation suite
npm run validate

# Individual checks
npm run type-check        # TypeScript validation
npm run lint:check        # ESLint validation
npm run test:unit         # Unit tests
npm run health:check      # System health
```

#### 🏥 Health Check Commands
```bash
# Comprehensive health check
npm run health:check

# Post-build health validation
npm run health:check:post

# Service-specific checks
npm run health:compile
npm run health:dependencies
npm run health:services
```

### Build Process Flow

The comprehensive build process includes:

1. **Pre-build (`build:pre`)**
   - 🔄 Generate Prisma client
   - 🔍 TypeScript type checking
   - 🧹 ESLint validation

2. **Build (`build:compile`)**
   - 🏗️ NestJS compilation

3. **Post-build (`build:post`)**
   - 🧪 Unit test execution
   - 🏥 Health check validation
   - ✅ Success confirmation

### Health Checks

Our health check system validates:

- ✅ **Build Artifacts**: Dist directory and main.js
- ✅ **Source Files**: Critical application files
- ✅ **Environment**: Configuration and variables
- ✅ **Prisma**: Schema and generated client
- ✅ **Service Modules**: Compiled NestJS modules
- ✅ **Package Scripts**: Required npm scripts

### Quality Assurance

#### 🛡️ Code Quality Standards
- **No Shortcuts**: Zero tolerance for `any`, `unknown`, `||`, `!`, `?`, `_`
- **Type Safety**: Strict TypeScript compilation
- **ESLint**: Comprehensive linting rules
- **Testing**: Unit and integration tests
- **Security**: Dependency auditing

#### 🔧 Development Workflow
```bash
# Start development with checks
npm run start:check

# Watch mode type checking
npm run type-check:watch

# Fix linting issues
npm run lint:fix

# Run all tests
npm run test:all
```

#### 🚨 Git Hooks
```bash
# Pre-commit validation
npm run pre-commit

# Pre-push full build
npm run pre-push
```

## 📦 Scripts Overview

### Core Development
- `npm run start:dev` - Development server with hot reload
- `npm run start:debug` - Debug mode with inspector
- `npm run start:prod` - Production server

### Database Management
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio
- `npm run prisma:seed` - Seed database

### Testing
- `npm run test` - Run all tests
- `npm run test:watch` - Watch mode testing
- `npm run test:cov` - Coverage reports
- `npm run test:e2e` - End-to-end tests

### Code Quality
- `npm run lint` - ESLint with auto-fix
- `npm run format` - Prettier formatting
- `npm run audit:check` - Security audit

## 🎯 Features

### 🔍 Comprehensive Validation
Every build includes:
- TypeScript type safety verification
- ESLint code quality checks
- Unit test execution
- Service instantiation validation
- Environment configuration checks
- Dependency security auditing

### 🚀 Developer Experience
- Clear emoji-based progress indicators
- Helpful error messages with suggested fixes
- Fast feedback loops for common issues
- Informative build logs
- IDE-friendly output formatting

### 🏗️ CI/CD Ready
- Optimized commands for automation
- Proper exit codes for pipeline integration
- Parallel execution where possible
- Detailed logging for debugging
- Environment-specific configurations

### 🛡️ Quality First
- Zero-tolerance for type shortcuts
- Comprehensive error handling
- Security-first development practices
- Performance monitoring
- Automated quality gates

## 🔧 Configuration

### Environment Setup
1. Copy `.env.example` to `.env`
2. Configure database connection
3. Set up Redis connection
4. Add OAuth credentials
5. Configure AI service keys

### Required Environment Variables
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection
- `JWT_SECRET` - JWT signing key
- `ANTHROPIC_API_KEY` - Claude AI access
- `GOOGLE_CLIENT_ID` - OAuth configuration
- `MICROSOFT_CLIENT_ID` - OAuth configuration

## 🚨 Error Handling

The build system provides clear error messages and solutions:

### Common Issues
- **Missing Dependencies**: Run `npm install`
- **Type Errors**: Check TypeScript configuration
- **Lint Violations**: Run `npm run lint:fix`
- **Test Failures**: Check test implementations
- **Environment Issues**: Verify `.env` file

### Troubleshooting
```bash
# Full diagnostic
npm run validate

# Check specific systems
npm run health:check
npm run type-check
npm run lint:check

# Reset and rebuild
npm run prisma:generate
npm run build:compile
```

## 📈 Performance

### Build Performance
- **Parallel Execution**: Multiple checks run simultaneously
- **Smart Caching**: Incremental builds where possible
- **Optimized Dependencies**: Minimal build footprint
- **Fast Feedback**: Quick error detection

### Runtime Performance
- **Lazy Loading**: Modules loaded on demand
- **Caching**: Redis-based response caching
- **Connection Pooling**: Optimized database connections
- **Monitoring**: Real-time performance metrics

## 🎉 Success Metrics

A successful build indicates:
- ✅ Zero TypeScript errors
- ✅ Zero ESLint violations
- ✅ All tests passing
- ✅ Services can instantiate
- ✅ Environment properly configured
- ✅ Dependencies are secure
- ✅ Build artifacts generated

## 🔗 Integration

### Monorepo Structure
The backend integrates seamlessly with:
- Frontend Next.js application
- Shared TypeScript types
- Common development tools
- Unified build processes

### External Services
- PostgreSQL database with pgvector
- Redis for caching and queues
- Anthropic Claude AI
- Google/Microsoft OAuth
- Paddle billing
- AWS S3 storage

---

Built with ❤️ using NestJS, TypeScript, and a commitment to code quality.