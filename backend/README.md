# Aurelius Backend API

AI Personal Assistant Backend built with NestJS, PostgreSQL, and Redis.

## Architecture

- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with pgvector extension
- **Cache**: Redis
- **Authentication**: JWT with OAuth2 (Google, Microsoft)
- **Queue**: Bull (Redis-based)
- **AI**: Claude Sonnet 4 integration
- **Billing**: Stripe integration
- **Email**: SendGrid integration

## Prerequisites

- Node.js 18+
- PostgreSQL 15+ with pgvector extension
- Redis 7+
- npm or pnpm

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Environment setup**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Database setup**:
   ```bash
   # Install pgvector extension in PostgreSQL
   # CREATE EXTENSION vector;
   
   # Generate Prisma client
   npm run prisma:generate
   
   # Run migrations
   npm run prisma:migrate
   
   # Seed database with sample data
   npm run prisma:seed
   ```

4. **Start development server**:
   ```bash
   npm run start:dev
   ```

The API will be available at `http://localhost:3001`

## API Documentation

When running in development mode, Swagger documentation is available at:
`http://localhost:3001/api/docs`

## Scripts

- `npm run start:dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start:prod` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests
- `npm run prisma:studio` - Open Prisma Studio
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:seed` - Seed database with sample data

## Module Structure

```
src/
├── modules/
│   ├── auth/              # Authentication & JWT
│   ├── users/             # User management
│   ├── billing/           # Stripe integration
│   ├── integrations/      # External services (Google, Microsoft, Slack)
│   ├── ai-gateway/        # Claude Sonnet 4 integration
│   ├── tasks/             # Task management
│   ├── calendar/          # Calendar operations
│   ├── email/             # Email processing
│   └── websocket/         # Real-time communications
├── common/                # Shared utilities
├── config/                # Configuration
└── prisma/                # Database service
```

## Environment Variables

See `.env.example` for all required environment variables including:

- Database connection
- JWT secrets
- OAuth provider credentials
- AI service API keys
- Payment provider keys
- External service configurations

## Database Schema

The database uses PostgreSQL with the pgvector extension for AI embeddings:

- **Users**: User accounts and preferences
- **Subscriptions**: Billing and plan management
- **Integrations**: External service connections
- **Tasks**: Task management with AI context
- **EmailThreads**: Email processing and AI summaries
- **CalendarEvents**: Calendar integration with AI preparation
- **VectorEmbeddings**: AI-generated embeddings for search
- **AiActions**: AI interaction logging and usage tracking

## Security

- JWT authentication with refresh tokens
- OAuth2 integration for Google and Microsoft
- Rate limiting (100 requests per minute)
- Input validation with class-validator
- Encrypted storage of sensitive tokens
- CORS configuration for frontend integration

## AI Integration

The API integrates with Claude Sonnet 4 for:

- Email analysis and drafting
- Task prioritization and suggestions
- Meeting preparation and briefings
- Semantic search across user data
- Proactive automation recommendations

## Deployment

The backend is designed to deploy on Railway with:

- Automatic PostgreSQL database provisioning
- Redis instance for caching and queues
- Environment-based configuration
- Built-in health checks and monitoring