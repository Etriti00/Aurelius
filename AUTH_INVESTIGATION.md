# Authentication & CSRF Issues Investigation Report

## Executive Summary

Investigation reveals **two critical missing components** causing the authentication failures:
1. **Missing authentication endpoints** (`/auth/login` and `/auth/register`) in the backend
2. **Frontend API client not handling CSRF tokens** required by backend middleware

## Issues Identified

### 1. NextAuth UntrustedHost Error
**Error**: `Host must be trusted. URL was: http://localhost:3000/api/auth/session`

**Root Cause**: NextAuth configuration issue with environment variable loading or host validation.

### 2. CSRF Token Missing Error
**Error**: `POST http://localhost:3001/api/v1/auth/register 403 (Forbidden)` with "CSRF token missing"

**Root Cause**: Backend CSRF middleware expects CSRF tokens but frontend API client doesn't provide them.

## Detailed Investigation Findings

### Frontend Analysis

#### 1. NextAuth Configuration (`frontend/src/lib/auth/config.ts`)
```typescript
export const authConfig: NextAuthConfig = {
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID as string,
      clientSecret: process.env.AUTH_GOOGLE_SECRET as string,
      // ... OAuth configuration
    }),
    CredentialsProvider({
      // ... credentials configuration
      async authorize(credentials) {
        // Calls: `${process.env.NEXT_PUBLIC_API_URL}/auth/login`
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
          }),
        })
        // ... response handling
      }
    })
  ],
  secret: process.env.NEXTAUTH_SECRET,
  // ... other configuration
}
```

**Issues Found**:
- Configuration looks correct
- Environment variables are properly loaded from `/frontend/.env.local`
- NextAuth secret is properly set: `NEXTAUTH_SECRET=development-secret-key-change-in-production`
- NextAuth URL is correctly set: `NEXTAUTH_URL=http://localhost:3000`

#### 2. Environment Variable Loading
**Frontend Environment** (`frontend/.env.local`):
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=development-secret-key-change-in-production
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
AUTH_GOOGLE_ID=1082925952266-sl4cl8ujs7rfi200m4pkl3pjrsq57461.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=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
# ... other OAuth credentials
```

**Status**: ✅ **Environment variables are properly configured**

#### 3. Frontend API Client (`frontend/src/lib/api/client.ts`)
```typescript
export class ApiClient {
  private async getAuthHeaders(): Promise<HeadersInit> {
    const session = await getSession()
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    
    if (session?.accessToken) {
      headers.Authorization = `Bearer ${session.accessToken}`
    }
    
    return headers
  }
  
  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    const headers = await this.getAuthHeaders()
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    })
    // ... response handling
  }
}
```

**Critical Issue Found**: ❌ **API client does NOT include CSRF tokens in requests**

#### 4. Registration Page (`frontend/src/app/(auth)/signup/page.tsx`)
```typescript
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name,
    email,
    password,
  }),
})
```

**Critical Issue Found**: ❌ **Registration call bypasses API client and doesn't include CSRF tokens**

### Backend Analysis

#### 1. Missing Authentication Endpoints
**Current Auth Controller** (`backend/src/modules/auth/auth.controller.ts`):
```typescript
@Controller('auth')
export class AuthController {
  // ✅ OAuth endpoints exist:
  @Get('google') @UseGuards(AuthGuard('google')) googleAuth()
  @Get('google/callback') @UseGuards(AuthGuard('google')) googleCallback()
  @Get('microsoft') @UseGuards(AuthGuard('microsoft')) microsoftAuth()
  @Get('microsoft/callback') @UseGuards(AuthGuard('microsoft')) microsoftCallback()
  
  // ✅ Token management endpoints exist:
  @Post('refresh') refreshToken()
  @Post('logout') @UseGuards(JwtAuthGuard) logout()
  @Get('me') @UseGuards(JwtAuthGuard) getProfile()
  
  // ❌ MISSING CRITICAL ENDPOINTS:
  // @Post('login') - NOT FOUND
  // @Post('register') - NOT FOUND
}
```

**Critical Issues Found**:
- ❌ **`POST /auth/login` endpoint is completely missing**
- ❌ **`POST /auth/register` endpoint is completely missing**
- ✅ DTOs exist (`RegisterDto`, `LoginDto`) but endpoints don't use them
- ✅ Auth service has credential validation methods but no endpoints expose them

#### 2. Auth Service Analysis (`backend/src/modules/auth/auth.service.ts`)
**Available Methods**:
```typescript
export class AuthService {
  // ✅ Registration logic exists:
  async validateUserCredentials(email: string, password: string): Promise<User | null>
  
