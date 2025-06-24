// Authentication and authorization type definitions
// Professional implementation without shortcuts

// No direct Prisma imports to avoid circular dependencies

export interface JwtPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  profilePicture?: string;
}

export interface OAuthProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
  provider: OAuthProvider;
}

export enum OAuthProvider {
  GOOGLE = 'GOOGLE',
  MICROSOFT = 'MICROSOFT',
  APPLE = 'APPLE',
  SLACK = 'SLACK',
}

export interface RequestUser {
  id: string;
  email: string;
  role: string;
  subscriptionTier: string;
  organizationId?: string;
}

export interface AuthSession {
  user: RequestUser;
  tokens: AuthTokens;
  sessionId: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmation {
  token: string;
  newPassword: string;
}

export interface TwoFactorAuthData {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface AuthorizationContext {
  user: RequestUser;
  resource: string;
  action: string;
  context?: Record<string, unknown>;
}
