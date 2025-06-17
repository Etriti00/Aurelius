# Aurelius - AI Personal Assistant

Your Digital Chief of Staff that transforms to-do lists into done lists.

## Overview

Aurelius is a revolutionary AI Personal Assistant that provides proactive task execution, deep workspace integration, and perfect memory of all user interactions.

### Core Features

- **Perfect Memory**: AI that remembers every detail
- **Proactive Execution**: Tasks complete themselves while you focus on what matters
- **Deep Integration**: Works with Google, Microsoft, Slack, and more
- **AI Chief of Staff**: Strategic insights and briefings like a human assistant

## Architecture

This is a monorepo containing:

- **Frontend**: Next.js 14 with App Router, TypeScript, Tailwind CSS
- **Backend**: NestJS with TypeScript, PostgreSQL, Redis

## Development

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- npm or pnpm

### Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Setup environment variables (see .env.example)
4. Start development servers: `npm run dev`

### Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build both applications for production
- `npm run lint` - Run linting for both applications
- `npm run test` - Run tests for both applications

## Deployment

![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/Etriti00/Aurelius?utm_source=oss&utm_medium=github&utm_campaign=Etriti00%2FAurelius&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)

- **Frontend**: Vercel with automatic deployments
- **Backend**: Railway with PostgreSQL and Redis
- **Database**: PostgreSQL with pgvector extension for AI embeddings

## License

Private - All rights reserved