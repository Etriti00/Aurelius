import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuditLogService, AuditAction } from '../services/audit-log.service';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

@Injectable()
export class AuditLogMiddleware implements NestMiddleware {
  constructor(private auditLogService: AuditLogService) {}

  use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    const auditLogService = this.auditLogService;

    // Add request ID to headers
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-ID', requestId);

    // Store original json function
    const originalJson = res.json;

    let responseBody: Record<string, unknown> | string | undefined;
    let responseSent = false;

    // Capture response body
    res.json = function (body: Record<string, unknown>) {
      responseBody = body;
      return originalJson.call(this, body);
    };

    // Track when response ends using the 'finish' event instead of overriding end method
    res.on('finish', () => {
      if (!responseSent) {
        responseSent = true;
        const duration = Date.now() - startTime;

        // Log the request asynchronously
        setImmediate(() => {
          try {
            auditLogService.logApiRequest({
              userId: req.user ? req.user.id : undefined,
              method: req.method,
              path: req.path,
              statusCode: res.statusCode,
              duration,
              ipAddress: getClientIP(req),
              userAgent: req.get('user-agent'),
              requestId,
              requestBody: sanitizeBody(req.body),
              responseBody: sanitizeBody(responseBody),
              success: res.statusCode < 400,
            });
          } catch (error) {
            // Don't let audit logging errors break the response
            console.error('Audit logging error:', error);
          }
        });
      }
    });

    next();
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

function getClientIP(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    (req.headers['x-real-ip'] as string) ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

function sanitizeBody(body: unknown): Record<string, unknown> | string | undefined {
  if (!body) return undefined;

  // Remove sensitive fields
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'credentials'];

  if (typeof body === 'object' && body !== null) {
    const sanitized = { ...(body as Record<string, unknown>) };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  if (typeof body === 'string') {
    return body;
  }

  return String(body);
}

// Extend AuditLogService to handle API requests
declare module '../services/audit-log.service' {
  interface AuditLogService {
    logApiRequest(data: {
      userId?: string;
      method: string;
      path: string;
      statusCode: number;
      duration: number;
      ipAddress: string;
      userAgent?: string;
      requestId: string;
      requestBody?: Record<string, unknown> | string;
      responseBody?: Record<string, unknown> | string;
      success: boolean;
    }): Promise<void>;
  }
}

// Implementation for the extended method
AuditLogService.prototype.logApiRequest = async function (data) {
  const action =
    data.method === 'GET'
      ? AuditAction.DATA_READ
      : data.method === 'POST'
        ? AuditAction.DATA_CREATE
        : data.method === 'PUT' || data.method === 'PATCH'
          ? AuditAction.DATA_UPDATE
          : data.method === 'DELETE'
            ? AuditAction.DATA_DELETE
            : AuditAction.API_ACCESS;

  await this.log({
    userId: data.userId,
    action,
    resource: data.path,
    details: {
      method: data.method,
      statusCode: data.statusCode,
      duration: data.duration,
      requestBody: data.requestBody || '',
      responseBody: data.responseBody || '',
    },
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    success: data.success,
  });
};
