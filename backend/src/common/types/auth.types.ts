import { User } from '@prisma/client'

/**
 * Authentication type definitions for Aurelius
 * JWT-based auth with OAuth providers as per CLAUDE.md
 */

export interface JwtPayload {
  sub: string // User ID,
  email: string
  roles?: string[]
  iat?: number
  exp?: number
  iss?: string
}

export interface AuthTokens {
  accessToken: string,
  refreshToken: string
  expiresIn: number,
  tokenType: string
}

export interface UserSession {
  userId: string,
  email: string
  roles: string[]
  provider?: string
  metadata?: {
    ip?: string
    userAgent?: string
    location?: string
  }
}

export interface OAuthProfile {
  id: string,
  email: string
  name?: string
  picture?: string
  provider: string
  raw?: Record<string, unknown>
}

export interface LoginDto {
  email: string,
  password: string
}

export interface RegisterDto {
  email: string,
  password: string
  name?: string
}

export interface RefreshTokenDto {
  refreshToken: string
}

export interface ChangePasswordDto {
  currentPassword: string,
  newPassword: string
}

export interface ResetPasswordDto {
  token: string,
  newPassword: string
}

export interface AuthResponse {
  user: {,
    id: string
    email: string
    name?: string
    roles: string[]
  }
  tokens: AuthTokens
}
