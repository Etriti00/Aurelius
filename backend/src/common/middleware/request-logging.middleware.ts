import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface RequestWithUser extends Request {
  user?: { id?: string; sub?: string };
}
import { LoggingService } from '../services/logging.service';
import { v4 as uuidv4 } from 'uuid';

interface ExtendedRequest extends Request {
  correlationId?: string;
  startTime?: number;
}

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  constructor(private readonly loggingService: LoggingService) {}

  use(req: ExtendedRequest, res: Response, next: NextFunction): void {
    const startTime = Date.now();

    // Generate correlation ID if not provided
    const correlationId =
      (req.headers['x-correlation-id'] as string) ||
      (req.headers['x-request-id'] as string) ||
      uuidv4();

    // Attach correlation ID and start time to request
    req.correlationId = correlationId;
    req.startTime = startTime;

    // Set correlation ID in response headers
    res.setHeader('X-Correlation-ID', correlationId);

    // Log incoming request
    this.logIncomingRequest(req);

    // Override response.end to log response
    const originalEnd = res.end;
    const loggingService = this.loggingService;

    // Override res.end with proper typing that matches Express's overloads
    function endOverride(this: Response): Response;
    function endOverride(this: Response, cb: () => void): Response;
    function endOverride(this: Response, chunk: unknown, cb?: () => void): Response;
    function endOverride(
      this: Response,
      chunk: unknown,
      encoding: BufferEncoding,
      cb?: () => void
    ): Response;
    function endOverride(this: Response, ...args: unknown[]): Response {
      const responseTime = Date.now() - startTime;

      // Log HTTP request/response
      loggingService.logHttpRequest(req, responseTime, res.statusCode);

      // Call original end method with the same arguments
      // We need to cast here because TypeScript can't verify the argument patterns match
      return originalEnd.apply(this, args as Parameters<typeof originalEnd>);
    }

    // Assign the overloaded function to res.end
    res.end = endOverride;

    next();
  }

  /**
   * Log incoming request details
   */
  private logIncomingRequest(req: ExtendedRequest): void {
    const shouldSkipLogging = this.shouldSkipRequestLogging(req);

    if (shouldSkipLogging) {
      return;
    }

    const context = {
      correlationId: req.correlationId,
      method: req.method,
      url: req.url,
      ip: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      userId: this.getUserId(req),
      additionalData: {
        requestSize: this.getRequestSize(req),
        contentType: req.get('Content-Type'),
        acceptEncoding: req.get('Accept-Encoding'),
        origin: req.get('Origin'),
        referer: req.get('Referer'),
      },
    };

    this.loggingService.debug(`Incoming request: ${req.method} ${req.url}`, context);
  }

  /**
   * Log outgoing response details
   */
  logOutgoingResponse(req: ExtendedRequest, res: Response, responseTime: number): void {
    const shouldSkipLogging = this.shouldSkipRequestLogging(req);

    if (shouldSkipLogging) {
      return;
    }

    const context = {
      correlationId: req.correlationId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime,
      userId: this.getUserId(req),
      additionalData: {
        responseSize: this.getResponseSize(res),
        contentType: res.get('Content-Type'),
        cacheControl: res.get('Cache-Control'),
      },
    };

    const message = `Response: ${req.method} ${req.url} ${res.statusCode} - ${responseTime}ms`;

    if (res.statusCode >= 500) {
      this.loggingService.error(message, undefined, context);
    } else if (res.statusCode >= 400) {
      this.loggingService.warn(message, context);
    } else {
      this.loggingService.debug(message, context);
    }

    // Log slow requests
    if (responseTime > 1000) {
      this.loggingService.logPerformanceMetric('slow_request', responseTime, 'ms', context);
    }

    // Log security events for specific status codes
    if (res.statusCode === 401) {
      this.loggingService.logSecurityEvent('unauthorized_access_attempt', 'medium', context);
    } else if (res.statusCode === 403) {
      this.loggingService.logSecurityEvent('forbidden_access_attempt', 'medium', context);
    } else if (res.statusCode === 429) {
      this.loggingService.logSecurityEvent('rate_limit_exceeded', 'medium', context);
    }
  }

  /**
   * Determine if request logging should be skipped
   */
  private shouldSkipRequestLogging(req: Request): boolean {
    const skipPaths = ['/health', '/metrics', '/favicon.ico', '/robots.txt'];

    const skipPatterns = [
      /^\/api\/v\d+\/health/,
      /^\/api\/docs/,
      /\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/,
    ];

    // Skip health checks and static assets
    if (skipPaths.includes(req.path)) {
      return true;
    }

    // Skip based on patterns
    if (skipPatterns.some(pattern => pattern.test(req.path))) {
      return true;
    }

    // Skip OPTIONS requests (CORS preflight)
    if (req.method === 'OPTIONS') {
      return true;
    }

    return false;
  }

  /**
   * Extract client IP from request
   */
  private getClientIP(req: Request): string {
    return (
      req.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
      req.get('X-Real-IP') ||
      req.connection.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Extract user ID from request
   */
  private getUserId(req: Request): string | undefined {
    const userReq = req as RequestWithUser;
    return userReq.user?.id || userReq.user?.sub;
  }

  /**
   * Get request content length
   */
  private getRequestSize(req: Request): string | undefined {
    const contentLength = req.get('Content-Length');
    return contentLength ? `${contentLength} bytes` : undefined;
  }

  /**
   * Get response content length
   */
  private getResponseSize(res: Response): string | undefined {
    const contentLength = res.get('Content-Length');
    return contentLength ? `${contentLength} bytes` : undefined;
  }
}
