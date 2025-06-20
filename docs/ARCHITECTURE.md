# Aurelius AI - System Architecture Documentation

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Component Architecture](#component-architecture)
5. [Data Flow](#data-flow)
6. [Security Architecture](#security-architecture)
7. [Deployment Architecture](#deployment-architecture)
8. [Performance Considerations](#performance-considerations)

## Overview

Aurelius AI is a sophisticated AI-powered personal assistant platform designed to act as a "digital chief of staff" for users. The system employs a modern microservices-inspired architecture with a clear separation between frontend and backend services, optimized for scalability, reliability, and performance.

### Key Architectural Principles

- **Modularity**: Clear separation of concerns with distinct modules for each domain
- **Scalability**: Horizontal scaling capabilities through containerization and queue-based processing
- **Security**: Multi-layer security with encryption at rest and in transit
- **Performance**: Intelligent caching, optimized database queries, and efficient AI model usage
- **Reliability**: Graceful error handling, circuit breakers, and failover mechanisms

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Client Layer                           │
├─────────────────────┬───────────────────┬─────────────────────┤
│   Web Application   │  Mobile App (PWA) │   Browser Extension │
│    (Next.js 14)     │                   │                     │
└─────────────────────┴───────────────────┴─────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                          │
│                    (NestJS + Express)                           │
├─────────────────────────────────────────────────────────────────┤
│  • Rate Limiting    • Authentication    • Request Routing       │
│  • CORS             • Compression       • Logging               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Application Services                         │
├──────────────┬──────────────┬──────────────┬──────────────────┤
│     Auth     │   AI Gateway │    Tasks     │   Calendar       │
│   Service    │    Service   │   Service    │   Service        │
├──────────────┼──────────────┼──────────────┼──────────────────┤
│   Billing    │    Email     │ Integrations │ Notifications    │
│   Service    │   Service    │   Service    │   Service        │
└──────────────┴──────────────┴──────────────┴──────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Data Layer                                 │
├──────────────┬──────────────┬──────────────┬──────────────────┤
│  PostgreSQL  │    Redis     │  S3 Storage  │  Vector DB       │
│  (Primary)   │   (Cache)    │   (Files)    │ (Embeddings)     │
└──────────────┴──────────────┴──────────────┴──────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   External Services                             │
├──────────────┬──────────────┬──────────────┬──────────────────┤
│  Anthropic   │    OpenAI    │   Stripe     │  OAuth Providers │
│   Claude     │ Embeddings   │   Billing    │  (Google, MS)    │
└──────────────┴──────────────┴──────────────┴──────────────────┘
```

## Technology Stack

### Frontend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.2.5 | React framework with SSR/SSG |
| TypeScript | 5.x | Type safety and developer experience |
| Tailwind CSS | 3.x | Utility-first CSS framework |
| Radix UI | Latest | Accessible component primitives |
| Framer Motion | 10.17.9 | Animations and transitions |
| Zustand | 4.4.7 | State management |
| Socket.io Client | 4.7.2 | Real-time communication |
| React Query | 5.17.0 | Server state management |
| React Hook Form | 7.48.2 | Form handling with validation |
| Zod | 3.22.4 | Schema validation |

### Backend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| NestJS | 10.3.0 | Node.js framework for scalable applications |
| TypeScript | 5.3.3 | Type safety and developer experience |
| Prisma | 5.7.1 | Type-safe ORM with migrations |
| PostgreSQL | 15+ | Primary database with pgvector extension |
| Redis | 7+ | Caching and session management |
| Bull | 4.11.5 | Queue management for background jobs |
| Socket.io | 4.7.2 | WebSocket server for real-time features |
| Passport | 0.7.0 | Authentication middleware |
| Swagger | 7.1.17 | API documentation |

### AI & ML Technologies

| Technology | Purpose |
|------------|---------|
| Anthropic Claude | Primary AI model for complex tasks |
| OpenAI API | Embeddings and specialized tasks |
| pgvector | Vector similarity search |
| ElevenLabs | Text-to-speech synthesis |

## Component Architecture

### Frontend Components

```
src/
├── app/                    # Next.js 14 app directory
│   ├── (auth)/            # Authentication pages
│   ├── dashboard/         # Protected dashboard routes
│   ├── api/              # API routes (minimal, mostly for auth)
│   └── layout.tsx        # Root layout with providers
├── components/
│   ├── ui/               # Base UI components (Button, Card, etc.)
│   ├── landing/          # Landing page components
│   ├── dashboard/        # Dashboard-specific components
│   ├── shared/           # Shared components across app
│   └── layouts/          # Layout components
├── lib/
│   ├── api/              # API client functions
│   ├── auth/             # Authentication utilities
│   ├── stores/           # Zustand stores
│   └── utils/            # Utility functions
└── hooks/                # Custom React hooks
```

### Backend Modules

```
src/
├── modules/
│   ├── auth/             # Authentication & authorization
│   ├── users/            # User management
│   ├── billing/          # Subscription & payment processing
│   ├── ai-gateway/       # AI service orchestration
│   ├── tasks/            # Task management
│   ├── calendar/         # Calendar & event management
│   ├── email/            # Email processing & management
│   ├── integrations/     # Third-party integrations
│   ├── websocket/        # Real-time communication
│   ├── cache/            # Caching strategies
│   ├── queue/            # Background job processing
│   └── notifications/    # Notification system
├── common/
│   ├── decorators/       # Custom decorators
│   ├── filters/          # Exception filters
│   ├── guards/           # Auth & permission guards
│   ├── interceptors/     # Request/response interceptors
│   └── pipes/            # Validation pipes
└── config/               # Configuration management
```

## Data Flow

### 1. Request Flow

```
User Action → Frontend → API Gateway → Service Layer → Data Layer
     ↑                                                      ↓
     └──────────────── Response ←──────────────────────────┘
```

### 2. Real-time Data Flow

```
WebSocket Connection
     ↓
Socket.io Server
     ↓
Event Broadcasting
     ↓
Client Updates
```

### 3. AI Processing Flow

```
User Request
     ↓
Usage Tracking → Cache Check → AI Gateway
                      ↓             ↓
                  Cache Hit    Model Selection
                      ↓             ↓
                  Return      Process Request
                              ↓
                         Cache Response
                              ↓
                         Return Result
```

## Security Architecture

### Authentication Flow

1. **OAuth Flow**:
   - User initiates OAuth login
   - Redirect to provider (Google/Microsoft)
   - Callback with authorization code
   - Exchange for tokens
   - Create/update user session
   - Issue JWT tokens

2. **JWT Token Strategy**:
   - Access Token: 15-minute expiry
   - Refresh Token: 7-day expiry
   - Secure HTTP-only cookies
   - Token rotation on refresh

### Data Security

1. **Encryption**:
   - AES-256 for sensitive data at rest
   - TLS 1.3 for data in transit
   - Encrypted OAuth tokens in database

2. **Access Control**:
   - Role-based access control (RBAC)
   - Row-level security in database
   - API key management for integrations

## Deployment Architecture

### Production Environment

```
┌─────────────────┐     ┌─────────────────┐
│   Cloudflare    │     │   Vercel CDN    │
│      (WAF)      │     │   (Frontend)    │
└────────┬────────┘     └────────┬────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│  Load Balancer  │     │   Next.js App   │
│   (Railway)     │     │    (Vercel)     │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│          Container Cluster              │
├─────────────────┬───────────────────────┤
│   API Servers   │   Background Workers  │
│   (Auto-scale)  │    (Bull Queue)       │
└─────────────────┴───────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│           Data Services                 │
├──────────┬──────────┬──────────────────┤
│ Postgres │  Redis   │   S3 Storage     │
│  (RDS)   │ (Cluster)│   (AWS/R2)       │
└──────────┴──────────┴──────────────────┘
```

### Scaling Strategy

1. **Horizontal Scaling**:
   - API servers auto-scale based on CPU/memory
   - Read replicas for database
   - Redis cluster for caching

2. **Vertical Scaling**:
   - Upgrade instance types as needed
   - Optimize database queries
   - Efficient caching strategies

## Performance Considerations

### Caching Strategy

1. **Multi-Layer Caching**:
   - L1: In-memory LRU cache (5-minute TTL)
   - L2: Redis cache (variable TTL)
   - L3: Database query cache

2. **Cache Keys**:
   - User-specific: `user:{userId}:{resource}`
   - Global: `global:{resource}:{identifier}`
   - AI responses: `ai:{type}:{hash}`

### Database Optimization

1. **Indexing Strategy**:
   - Composite indexes for common queries
   - Partial indexes for filtered queries
   - GIN indexes for full-text search

2. **Query Optimization**:
   - Eager loading for related data
   - Pagination for large datasets
   - Connection pooling

### AI Cost Optimization

1. **Intelligent Model Selection**:
   - Claude Haiku for simple tasks
   - Claude Sonnet for complex reasoning
   - Cached responses for repeated queries

2. **Request Batching**:
   - Combine similar requests
   - Process during off-peak hours
   - Preemptive caching

## Monitoring & Observability

### Metrics Collection

- **Application Metrics**: Response times, error rates, throughput
- **Infrastructure Metrics**: CPU, memory, disk usage
- **Business Metrics**: User actions, AI usage, subscription metrics

### Logging Strategy

- **Structured Logging**: JSON format with correlation IDs
- **Log Levels**: Error, Warn, Info, Debug
- **Log Aggregation**: Centralized log management

### Error Tracking

- **Sentry Integration**: Real-time error tracking
- **Custom Error Boundaries**: Graceful error handling
- **Alerting**: Automated alerts for critical errors

## Disaster Recovery

### Backup Strategy

1. **Database Backups**:
   - Daily automated backups
   - Point-in-time recovery
   - Cross-region replication

2. **File Storage**:
   - Versioned S3 buckets
   - Cross-region replication
   - 30-day retention policy

### Recovery Procedures

1. **RTO (Recovery Time Objective)**: < 1 hour
2. **RPO (Recovery Point Objective)**: < 15 minutes
3. **Failover Process**: Automated with health checks

## Future Considerations

### Planned Enhancements

1. **Microservices Migration**: Separate services for better scalability
2. **GraphQL Gateway**: Unified API layer
3. **Edge Computing**: Reduce latency with edge functions
4. **Machine Learning Pipeline**: Custom model training

### Technology Upgrades

1. **Kubernetes Orchestration**: For container management
2. **Service Mesh**: For inter-service communication
3. **Event-Driven Architecture**: For better decoupling