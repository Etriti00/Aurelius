import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

interface CsrfRequest extends Request {
  session?: {
    id: string;
    csrfToken?: string;
  };
  csrfToken?: () => string;
}

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private readonly tokenStore = new Map<string, { token: string; expires: Date }>();
  private readonly tokenLength: number;
  private readonly tokenExpiry: number;
  private readonly skipPaths: string[];

  constructor(configService: ConfigService) {
    // Get configuration values
    this.tokenLength = configService.get<number>('security.csrf.tokenLength') || 32;
    this.tokenExpiry =
      configService.get<number>('security.csrf.tokenExpiry') || 24 * 60 * 60 * 1000;

    // Paths that don't require CSRF protection
    this.skipPaths = configService.get<string[]>('security.csrf.skipPaths') || [
      '/api/v1/auth/login',
      '/api/v1/auth/register',
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

    // Skip CSRF for read-only methods
    if (this.isReadMethod(req.method)) {
      // Generate and attach token for GET requests
      const token = this.generateToken(req);
      req.csrfToken = () => token;

      // Set token in response header for client to read
      res.setHeader('X-CSRF-Token', token);

      return next();
    }

    // For state-changing requests, validate CSRF token
    const token = this.extractToken(req);

    if (!token) {
      throw new HttpException('CSRF token missing', HttpStatus.FORBIDDEN);
    }

    if (!this.validateToken(req, token)) {
      throw new HttpException('Invalid CSRF token', HttpStatus.FORBIDDEN);
    }

    // Clean up expired tokens periodically
    this.cleanupExpiredTokens();

    next();
  }

  private shouldSkipCsrf(req: Request): boolean {
    const path = req.path;
    return this.skipPaths.some(skipPath => path.startsWith(skipPath));
  }

  private generateToken(req: CsrfRequest): string {
    const sessionId = this.getSessionId(req);
    const token = crypto.randomBytes(this.tokenLength).toString('hex');
    const expires = new Date(Date.now() + this.tokenExpiry);

    // Store token with expiry
    this.tokenStore.set(`${sessionId}:${token}`, { token, expires });

    // Also store by session for validation
    this.tokenStore.set(`session:${sessionId}`, { token, expires });

    return token;
  }

  private validateToken(req: CsrfRequest, token: string): boolean {
    const sessionId = this.getSessionId(req);

    // Check if token exists and is not expired
    const storedData = this.tokenStore.get(`${sessionId}:${token}`);
    if (!storedData) {
      return false;
    }

    if (storedData.expires < new Date()) {
      this.tokenStore.delete(`${sessionId}:${token}`);
      return false;
    }

    // Additional check: verify session has this token
    const sessionData = this.tokenStore.get(`session:${sessionId}`);
    if (!sessionData || sessionData.token !== token) {
      return false;
    }

    return true;
  }

  private extractToken(req: Request): string | null {
    // Check header first (for AJAX requests)
    const headerToken = req.headers['x-csrf-token'] as string;
    if (headerToken) {
      return headerToken;
    }

    // Check body (for form submissions)
    if (req.body?._csrf) {
      return req.body._csrf;
    }

    // Check query (as last resort)
    if (req.query._csrf) {
      return req.query._csrf as string;
    }

    return null;
  }

  private getSessionId(req: CsrfRequest): string {
    // Try to get session ID from various sources
    if (req.session?.id) {
      return req.session.id;
    }

    // Fallback to user ID if authenticated
    const user = (req as any).user;
    if (user?.id) {
      return `user:${user.id}`;
    }

    // Generate a temporary ID based on IP and user agent
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    return crypto.createHash('sha256').update(`${ip}:${userAgent}`).digest('hex').substring(0, 16);
  }

  private isReadMethod(method: string): boolean {
    return ['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
  }

  private cleanupExpiredTokens(): void {
    const now = new Date();
    for (const [key, data] of this.tokenStore.entries()) {
      if (data.expires < now) {
        this.tokenStore.delete(key);
      }
    }
  }
}
