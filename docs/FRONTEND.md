# Aurelius AI - Frontend Documentation

## Table of Contents
1. [Overview](#overview)
2. [Project Structure](#project-structure)
3. [Core Technologies](#core-technologies)
4. [Component Architecture](#component-architecture)
5. [State Management](#state-management)
6. [Routing & Navigation](#routing--navigation)
7. [Authentication](#authentication)
8. [API Integration](#api-integration)
9. [Real-time Features](#real-time-features)
10. [UI/UX Design System](#uiux-design-system)
11. [Performance Optimization](#performance-optimization)
12. [Testing Strategy](#testing-strategy)
13. [Build & Deployment](#build--deployment)

## Overview

The Aurelius AI frontend is built with Next.js 14, leveraging the latest App Router for optimal performance and developer experience. The application features a sophisticated, Apple-inspired design with heavy use of glassmorphism effects, smooth animations, and 3D visualizations.

### Key Features

- **Server-Side Rendering (SSR)**: Optimal SEO and initial load performance
- **Progressive Web App (PWA)**: Offline capabilities and mobile optimization
- **Real-time Updates**: WebSocket integration for live data
- **Responsive Design**: Mobile-first approach with desktop enhancements
- **Accessibility**: WCAG 2.1 AA compliance with Radix UI primitives

## Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js 14 App Router
│   │   ├── (auth)/            # Authentication group
│   │   │   ├── signin/        # Sign in page
│   │   │   └── signup/        # Sign up page
│   │   ├── dashboard/         # Protected dashboard routes
│   │   │   ├── layout.tsx     # Dashboard layout
│   │   │   ├── page.tsx       # Dashboard home
│   │   │   ├── tasks/         # Task management
│   │   │   ├── calendar/      # Calendar view
│   │   │   ├── email/         # Email management
│   │   │   └── settings/      # User settings
│   │   ├── api/              # API routes
│   │   │   └── auth/         # NextAuth.js endpoints
│   │   ├── layout.tsx        # Root layout
│   │   ├── page.tsx          # Landing page
│   │   └── globals.css       # Global styles
│   ├── components/
│   │   ├── ui/               # Base UI components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   └── ...
│   │   ├── landing/          # Landing page components
│   │   │   ├── HeroSection.tsx
│   │   │   ├── FeaturesGrid.tsx
│   │   │   ├── PricingSection.tsx
│   │   │   ├── Brain3D.tsx
│   │   │   └── ...
│   │   ├── dashboard/        # Dashboard components
│   │   │   ├── OverviewCard.tsx
│   │   │   ├── TasksKanban.tsx
│   │   │   ├── CalendarWidget.tsx
│   │   │   ├── InboxWidget.tsx
│   │   │   └── FloatingActionButton.tsx
│   │   ├── shared/           # Shared components
│   │   │   ├── Logo.tsx
│   │   │   ├── BrainIcon.tsx
│   │   │   ├── LiquidGlassIcon.tsx
│   │   │   ├── CommandModal.tsx
│   │   │   └── WebSocketIndicator.tsx
│   │   └── layouts/          # Layout components
│   │       └── DashboardLayout.tsx
│   ├── lib/
│   │   ├── api/              # API client
│   │   │   ├── client.ts     # Axios instance
│   │   │   ├── auth.ts       # Auth endpoints
│   │   │   ├── tasks.ts      # Task endpoints
│   │   │   ├── calendar.ts   # Calendar endpoints
│   │   │   └── ...
│   │   ├── auth/             # Authentication
│   │   │   └── config.ts     # NextAuth config
│   │   ├── stores/           # Zustand stores
│   │   │   ├── authStore.ts
│   │   │   ├── taskStore.ts
│   │   │   └── uiStore.ts
│   │   ├── hooks/            # Custom hooks
│   │   │   ├── useWebSocket.ts
│   │   │   ├── useDebounce.ts
│   │   │   └── useLocalStorage.ts
│   │   └── utils/            # Utilities
│   │       ├── cn.ts         # Class name helper
│   │       ├── formatters.ts
│   │       └── validators.ts
│   └── types/                # TypeScript types
│       ├── api.ts
│       ├── models.ts
│       └── next-auth.d.ts
├── public/                   # Static assets
│   ├── images/
│   ├── fonts/
│   └── manifest.json
├── tests/                    # Test files
├── next.config.js           # Next.js configuration
├── tailwind.config.ts       # Tailwind configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Dependencies
```

## Core Technologies

### Next.js 14 Features

```typescript
// App Router with TypeScript
// app/dashboard/page.tsx
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard | Aurelius AI',
  description: 'Your AI-powered command center',
}

export default async function DashboardPage() {
  // Server Component - can fetch data directly
  const data = await fetchDashboardData()
  
  return <DashboardClient initialData={data} />
}
```

### TypeScript Configuration

```typescript
// Strict type checking enabled
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"]
    }
  }
}
```

## Component Architecture

### Design Principles

1. **Atomic Design**: Components organized by complexity
2. **Composition over Inheritance**: Flexible component composition
3. **Single Responsibility**: Each component has one clear purpose
4. **Type Safety**: Full TypeScript coverage

### Component Examples

#### Base UI Component
```typescript
// components/ui/button.tsx
import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-2xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-black text-white shadow-lg hover:bg-gray-800 active:scale-95',
        outline: 'border-2 border-gray-200 bg-white hover:bg-gray-50',
        ghost: 'hover:bg-gray-100',
      },
      size: {
        sm: 'h-9 px-3',
        default: 'h-11 px-8',
        lg: 'h-12 px-10',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'

export { Button, buttonVariants }
```

#### Complex Component with Animation
```typescript
// components/landing/Brain3D.tsx
import { useRef, useEffect } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

export function Brain3D() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll()
  const rotateY = useTransform(scrollY, [0, 1000], [0, 360])
  
  return (
    <motion.div
      ref={containerRef}
      className="relative w-full h-full perspective-1000"
      style={{ rotateY }}
    >
      <div className="absolute inset-0 preserve-3d">
        {/* Outer Shell */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-600/20 backdrop-blur-xl animate-float" />
        
        {/* Neural Network */}
        <svg className="absolute inset-0" viewBox="0 0 400 400">
          {/* Animated neural connections */}
        </svg>
        
        {/* Orbiting Particles */}
        {Array.from({ length: 32 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white rounded-full"
            style={{
              animation: `orbit-${i} ${10 + i * 0.5}s linear infinite`,
            }}
          />
        ))}
      </div>
    </motion.div>
  )
}
```

## State Management

### Zustand Store Architecture

```typescript
// lib/stores/authStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  name: string
  avatar?: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (user: User) => void
  logout: () => void
  updateUser: (updates: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      
      login: (user) => set({ user, isAuthenticated: true, isLoading: false }),
      
      logout: () => set({ user: null, isAuthenticated: false }),
      
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
)
```

### React Query Integration

```typescript
// lib/api/tasks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'

export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data } = await apiClient.get('/tasks')
      return data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (task: CreateTaskDto) => {
      const { data } = await apiClient.post('/tasks', task)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
```

## Routing & Navigation

### App Router Structure

```typescript
// File-based routing with layouts
app/
├── layout.tsx              # Root layout
├── page.tsx               # Home page (/)
├── dashboard/
│   ├── layout.tsx         # Dashboard layout
│   ├── page.tsx          # Dashboard home (/dashboard)
│   ├── tasks/
│   │   ├── page.tsx      # Tasks list (/dashboard/tasks)
│   │   └── [id]/
│   │       └── page.tsx  # Task detail (/dashboard/tasks/123)
│   └── loading.tsx       # Loading state
└── api/
    └── auth/[...nextauth]/
        └── route.ts      # NextAuth API route
```

### Protected Routes

```typescript
// app/dashboard/layout.tsx
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/signin')
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav user={session.user} />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
```

## Authentication

### NextAuth.js Configuration

```typescript
// lib/auth/config.ts
import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@next-auth/prisma-adapter'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
          scope: 'openid email profile https://www.googleapis.com/auth/gmail.readonly',
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.accessToken = token.accessToken as string
      }
      return session
    },
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
      }
      return token
    },
  },
  pages: {
    signIn: '/signin',
    error: '/auth/error',
  },
}
```

## API Integration

### API Client Setup

```typescript
// lib/api/client.ts
import axios from 'axios'
import { getSession } from 'next-auth/react'

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for auth
apiClient.interceptors.request.use(async (config) => {
  const session = await getSession()
  
  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`
  }
  
  return config
})

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle token refresh or redirect to login
    }
    return Promise.reject(error)
  }
)
```

## Real-time Features

### WebSocket Integration

```typescript
// lib/websocket/websocket.service.ts
import { io, Socket } from 'socket.io-client'

class WebSocketService {
  private socket: Socket | null = null
  private listeners: Map<string, Set<Function>> = new Map()

  connect(token: string) {
    this.socket = io(process.env.NEXT_PUBLIC_WS_URL!, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    this.socket.on('connect', () => {
      console.log('WebSocket connected')
      this.emit('connected')
    })

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected')
      this.emit('disconnected')
    })
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
    
    this.socket?.on(event, callback)
  }

  off(event: string, callback: Function) {
    this.listeners.get(event)?.delete(callback)
    this.socket?.off(event, callback)
  }

  emit(event: string, ...args: any[]) {
    this.socket?.emit(event, ...args)
  }

  disconnect() {
    this.socket?.disconnect()
    this.socket = null
    this.listeners.clear()
  }
}

export const websocketService = new WebSocketService()
```

### Custom Hook for WebSocket

```typescript
// hooks/useWebSocket.ts
import { useEffect, useCallback } from 'react'
import { websocketService } from '@/lib/websocket/websocket.service'

export function useWebSocket(event: string, handler: (data: any) => void) {
  const memoizedHandler = useCallback(handler, [])

  useEffect(() => {
    websocketService.on(event, memoizedHandler)
    
    return () => {
      websocketService.off(event, memoizedHandler)
    }
  }, [event, memoizedHandler])

  const emit = useCallback((data: any) => {
    websocketService.emit(event, data)
  }, [event])

  return { emit }
}
```

## UI/UX Design System

### Design Tokens

```css
/* globals.css */
:root {
  /* Colors */
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  
  /* Spacing */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;
  
  /* Border Radius */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-2xl: 1.5rem;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
}
```

### Glassmorphism Components

```css
/* Glassmorphism utilities */
.liquid-glass {
  @apply bg-white/60 backdrop-blur-xl border border-white/20;
  box-shadow: 
    0 8px 32px 0 rgba(31, 38, 135, 0.15),
    inset 0 2px 0 0 rgba(255, 255, 255, 0.5);
}

.liquid-glass-accent {
  @apply bg-gradient-to-br from-white/80 via-white/60 to-white/40 backdrop-blur-2xl border border-white/30;
  box-shadow: 
    0 10px 40px 0 rgba(31, 38, 135, 0.2),
    inset 0 2px 0 0 rgba(255, 255, 255, 0.6),
    inset 0 -2px 0 0 rgba(255, 255, 255, 0.1);
}
```

### Animation System

```typescript
// Framer Motion variants
export const fadeInUp = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
}

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

// Usage
<motion.div variants={staggerContainer} initial="initial" animate="animate">
  {items.map((item) => (
    <motion.div key={item.id} variants={fadeInUp}>
      {item.content}
    </motion.div>
  ))}
</motion.div>
```

## Performance Optimization

### Next.js Optimizations

1. **Image Optimization**
```typescript
import Image from 'next/image'

<Image
  src="/hero-image.png"
  alt="Hero"
  width={1200}
  height={600}
  priority // Load immediately
  placeholder="blur"
  blurDataURL={shimmerDataUrl}
/>
```

2. **Dynamic Imports**
```typescript
const Brain3D = dynamic(() => import('@/components/landing/Brain3D'), {
  loading: () => <div className="animate-pulse">Loading 3D...</div>,
  ssr: false, // Disable SSR for Three.js
})
```

3. **Route Prefetching**
```typescript
import Link from 'next/link'

<Link href="/dashboard" prefetch>
  Dashboard
</Link>
```

### Bundle Optimization

```javascript
// next.config.js
module.exports = {
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  webpack: (config) => {
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        default: false,
        vendors: false,
        framework: {
          name: 'framework',
          chunks: 'all',
          test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
          priority: 40,
          enforce: true,
        },
        lib: {
          test(module) {
            return module.size() > 160000
          },
          name(module) {
            const hash = crypto.createHash('sha256')
            hash.update(module.identifier())
            return hash.digest('hex').substring(0, 8)
          },
          priority: 30,
          minChunks: 1,
          reuseExistingChunk: true,
        },
      },
    }
    return config
  },
}
```

## Testing Strategy

### Unit Testing

```typescript
// components/ui/__tests__/button.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../button'

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button')).toHaveTextContent('Click me')
  })

  it('handles click events', async () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    await userEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('applies variant styles', () => {
    render(<Button variant="outline">Outline</Button>)
    expect(screen.getByRole('button')).toHaveClass('border-2')
  })
})
```

### Integration Testing

```typescript
// app/dashboard/__tests__/dashboard.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Dashboard from '../page'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
})

describe('Dashboard', () => {
  it('loads and displays dashboard data', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Dashboard />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Welcome back')).toBeInTheDocument()
    })

    expect(screen.getByRole('heading', { name: /tasks/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /calendar/i })).toBeInTheDocument()
  })
})
```

## Build & Deployment

### Build Configuration

```json
// package.json scripts
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:ci": "jest --ci --coverage",
    "analyze": "ANALYZE=true next build"
  }
}
```

### Environment Variables

```bash
# .env.production
NEXT_PUBLIC_APP_URL=https://aurelius.ai
NEXT_PUBLIC_API_URL=https://api.aurelius.ai
NEXT_PUBLIC_WS_URL=wss://api.aurelius.ai

# Server-only
NEXTAUTH_URL=https://aurelius.ai
NEXTAUTH_SECRET=production-secret
DATABASE_URL=postgresql://...
```

### Deployment Process

1. **Vercel Deployment**
```yaml
# vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "functions": {
    "app/api/auth/[...nextauth]/route.ts": {
      "maxDuration": 10
    }
  }
}
```

2. **GitHub Actions CI/CD**
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test:ci
      - run: npm run build
      
      - uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

## Best Practices

### Code Organization

1. **Barrel Exports**: Use index files for clean imports
2. **Co-location**: Keep related files together
3. **Naming Conventions**: PascalCase for components, camelCase for functions
4. **File Structure**: Feature-based organization

### Performance Guidelines

1. **Lazy Loading**: Use dynamic imports for heavy components
2. **Image Optimization**: Always use Next.js Image component
3. **Bundle Size**: Monitor with webpack-bundle-analyzer
4. **Caching**: Implement proper cache headers

### Security Considerations

1. **Environment Variables**: Never expose sensitive data
2. **Input Validation**: Validate all user inputs
3. **XSS Prevention**: Use React's built-in escaping
4. **CSP Headers**: Implement Content Security Policy