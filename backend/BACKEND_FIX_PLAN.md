# 🔧 Aurelius Backend Systematic Fix Plan

**Author:** Senior Software Engineer (20 years experience)  
**Date:** December 24, 2024  
**Approach:** Zero shortcuts, professional implementation  
**Timeline:** 5-7 days for complete resolution  

---

## 🎯 Guiding Principles

1. **No shortcuts**: No `any`, `unknown`, `!`, `_` or type assertions
2. **Test everything**: Each fix must include tests before moving forward
3. **Incremental fixes**: One issue at a time, verify before proceeding
4. **Maintain compatibility**: Ensure existing functionality remains intact
5. **Professional code**: Follow SOLID principles, clean code practices

---

## 📋 Phase 1: Critical Infrastructure (Day 1 - Morning)

### 1.1 Generate package-lock.json (15 min)
```bash
cd backend
rm -rf node_modules
npm install
git add package-lock.json
git commit -m "chore: add package-lock.json for dependency consistency"
```
**Validation:** Verify all dependencies installed correctly

### 1.2 Fix JWT Configuration (45 min)

#### Create Configuration Validator:
```typescript
// src/config/jwt.config.ts
import { registerAs } from '@nestjs/config';

interface JwtConfig {
  accessSecret: string;
  refreshSecret: string;
  accessExpiresIn: string;
  refreshExpiresIn: string;
}

export default registerAs('jwt', (): JwtConfig => {
  const accessSecret = process.env.JWT_ACCESS_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;
  
  if (!accessSecret || !refreshSecret) {
    throw new Error(
      'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be defined in environment variables'
    );
  }
  
  return {
    accessSecret,
    refreshSecret,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  };
});
```

#### Update Refresh Token Strategy:
```typescript
// src/modules/auth/strategies/refresh-token.strategy.ts
constructor(
  private readonly configService: ConfigService,
  private readonly authService: AuthService,
) {
  super({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: configService.get<string>('jwt.refreshSecret'),
    passReqToCallback: true,
  });
}
```

**Tests Required:**
- Unit test for configuration validator
- Integration test for JWT strategy
- E2E test for token refresh flow

### 1.3 Generate Database Migrations (30 min)

```bash
# First, ensure database is running
cd backend

# Generate initial migration
npm run prisma:migrate dev --name initial_schema

# Verify migration
npm run prisma:studio
```

**Validation Steps:**
1. Check migration file created in `prisma/migrations/`
2. Verify all tables created correctly
3. Test basic CRUD operations

### 1.4 Fix AI Gateway Module Registration (30 min)

```typescript
// src/modules/ai-gateway/ai-gateway.module.ts
import { Module } from '@nestjs/common';
import { AIGatewayController } from './ai-gateway.controller';
import { AIGatewayService } from './ai-gateway.service';
import { AIModelSelectorService } from './services/ai-model-selector.service';
import { AnthropicService } from './services/anthropic.service';
import { ClaudeService } from './services/claude.service';
import { OpenAIService } from './services/openai.service';
import { PromptService } from './services/prompt.service';
import { EmbeddingsService } from './services/embeddings.service';
import { AIUsageTrackingService } from './services/ai-usage-tracking.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [AIGatewayController],
  providers: [
    AIGatewayService,
    AIModelSelectorService,
    AnthropicService,
    ClaudeService,
    OpenAIService,
    PromptService,
    EmbeddingsService,
    AIUsageTrackingService,
  ],
  exports: [AIGatewayService, EmbeddingsService],
})
export class AIGatewayModule {}
```

**Validation:** Start the application and verify no dependency injection errors

---

## 📋 Phase 2: Core Services Fix (Day 1 - Afternoon)

### 2.1 Update Anthropic Service to Messages API (2 hours)

#### Create Proper Interfaces:
```typescript
// src/modules/ai-gateway/interfaces/anthropic.interface.ts
export interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AnthropicRequest {
  model: string;
  messages: AnthropicMessage[];
  max_tokens: number;
  temperature?: number;
  top_p?: number;
  stop_sequences?: string[];
}

export interface AnthropicResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{
    type: 'text';
    text: string;
  }>;
  model: string;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence';
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}
```

#### Update Service Implementation:
```typescript
// src/modules/ai-gateway/services/anthropic.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { AnthropicMessage, AnthropicRequest, AnthropicResponse } from '../interfaces/anthropic.interface';

@Injectable()
export class AnthropicService {
  private readonly logger = new Logger(AnthropicService.name);
  private readonly client: Anthropic;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required');
    }
    
    this.client = new Anthropic({ apiKey });
  }

  async chat(messages: AnthropicMessage[], options: Partial<AnthropicRequest> = {}): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: options.model || 'claude-3-sonnet-20240229',
        messages,
        max_tokens: options.max_tokens || 1000,
        temperature: options.temperature || 0.7,
      });

      return this.extractTextFromResponse(response);
    } catch (error) {
      this.logger.error('Anthropic API error', error);
      throw new Error(`Anthropic API error: ${error.message}`);
    }
  }

  private extractTextFromResponse(response: AnthropicResponse): string {
    return response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('');
  }

  calculateTokens(text: string): number {
    // Rough estimation - Claude uses ~4 chars per token
    return Math.ceil(text.length / 4);
  }
}
```

