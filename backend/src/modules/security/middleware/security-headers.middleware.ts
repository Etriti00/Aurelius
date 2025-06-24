import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  constructor(private configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const isDevelopment = this.configService.get('NODE_ENV') === 'development';
    const domain = this.configService.get('DOMAIN') || 'aurelius.ai';

    // Remove server information
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');

    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('X-Download-Options', 'noopen');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

    // Content Security Policy
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "media-src 'self' blob:",
      "connect-src 'self' https://api.elevenlabs.io https://api.openai.com wss:",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      'upgrade-insecure-requests',
    ];

    if (isDevelopment) {
      // Relax CSP for development
      cspDirectives[1] = "script-src 'self' 'unsafe-inline' 'unsafe-eval' *";
      cspDirectives[4] = "connect-src 'self' *";
    }

    res.setHeader('Content-Security-Policy', cspDirectives.join('; '));

    // HSTS (only in production)
    if (!isDevelopment) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    // Feature Policy / Permissions Policy
    const permissionsPolicy = [
      'camera=()',
      'microphone=(self)',
      'geolocation=()',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'accelerometer=()',
      'gyroscope=()',
      'fullscreen=(self)',
      'picture-in-picture=()',
    ].join(', ');

    res.setHeader('Permissions-Policy', permissionsPolicy);

    // CORS headers (if not handled by CORS middleware)
    if (req.headers.origin) {
      const allowedOrigins = [
        `https://${domain}`,
        `https://www.${domain}`,
        'http://localhost:3000',
        'http://localhost:3001',
      ];

      if (allowedOrigins.includes(req.headers.origin) || isDevelopment) {
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        res.setHeader(
          'Access-Control-Allow-Headers',
          'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key, X-Request-ID'
        );
      }
    }

    next();
  }
}