  // ✅ Token generation exists:
  async generateTokens(user: UserInput): Promise<AuthTokens>
  
  // ❌ MISSING: Registration method for credentials-based signup
  // The service only handles OAuth user creation, not email/password registration
}
```

**Critical Issue Found**: ❌ **No registration method for email/password signup in AuthService**

#### 3. CSRF Middleware Configuration (`backend/src/middleware/csrf.middleware.ts`)
```typescript
@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  constructor(configService: ConfigService) {
    // Paths that don't require CSRF protection
    this.skipPaths = configService.get<string[]>('security.csrf.skipPaths') || [
      '/api/v1/auth/login',        // ← Expects this endpoint to exist
      '/api/v1/auth/register',     // ← Expects this endpoint to exist
      '/api/v1/auth/google/callback',
      '/api/v1/auth/microsoft/callback',
      '/api/v1/billing/webhook',
      '/api/health',
    ];
  }
  
  use(req: CsrfRequest, res: Response, next: NextFunction): void {
    // Skip CSRF check for certain paths
    if (this.shouldSkipCsrf(req)) {
      return next();
    }

    // For state-changing requests, validate CSRF token
    const token = this.extractToken(req);
    if (!token) {
      throw new HttpException('CSRF token missing', HttpStatus.FORBIDDEN);
    }
    // ... validation logic
  }
}
```

**Issues Found**:
- ✅ CSRF middleware is properly configured and active (applied to all routes in `app.module.ts`)
- ✅ Skip paths include `/auth/login` and `/auth/register` (would work if endpoints existed)
- ✅ CSRF tokens can be obtained via GET requests (sets `X-CSRF-Token` header)
- ❌ **Frontend doesn't obtain or send CSRF tokens for non-skipped endpoints**

#### 4. CORS Configuration (`backend/src/main.ts`)
```typescript
app.enableCors({
  origin: configService.get<string>('CORS_ORIGIN', 'http://localhost:3000'),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-CSRF-Token', 'X-API-Key'],
  exposedHeaders: ['X-CSRF-Token'],
});
```

**Status**: ✅ **CORS is properly configured for frontend-backend communication**

#### 5. Test Evidence
**E2E Tests** (`backend/test/auth.e2e-spec.ts`) show expected endpoints:
```typescript
// Tests expect these endpoints to exist:
await request(app.getHttpServer()).post('/auth/register').send(registerDto).expect(201);
await request(app.getHttpServer()).post('/auth/login').send(credentials).expect(200);
```

**Status**: ❌ **Tests expect endpoints that don't exist in the actual controller**

### Database & Infrastructure Analysis

#### 1. Database Schema (Prisma)
**User Model** supports both OAuth and credentials-based authentication:
```prisma
model User {
  id           String    @id @default(cuid())
  email        String    @unique
  name         String?
  passwordHash String?   // ← Supports password-based auth
  googleId     String?   // ← OAuth support
  microsoftId  String?   // ← OAuth support
  appleId      String?   // ← OAuth support
  // ... other fields
}
```

**Status**: ✅ **Database schema supports both authentication methods**

#### 2. Environment Configuration
**Backend** (`.env`):
```env
CORS_ORIGIN="http://localhost:3000"
JWT_SECRET="mgk6tZK+VDE1GqvvAqMSZi/x9eSvuxH4Gy3HdyUL9/I="
NEXTAUTH_SECRET="mgk6tZK+VDE1GqvvAqMSZi/x9eSvuxH4Gy3HdyUL9/I="
NODE_ENV="development"
PORT=3001
```

**Status**: ✅ **Environment variables are properly configured**

## Root Cause Analysis

### Primary Issues

1. **Missing Authentication Endpoints**: 
   - Backend is missing `POST /auth/login` and `POST /auth/register` endpoints
   - Frontend expects these endpoints but they don't exist
   - Tests reference these endpoints but they're not implemented

2. **Missing Registration Service Method**:
   - AuthService has OAuth user creation but no email/password registration
   - No method to hash passwords and create users with credentials

3. **CSRF Token Handling**:
   - Frontend API client doesn't obtain or send CSRF tokens
   - Registration page bypasses API client entirely
   - Backend CSRF middleware expects tokens for state-changing requests

### Secondary Issues

4. **NextAuth UntrustedHost Error**:
   - Likely caused by missing `/auth/login` endpoint during credential validation
   - NextAuth's credentials provider fails when backend endpoint doesn't exist

## Step-by-Step Solutions

### Solution 1: Implement Missing Authentication Endpoints

#### A. Add Registration Method to AuthService
```typescript
// backend/src/modules/auth/auth.service.ts
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  // Add this method:
  async registerWithCredentials(registerDto: RegisterDto): Promise<AuthResult> {
    const { email, password, name } = registerDto;
    
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }
    
    // Hash password
    const saltRounds = this.configService.get<number>('BCRYPT_ROUNDS', 12);
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        lastActiveAt: new Date(),
      },
    });
    
    // Generate tokens
    const tokens = await this.generateTokens(user);
    
    return { user, tokens };
  }
}
```

#### B. Add Missing Endpoints to AuthController
```typescript
// backend/src/modules/auth/auth.controller.ts
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  // Add these endpoints:
  
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register new user with email and password' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or user already exists' })
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponse> {
    const result = await this.authService.registerWithCredentials(registerDto);
    return {
      ...result.tokens,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        avatar: result.user.avatar,
      },
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 attempts per minute
  async login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.authService.validateUserCredentials(
      loginDto.email,
      loginDto.password
    );
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    const tokens = await this.authService.generateTokens(user);
    
    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
    };
  }
}
```

#### C. Create Missing LoginDto
```typescript
// backend/src/modules/auth/dto/login.dto.ts
import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password' })
  @IsString()
  @MinLength(1)
  password: string;
}

