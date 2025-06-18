# 🚀 Aurelius Setup Guide

This guide will help you set up the Aurelius AI Personal Assistant platform for development and production.

## 📋 Prerequisites

### Required Software
- **Node.js**: v20.x LTS (Latest)
- **PostgreSQL**: v16+ with pgvector extension
- **Redis**: v7.x
- **npm**: v10.x (comes with Node.js)

### Required Accounts & API Keys
- **Anthropic**: API key for Claude AI models
- **ElevenLabs**: API key for voice processing
- **Google OAuth**: Client ID and secret
- **Microsoft OAuth**: Client ID and secret
- **Apple OAuth**: Client ID, team ID, key ID, and private key (optional)

## 🛠️ Development Setup

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd Aurelius

# Install dependencies for both frontend and backend
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies  
cd ../frontend && npm install
```

### 2. Database Setup

```bash
# Start PostgreSQL and Redis (using Docker)
docker run --name aurelius-postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:16
docker run --name aurelius-redis -p 6379:6379 -d redis:7

# Enable pgvector extension in PostgreSQL
docker exec -it aurelius-postgres psql -U postgres -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### 3. Environment Configuration

#### Backend Configuration
```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` with your actual values:

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/aurelius_dev?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT Secrets (generate strong random strings)
JWT_SECRET="your-super-secret-jwt-key-256-bits-minimum"
REFRESH_TOKEN_SECRET="your-refresh-token-secret-256-bits-minimum"

# AI Services
ANTHROPIC_API_KEY="sk-ant-api03-..."
ELEVENLABS_API_KEY="your-elevenlabs-api-key"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-your-google-client-secret"
MICROSOFT_CLIENT_ID="your-microsoft-client-id"
MICROSOFT_CLIENT_SECRET="your-microsoft-client-secret"
```

#### Frontend Configuration
```bash
cd frontend
cp .env.example .env.local
```

Edit `frontend/.env.local`:

```env
# API Configuration
NEXT_PUBLIC_API_URL="http://localhost:3001/api/v1"
NEXT_PUBLIC_WS_URL="http://localhost:3001"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-key"

# OAuth (same as backend)
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-your-google-client-secret"
```

### 4. Database Initialization

```bash
cd backend

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed database with sample data
npm run prisma:seed

# Optional: Open Prisma Studio to view data
npm run prisma:studio
```

### 5. Start Development Servers

#### Option 1: Start Both Services (Recommended)
```bash
# From root directory
npm run dev
```

#### Option 2: Start Services Individually
```bash
# Terminal 1: Backend
cd backend
npm run start:dev

# Terminal 2: Frontend  
cd frontend
npm run dev
```

## 🔑 OAuth Setup

### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API and Gmail API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `http://localhost:3001/api/v1/auth/google/callback`

### Microsoft OAuth
1. Go to [Azure Portal](https://portal.azure.com/)
2. Register a new application
3. Add redirect URIs:
   - `http://localhost:3000/api/auth/callback/microsoft`
   - `http://localhost:3001/api/v1/auth/microsoft/callback`
4. Generate client secret

### Apple OAuth (Optional)
1. Go to [Apple Developer](https://developer.apple.com/)
2. Create App ID and Service ID
3. Generate private key
4. Configure return URLs

## 🧪 Testing

```bash
# Backend tests
cd backend
npm run test
npm run test:e2e
npm run test:cov

# Frontend tests
cd frontend
npm run test
npm run test:watch
```

## 📝 API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://localhost:3001/api/docs
- **Health Check**: http://localhost:3001/api/v1/health

## 🌐 Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api/v1
- **Prisma Studio**: http://localhost:5555 (when running)

## 🔍 Monitoring & Debugging

### Logs
- Backend logs: `backend/logs/`
- Frontend logs: Browser console + Next.js terminal

### Database
```bash
# Connect to database
docker exec -it aurelius-postgres psql -U postgres -d aurelius_dev

# View tables
\dt

# Check pgvector extension
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### Redis
```bash
# Connect to Redis
docker exec -it aurelius-redis redis-cli

# Check keys
KEYS *

# Monitor commands
MONITOR
```

## 🚀 Production Deployment

### Environment Variables
Update production environment variables:

```env
# Backend
NODE_ENV="production"
DATABASE_URL="your-production-database-url"
REDIS_URL="your-production-redis-url"
JWT_SECRET="strong-production-secret"
CORS_ORIGIN="https://yourdomain.com"

# Frontend
NEXT_PUBLIC_API_URL="https://api.yourdomain.com/api/v1"
NEXTAUTH_URL="https://yourdomain.com"
```

### Build Commands
```bash
# Build backend
cd backend
npm run build

# Build frontend
cd frontend
npm run build

# Start production
npm run start:prod
```

## 🔧 Troubleshooting

### Common Issues

#### Database Connection Error
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check connection
npx prisma db pull
```

#### Redis Connection Error
```bash
# Check Redis is running
docker ps | grep redis

# Test connection
redis-cli ping
```

#### OAuth Redirect Errors
- Verify redirect URIs match exactly in OAuth provider settings
- Check that ports 3000 and 3001 are not blocked
- Ensure environment variables are correctly set

#### Build Errors
```bash
# Clear Next.js cache
cd frontend
rm -rf .next

# Clear node_modules
rm -rf node_modules package-lock.json
npm install
```

## 📞 Support

For additional help:
1. Check the [troubleshooting section](#-troubleshooting)
2. Review application logs
3. Verify all environment variables are set correctly
4. Ensure all required services (PostgreSQL, Redis) are running

## 🔐 Security Notes

- Never commit `.env` files to version control
- Use strong, unique secrets for production
- Enable HTTPS in production
- Regularly rotate API keys and secrets
- Monitor authentication logs for suspicious activity