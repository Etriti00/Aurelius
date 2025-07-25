# Aurelius AI - Complete Setup Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Database Configuration](#database-configuration)
4. [Environment Variables](#environment-variables)
5. [Third-Party Service Setup](#third-party-service-setup)
6. [Running the Application](#running-the-application)
7. [Testing](#testing)
8. [Deployment](#deployment)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 18.x or higher | JavaScript runtime |
| npm | 9.x or higher | Package manager |
| PostgreSQL | 15.x or higher | Primary database |
| Redis | 7.x or higher | Caching and queues |
| Git | Latest | Version control |

### Optional Software

| Software | Purpose |
|----------|---------|
| Docker | Containerization |
| pgAdmin | PostgreSQL GUI |
| Redis Commander | Redis GUI |
| Postman | API testing |

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/aurelius-ai/aurelius.git
cd aurelius
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install

# Return to root
cd ..
```

### 3. Database Setup with Docker

```bash
# Create a Docker network
docker network create aurelius-network

# Run PostgreSQL with pgvector
docker run -d \
  --name aurelius-postgres \
  --network aurelius-network \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=aurelius \
  -p 5432:5432 \
  -v aurelius-postgres-data:/var/lib/postgresql/data \
  pgvector/pgvector:pg15

# Run Redis
docker run -d \
  --name aurelius-redis \
  --network aurelius-network \
  -p 6379:6379 \
  -v aurelius-redis-data:/data \
  redis:7-alpine redis-server --requirepass redis-password
```

### 4. Database Setup without Docker

#### PostgreSQL with pgvector

```bash
# Install PostgreSQL 15
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql-15 postgresql-contrib-15

# macOS with Homebrew
brew install postgresql@15
brew services start postgresql@15

# Install pgvector extension
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install

# Create database and enable extension
sudo -u postgres psql
CREATE DATABASE aurelius;
\c aurelius
CREATE EXTENSION vector;
\q
```

#### Redis Installation

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install redis-server

# macOS with Homebrew
brew install redis
brew services start redis

# Configure Redis password (optional)
redis-cli
CONFIG SET requirepass "redis-password"
```

## Database Configuration

### 1. Run Prisma Migrations

```bash
cd backend

# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database with sample data (optional)
npm run prisma:seed
```

### 2. Verify Database Setup

```bash
# Open Prisma Studio to view database
npm run prisma:studio
```

## Environment Variables

### Backend Environment Setup

Create `backend/.env.local`:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/aurelius?schema=public"
REDIS_URL="redis://:redis-password@localhost:6379"

# Application
NODE_ENV="development"
PORT=4000
FRONTEND_URL="http://localhost:3000"
BACKEND_URL="http://localhost:4000"

# Authentication
JWT_SECRET="your-super-secret-jwt-key-min-32-chars-long"
JWT_REFRESH_SECRET="your-super-secret-refresh-jwt-key-min-32-chars"
JWT_EXPIRY="15m"
JWT_REFRESH_EXPIRY="7d"

# Encryption
ENCRYPTION_KEY="your-32-character-encryption-key-here"

# OAuth - Google
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:4000/api/v1/auth/google/callback"

# OAuth - Microsoft
MICROSOFT_CLIENT_ID="your-microsoft-client-id"
MICROSOFT_CLIENT_SECRET="your-microsoft-client-secret"
MICROSOFT_REDIRECT_URI="http://localhost:4000/api/v1/auth/microsoft/callback"

# Paddle
PADDLE_VENDOR_ID="your-paddle-vendor-id"
PADDLE_API_KEY="your-paddle-api-key"
PADDLE_WEBHOOK_SECRET="your-webhook-secret"
PADDLE_PRODUCT_ID_PROFESSIONAL="pro_product_id"
PADDLE_PRODUCT_ID_TEAM="team_product_id"
PADDLE_PRODUCT_ID_ENTERPRISE="enterprise_product_id"

# AI Services
ANTHROPIC_API_KEY="sk-ant-your-anthropic-api-key"
OPENAI_API_KEY="sk-your-openai-api-key"
ELEVENLABS_API_KEY="your-elevenlabs-api-key"

# Email (SendGrid)
SENDGRID_API_KEY="SG.your-sendgrid-api-key"
FROM_EMAIL="noreply@yourdomain.com"
SUPPORT_EMAIL="support@yourdomain.com"

# Monitoring (Optional)
SENTRY_DSN="https://your-sentry-dsn@sentry.io/project-id"

# Feature Flags
ENABLE_VOICE_FEATURES="true"
ENABLE_ADVANCED_AI="true"
ENABLE_TEAM_FEATURES="false"

# Rate Limiting
RATE_LIMIT_TTL="60"
RATE_LIMIT_MAX="100"
```

### Frontend Environment Setup

Create `frontend/.env.local`:

```env
# Application
NEXT_PUBLIC_APP_NAME="Aurelius AI"
NEXT_PUBLIC_APP_DESCRIPTION="Your AI-Powered Digital Chief of Staff"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_API_URL="http://localhost:4000/api/v1"
NEXT_PUBLIC_WS_URL="ws://localhost:4000"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-must-match-backend"

# OAuth (must match backend)
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
MICROSOFT_CLIENT_ID="your-microsoft-client-id"
MICROSOFT_CLIENT_SECRET="your-microsoft-client-secret"

# Paddle Public Keys
NEXT_PUBLIC_PADDLE_VENDOR_ID="your-paddle-vendor-id"
NEXT_PUBLIC_PADDLE_ENVIRONMENT="sandbox"

# Feature Flags
NEXT_PUBLIC_ENABLE_VOICE_FEATURES="true"
NEXT_PUBLIC_ENABLE_TEAM_FEATURES="false"
```

## Third-Party Service Setup

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable APIs:
   - Google+ API
   - Gmail API
   - Google Calendar API
   - Google Drive API
   - Google Tasks API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs:
     - `http://localhost:4000/api/v1/auth/google/callback`
     - `http://localhost:3000/api/auth/callback/google`
5. Copy Client ID and Client Secret to `.env` files

### Microsoft OAuth Setup

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to Azure Active Directory → App registrations
3. Create new registration:
   - Supported account types: Personal Microsoft accounts only
   - Redirect URI: `http://localhost:4000/api/v1/auth/microsoft/callback`
4. Configure API permissions:
   - Microsoft Graph: User.Read, Mail.Read, Mail.Send, Calendars.ReadWrite
5. Create client secret and copy values to `.env` files

### Paddle Setup

1. Create account at [Paddle Dashboard](https://vendors.paddle.com)
2. Get Vendor ID and API key from Developer Tools → Authentication
3. Create products and plans:
   - Professional: $30/month
   - Team: $50/month  
   - Enterprise: $100/month
4. Set up webhook endpoint:
   - Endpoint URL: `http://localhost:4000/api/v1/billing/webhook`
   - Events to listen:
     - `subscription_created`
     - `subscription_updated`
     - `subscription_cancelled`
     - `payment_succeeded`
     - `payment_failed`
     - `subscription_payment_succeeded`

### Anthropic API Setup

1. Sign up at [Anthropic Console](https://console.anthropic.com)
2. Create API key
3. Add to `.env` file

### SendGrid Setup

1. Create account at [SendGrid](https://sendgrid.com)
2. Verify sender domain or email
3. Create API key with full access
4. Add to `.env` file

## Running the Application

### Development Mode

```bash
# From root directory - runs both frontend and backend
npm run dev

# Or run separately:
# Terminal 1 - Backend
cd backend
npm run start:dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Production Build

```bash
# Build both applications
npm run build

# Run production builds
npm start
```

### Access Points

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- API Documentation: http://localhost:4000/api/docs
- Prisma Studio: http://localhost:5555

## Testing

### Backend Tests

```bash
cd backend

# Unit tests
npm run test

# Unit tests with coverage
npm run test:cov

# E2E tests
npm run test:e2e

# Watch mode
npm run test:watch
```

### Frontend Tests

```bash
cd frontend

# Run tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Linting and Type Checking

```bash
# From root - lint everything
npm run lint

# Type checking
cd frontend && npm run type-check
cd ../backend && npm run build
```

## Deployment

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Manual Deployment

#### Backend Deployment (Railway/Render)

1. Set environment variables in hosting platform
2. Configure build command: `npm run build`
3. Configure start command: `npm run start:prod`
4. Set PORT environment variable

#### Frontend Deployment (Vercel)

1. Import project to Vercel
2. Configure environment variables
3. Set framework preset: Next.js
4. Deploy

## Troubleshooting

### Common Issues

#### Database Connection Issues

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connection
psql -h localhost -U postgres -d aurelius

# Reset database
cd backend
npm run prisma:migrate:reset
```

#### Redis Connection Issues

```bash
# Check Redis is running
redis-cli ping

# Test with password
redis-cli -a redis-password ping
```

#### Port Already in Use

```bash
# Find process using port
lsof -i :3000  # or :4000

# Kill process
kill -9 <PID>
```

#### Prisma Issues

```bash
# Regenerate Prisma Client
npx prisma generate

# Reset database
npx prisma migrate reset

# Update Prisma
npm update @prisma/client prisma
```

### Debug Mode

```bash
# Backend debug mode
cd backend
npm run start:debug

# Frontend debug mode
cd frontend
NODE_OPTIONS='--inspect' npm run dev
```

### Logs

- Backend logs: Check console output or `backend/logs/` directory
- Frontend logs: Browser console
- Database logs: PostgreSQL logs in `/var/log/postgresql/`

## Performance Optimization

### Database Indexes

```sql
-- Add custom indexes for performance
CREATE INDEX idx_tasks_user_status ON "Task"("userId", "status");
CREATE INDEX idx_events_user_time ON "CalendarEvent"("userId", "startTime", "endTime");
CREATE INDEX idx_embeddings_user_type ON "VectorEmbedding"("userId", "contentType");
```

### Redis Configuration

```bash
# Optimize Redis for caching
redis-cli
CONFIG SET maxmemory 2gb
CONFIG SET maxmemory-policy allkeys-lru
```

## Security Best Practices

1. **Never commit `.env` files**
2. **Use strong passwords** for database and Redis
3. **Rotate JWT secrets** regularly
4. **Enable HTTPS** in production
5. **Set up CORS** properly for production domains
6. **Use rate limiting** to prevent abuse
7. **Keep dependencies updated** with `npm audit`

## Next Steps

1. Set up monitoring with Sentry
2. Configure CI/CD pipeline
3. Set up staging environment
4. Enable SSL certificates
5. Configure CDN for static assets
6. Set up database backups
7. Configure log aggregation

## Support

If you encounter any issues:

1. Check the [troubleshooting section](#troubleshooting)
2. Search existing [GitHub issues](https://github.com/aurelius-ai/aurelius/issues)
3. Join our [Discord community](https://discord.gg/aurelius)
4. Contact support at support@aurelius.ai