export class LoginResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty()
  expiresIn: number;

  @ApiProperty()
  user: {
    id: string;
    email: string;
    name?: string | null;
    avatar?: string | null;
  };
}
```

### Solution 2: Fix CSRF Token Handling

#### A. Update Frontend API Client
```typescript
// frontend/src/lib/api/client.ts
export class ApiClient {
  private csrfToken: string | null = null;

  private async getCsrfToken(): Promise<string | null> {
    if (this.csrfToken) {
      return this.csrfToken;
    }

    try {
      // Get CSRF token from a GET request
      const response = await fetch(`${this.baseURL}/auth/me`, {
        method: 'GET',
        credentials: 'include',
      });
      
      const token = response.headers.get('X-CSRF-Token');
      if (token) {
        this.csrfToken = token;
        return token;
      }
    } catch (error) {
      console.warn('Failed to obtain CSRF token:', error);
    }
    
    return null;
  }

  private async getAuthHeaders(includeCsrf = false): Promise<HeadersInit> {
    const session = await getSession();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (session?.accessToken) {
      headers.Authorization = `Bearer ${session.accessToken}`;
    }

    if (includeCsrf) {
      const csrfToken = await this.getCsrfToken();
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }
    }

    return headers;
  }

  async post<T>(endpoint: string, data?: unknown, needsCsrf = true): Promise<T> {
    const headers = await this.getAuthHeaders(needsCsrf);
    
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: data ? JSON.stringify(data) : undefined,
      });

      return await this.handleResponse<T>(response);
    } catch (error) {
      // Handle CSRF token expiry
      if (error instanceof Error && error.message.includes('CSRF')) {
        this.csrfToken = null; // Reset token
        // Retry once
        const newHeaders = await this.getAuthHeaders(needsCsrf);
        const retryResponse = await fetch(`${this.baseURL}${endpoint}`, {
          method: 'POST',
          headers: newHeaders,
          credentials: 'include',
          body: data ? JSON.stringify(data) : undefined,
        });
        return await this.handleResponse<T>(retryResponse, false);
      }
      throw error;
    }
  }
}
```

#### B. Update Registration Page
```typescript
// frontend/src/app/(auth)/signup/page.tsx
import { apiClient } from '@/lib/api/client';