### 2.2 Fix Import Paths (30 min)

Update all incorrect import paths:
```typescript
// Before: import { ConfigService } from '../../config/config.service';
// After:
import { ConfigService } from '@nestjs/config';
```

### 2.3 Implement Real Embeddings Service (1 hour)

```typescript
// src/modules/ai-gateway/services/embeddings.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);
  private readonly openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required for embeddings');
    }
    
    this.openai = new OpenAI({ apiKey });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      this.logger.error('OpenAI embedding error', error);
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: texts,
      });

      return response.data.map(item => item.embedding);
    } catch (error) {
      this.logger.error('OpenAI batch embedding error', error);
      throw new Error(`Failed to generate batch embeddings: ${error.message}`);
    }
  }
}
```

---

## 📋 Phase 3: Security Hardening (Day 2)

### 3.1 Implement CSRF Protection (2 hours)

```typescript
// src/middleware/csrf.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private readonly tokenStore = new Map<string, string>();

  use(req: Request, res: Response, next: NextFunction): void {
    if (this.isReadMethod(req.method)) {
      return next();
    }

    const token = req.headers['x-csrf-token'] as string;
    const sessionId = req.session?.id;

    if (!sessionId || !token || !this.validateToken(sessionId, token)) {
      return res.status(403).json({ message: 'Invalid CSRF token' });
    }

    next();
  }

  generateToken(sessionId: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    this.tokenStore.set(sessionId, token);
    return token;
  }

  private validateToken(sessionId: string, token: string): boolean {
    const storedToken = this.tokenStore.get(sessionId);
    return storedToken === token;
  }

  private isReadMethod(method: string): boolean {
    return ['GET', 'HEAD', 'OPTIONS'].includes(method);
  }
}
```

### 3.2 Complete API Key Validation (1 hour)

```typescript
// src/modules/auth/guards/api-key.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      throw new UnauthorizedException('API key required');
    }

    const hashedKey = this.hashApiKey(apiKey);
    const keyRecord = await this.prisma.apiKey.findUnique({
      where: { hashedKey },
      include: { user: true },
    });

    if (!keyRecord || !keyRecord.isActive) {
      throw new UnauthorizedException('Invalid API key');
    }

    if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('API key expired');
    }

    // Update last used timestamp
    await this.prisma.apiKey.update({
      where: { id: keyRecord.id },
      data: { lastUsedAt: new Date() },
    });

    // Attach user to request
    request['user'] = keyRecord.user;
    return true;
  }

  private extractApiKey(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return request.headers['x-api-key'] as string || null;
  }

  private hashApiKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }
}
```

### 3.3 Tighten CSP Policy (30 min)

```typescript
// src/main.ts - Update helmet configuration
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
  }),
);
```

---

## 📋 Phase 4: Code Quality Improvements (Day 3-4)

### 4.1 Fix TypeScript/ESLint Issues Systematically

#### Step 1: Replace `any` with proper types
```typescript
// Example: Before
function processData(data: any): any {
  return data.value;
}

// After
interface ProcessableData {
  value: string;
  metadata?: Record<string, unknown>;
}

function processData(data: ProcessableData): string {
  return data.value;
}
```

#### Step 2: Add return types to all functions
```typescript
// Before
async findUser(id: string) {
  return this.prisma.user.findUnique({ where: { id } });
}

// After
async findUser(id: string): Promise<User | null> {
  return this.prisma.user.findUnique({ where: { id } });
}
```

#### Step 3: Replace console.log with Logger
```typescript
// Before
console.log('Processing request', requestId);

// After
this.logger.log(`Processing request ${requestId}`);
```

### 4.2 Add Comprehensive Tests

#### Unit Test Example:
```typescript
// src/modules/auth/auth.service.spec.ts
describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = { id: '1', email, password: hashedPassword };

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(user);

      const result = await service.validateUser(email, password);
      expect(result).toEqual({ id: '1', email });
    });

    it('should return null when user not found', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      const result = await service.validateUser('test@example.com', 'password');
      expect(result).toBeNull();
    });
  });
});
```

---

## 📋 Phase 5: Advanced Features (Day 5)

### 5.1 Implement Account Lockout

```typescript
// src/modules/auth/services/account-lockout.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

interface LockoutConfig {
  maxAttempts: number;
  lockoutDuration: number; // minutes
  resetAfter: number; // minutes
}

@Injectable()
export class AccountLockoutService {
  private readonly config: LockoutConfig;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.config = {
      maxAttempts: this.configService.get<number>('auth.lockout.maxAttempts', 5),
      lockoutDuration: this.configService.get<number>('auth.lockout.duration', 30),
      resetAfter: this.configService.get<number>('auth.lockout.resetAfter', 60),
    };
  }

  async recordFailedAttempt(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, failedLoginAttempts: true, lastFailedLogin: true },
    });

    if (!user) return false;

    const now = new Date();
    const resetTime = new Date(now.getTime() - this.config.resetAfter * 60 * 1000);

    let attempts = user.failedLoginAttempts;
    if (user.lastFailedLogin && user.lastFailedLogin < resetTime) {
      attempts = 0;
    }

    attempts += 1;

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: attempts,
        lastFailedLogin: now,
        lockedUntil: attempts >= this.config.maxAttempts
          ? new Date(now.getTime() + this.config.lockoutDuration * 60 * 1000)
          : null,
      },
    });

    return attempts >= this.config.maxAttempts;
  }

  async isLocked(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { lockedUntil: true },
    });

    if (!user || !user.lockedUntil) return false;
    return user.lockedUntil > new Date();
  }

  async resetFailedAttempts(email: string): Promise<void> {
    await this.prisma.user.update({
      where: { email },
      data: {
        failedLoginAttempts: 0,
        lastFailedLogin: null,
        lockedUntil: null,
      },
    });
  }
}
```

### 5.2 Implement Session Invalidation

```typescript
// src/modules/auth/services/session.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async invalidateAllSessions(userId: string): Promise<void> {
    // Increment token version to invalidate all existing tokens
    await this.prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });

    // Mark all refresh tokens as revoked
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  async invalidateSession(refreshToken: string): Promise<void> {
    const payload = this.jwtService.decode(refreshToken) as any;
    if (!payload?.jti) return;

    await this.prisma.refreshToken.update({
      where: { id: payload.jti },
      data: { isRevoked: true },
    });
  }

  async validateTokenVersion(userId: string, tokenVersion: number): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tokenVersion: true },
    });

    return user?.tokenVersion === tokenVersion;
  }
}
```

---

## 📋 Phase 6: Database Optimization (Day 6)

### 6.1 Setup Native pgvector

```sql
-- migrations/add_pgvector.sql
CREATE EXTENSION IF NOT EXISTS vector;

-- Update embedding column to use native vector type
ALTER TABLE "VectorEmbedding" 
ADD COLUMN embedding_vector vector(1536);

-- Migrate existing JSON data to vector
UPDATE "VectorEmbedding" 
SET embedding_vector = embedding::vector
WHERE embedding IS NOT NULL;

-- Create index for similarity search
CREATE INDEX embedding_vector_idx ON "VectorEmbedding" 
USING ivfflat (embedding_vector vector_cosine_ops)
WITH (lists = 100);
```

### 6.2 Update Prisma Schema

```prisma
// schema.prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [vector]
}

model VectorEmbedding {
  id              String   @id @default(cuid())
  content         String
  embedding       Json?    @db.Json // Keep for backward compatibility
  embeddingVector Unsupported("vector(1536)")?
  metadata        Json?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

---

## 🧪 Validation & Testing Strategy

### For Each Phase:

1. **Pre-fix validation**
   - Document current behavior
   - Create regression tests
   - Backup database

2. **Post-fix validation**
   - Run all existing tests
   - Execute new tests
   - Manual testing of critical flows
   - Performance benchmarking

3. **Deployment validation**
   - Staging environment testing
   - Smoke tests
   - Monitor error rates
   - Check performance metrics

### Critical Test Scenarios:

1. **Authentication Flow**
   - Login with valid/invalid credentials
   - Token refresh
   - OAuth login (Google, Microsoft)
   - Session expiry
   - Account lockout

2. **AI Operations**
   - Chat completion
   - Embedding generation
   - Token counting
   - Error handling
   - Rate limiting

3. **Security**
   - CSRF protection
   - API key validation
   - Rate limiting
   - Input validation
   - SQL injection attempts

---

## 🚀 Deployment Strategy

### Branch Strategy:
```
main
├── fix/critical-infrastructure
├── fix/core-services
├── fix/security-hardening
├── fix/code-quality
└── fix/advanced-features
```

### Deployment Order:
1. Deploy infrastructure fixes to staging
2. Run full test suite
3. Deploy to production with feature flags
4. Monitor for 24 hours
5. Proceed to next phase

### Rollback Plan:
- Database migration rollback scripts ready
- Previous Docker images tagged
- Feature flags for new functionality
- Monitoring alerts configured

---

## 📊 Success Metrics

### Must achieve before production:
- ✅ 0 TypeScript compilation errors
- ✅ 0 critical security vulnerabilities
- ✅ All tests passing (>80% coverage)
- ✅ No hardcoded secrets
- ✅ All services properly registered
- ✅ Database migrations applied
- ✅ <500 ESLint errors
- ✅ Performance benchmarks met

### Monitoring post-deployment:
- Error rate <0.1%
- API response time <200ms (p95)
- AI operation success rate >99%
- No security incidents
- Zero downtime during deployment

---

## 🎯 Final Checklist

Before considering the backend production-ready:

- [ ] All Phase 1-6 fixes implemented
- [ ] Comprehensive test suite passing
- [ ] Security audit passed
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] Monitoring configured
- [ ] Backup strategy tested
- [ ] Incident response plan ready

This systematic approach ensures professional-grade fixes without shortcuts, maintaining code quality and system reliability throughout the process.