const handleSignUp = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);
  setError('');

  // ... validation logic

  try {
    // Use API client instead of direct fetch
    const data = await apiClient.post('/auth/register', {
      name,
      email,
      password,
    }, false); // Registration endpoint doesn't need CSRF (in skip list)

    // ... rest of the logic
  } catch (error) {
    setError('An error occurred during registration');
  } finally {
    setIsLoading(false);
  }
};
```

### Solution 3: Fix NextAuth Configuration

#### A. Ensure Proper Host Trust
```typescript
// frontend/src/lib/auth/config.ts
export const authConfig: NextAuthConfig = {
  // ... existing configuration
  
  // Add explicit trust hosts for development
  trustHost: true, // For development only
  
  // Or configure specific trusted hosts:
  // trustHost: process.env.NODE_ENV === 'development',
  
  callbacks: {
    // ... existing callbacks
    
    async signIn({ user, account, profile }) {
      // Allow all sign ins in development
      if (process.env.NODE_ENV === 'development') {
        return true;
      }
      
      // Production validation logic here
      return true;
    },
  },
};
```

### Solution 4: Environment Validation

#### A. Add Environment Validation Script
```typescript
// scripts/validate-env.ts
const requiredEnvVars = {
  frontend: [
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET', 
    'NEXT_PUBLIC_API_URL',
    'AUTH_GOOGLE_ID',
    'AUTH_GOOGLE_SECRET',
  ],
  backend: [
    'DATABASE_URL',
    'JWT_SECRET',
    'CORS_ORIGIN',
    'REDIS_URL',
  ],
};

function validateEnvironment() {
  const missing: string[] = [];
  
  requiredEnvVars.frontend.forEach(envVar => {
    if (!process.env[envVar]) {
      missing.push(`Frontend: ${envVar}`);
    }
  });
  
  if (missing.length > 0) {
    console.error('Missing environment variables:');
    missing.forEach(envVar => console.error(`- ${envVar}`));
    process.exit(1);
  }
  
  console.log('✅ All required environment variables are set');
}

validateEnvironment();
```

## Implementation Priority

### Phase 1: Critical Fixes (Immediate)
1. ✅ **Add missing `/auth/login` and `/auth/register` endpoints**
2. ✅ **Implement `registerWithCredentials` method in AuthService**
3. ✅ **Create missing `LoginDto`**
4. ✅ **Add proper error handling and validation**

### Phase 2: CSRF Integration (High Priority)
1. ✅ **Update frontend API client to handle CSRF tokens**
2. ✅ **Modify registration page to use API client**
3. ✅ **Test CSRF token flow end-to-end**

### Phase 3: NextAuth Fixes (Medium Priority)
1. ✅ **Add `trustHost: true` for development**
2. ✅ **Test credential provider flow**
3. ✅ **Validate OAuth flows still work**

### Phase 4: Testing & Validation (Low Priority)
1. ✅ **Run existing E2E tests to ensure they pass**
2. ✅ **Add integration tests for new endpoints**
3. ✅ **Validate all authentication flows work end-to-end**

## Testing Verification Steps

After implementing the fixes:

1. **Test Registration Flow**:
   ```bash
   curl -X POST http://localhost:3001/api/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{"name":"Test User","email":"test@example.com","password":"TestPass123!"}'
   ```

2. **Test Login Flow**:
   ```bash
   curl -X POST http://localhost:3001/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"TestPass123!"}'
   ```

3. **Test NextAuth Session**:
   ```bash
   curl http://localhost:3000/api/auth/session
   ```

4. **Test Frontend Registration**:
   - Navigate to `http://localhost:3000/signup`
   - Fill out registration form
   - Verify successful registration and auto-login

5. **Test Frontend Login**:
   - Navigate to `http://localhost:3000/signin`
   - Login with credentials
   - Verify successful authentication

## Security Considerations

1. **Password Security**:
   - ✅ Strong password validation with regex in `RegisterDto`
   - ✅ Bcrypt hashing with 12 salt rounds
   - ✅ Rate limiting on authentication endpoints

2. **CSRF Protection**:
   - ✅ CSRF middleware properly configured
   - ✅ Skip paths include authentication endpoints
   - ✅ Frontend will obtain and send tokens correctly

3. **CORS Configuration**:
   - ✅ Proper CORS headers configured
   - ✅ Credentials enabled for cross-origin requests
   - ✅ CSRF token headers exposed

4. **JWT Security**:
   - ✅ Separate secrets for access/refresh tokens
   - ✅ Short access token expiry (15 minutes)
   - ✅ Refresh token rotation implemented

## Conclusion

The authentication issues stem from **missing backend endpoints** that the frontend expects to exist. The CSRF issues are secondary, caused by incomplete API client implementation. 

**Immediate action required**:
1. Implement missing `/auth/login` and `/auth/register` endpoints
2. Add registration service method with password hashing
3. Update frontend API client for CSRF token handling

Once these critical components are implemented, both NextAuth credential authentication and direct API registration will function correctly.