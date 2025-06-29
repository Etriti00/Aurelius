import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import { Request } from 'express';

interface RequestWithCorrelation extends Request {
  correlationId?: string;
  user?: { id?: string; sub?: string };
}

export interface LogContext {
  correlationId?: string;
  userId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  responseTime?: number;
  error?: Error;
  additionalData?: Record<string, unknown>;
}

export interface StructuredLog {
  timestamp: string;
  level: string;
  message: string;
  service: string;
  version: string;
  environment: string;
  correlationId?: string;
  userId?: string;
  sessionId?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  responseTime?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, unknown>;
}

@Injectable()
export class LoggingService {
  private readonly logger: winston.Logger;
  private readonly serviceName: string;
  private readonly serviceVersion: string;
  private readonly environment: string;

  constructor(private readonly configService: ConfigService) {
    this.serviceName = this.configService.get<string>('app.name') || 'aurelius-backend';
    this.serviceVersion = this.configService.get<string>('app.version') || '1.0.0';
    this.environment = this.configService.get<string>('NODE_ENV') || 'development';

    this.logger = winston.createLogger({
      level: this.configService.get<string>('logging.level') || 'info',
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss.SSS',
        }),
        winston.format.errors({ stack: true }),
        winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
        this.environment === 'production'
          ? winston.format.json()
          : winston.format.combine(winston.format.colorize(), winston.format.simple())
      ),
      defaultMeta: {
        service: this.serviceName,
        version: this.serviceVersion,
        environment: this.environment,
      },
      transports: this.createTransports(),
      exitOnError: false,
    });

    // Handle uncaught exceptions and rejections
    this.logger.exceptions.handle(
      new winston.transports.File({
        filename: 'logs/exceptions.log',
        handleExceptions: true,
      })
    );

    this.logger.rejections.handle(
      new winston.transports.File({
        filename: 'logs/rejections.log',
        handleRejections: true,
      })
    );
  }

  /**
   * Log info level message with context
   */
  info(message: string, context?: LogContext): void {
    const structuredLog = this.createStructuredLog('info', message, context);
    this.logger.info(message, { ...structuredLog });
  }

  /**
   * Log warn level message with context
   */
  warn(message: string, context?: LogContext): void {
    const structuredLog = this.createStructuredLog('warn', message, context);
    this.logger.warn(message, { ...structuredLog });
  }

  /**
   * Log error level message with context
   */
  error(message: string, error?: Error, context?: LogContext): void {
    const structuredLog = this.createStructuredLog('error', message, { ...context, error });
    this.logger.error(message, { ...structuredLog });
  }

  /**
   * Log debug level message with context
   */
  debug(message: string, context?: LogContext): void {
    const structuredLog = this.createStructuredLog('debug', message, context);
    this.logger.debug(message, { ...structuredLog });
  }

  /**
   * Log HTTP request/response
   */
  logHttpRequest(request: Request, responseTime: number, statusCode: number): void {
    const context: LogContext = {
      correlationId: this.getCorrelationId(request),
      userId: this.getUserId(request),
      ip: this.getClientIP(request),
      userAgent: request.get('User-Agent'),
      method: request.method,
      url: request.url,
      statusCode,
      responseTime,
    };

    const level = statusCode >= 400 ? 'warn' : 'info';
    const message = `${request.method} ${request.url} ${statusCode} - ${responseTime}ms`;

    if (level === 'warn') {
      this.warn(message, context);
    } else {
      this.info(message, context);
    }
  }

  /**
   * Log application performance metrics
   */
  logPerformanceMetric(metric: string, value: number, unit: string, context?: LogContext): void {
    const performanceContext: LogContext = {
      ...context,
      additionalData: {
        metric,
        value,
        unit,
        timestamp: new Date().toISOString(),
      },
    };

    this.info(`Performance metric: ${metric} = ${value}${unit}`, performanceContext);
  }

  /**
   * Log security events
   */
  logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    context?: LogContext
  ): void {
    const securityContext: LogContext = {
      ...context,
      additionalData: {
        securityEvent: event,
        severity,
        timestamp: new Date().toISOString(),
      },
    };

    const message = `Security event: ${event} (${severity})`;

    if (severity === 'critical' || severity === 'high') {
      this.error(message, undefined, securityContext);
    } else if (severity === 'medium') {
      this.warn(message, securityContext);
    } else {
      this.info(message, securityContext);
    }
  }

  /**
   * Log business events
   */
  logBusinessEvent(event: string, data: Record<string, unknown>, context?: LogContext): void {
    const businessContext: LogContext = {
      ...context,
      additionalData: {
        businessEvent: event,
        eventData: data,
        timestamp: new Date().toISOString(),
      },
    };

    this.info(`Business event: ${event}`, businessContext);
  }

  /**
   * Log API usage for billing/analytics
   */
  logApiUsage(operation: string, cost: number, userId: string, context?: LogContext): void {
    const usageContext: LogContext = {
      ...context,
      userId,
      additionalData: {
        apiOperation: operation,
        cost,
        currency: 'USD',
        timestamp: new Date().toISOString(),
      },
    };

    this.info(`API usage: ${operation} - $${cost.toFixed(4)}`, usageContext);
  }

  /**
   * Create structured log object
   */
  private createStructuredLog(level: string, message: string, context?: LogContext): StructuredLog {
    const structuredLog: StructuredLog = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.serviceName,
      version: this.serviceVersion,
      environment: this.environment,
    };

    if (context) {
      if (context.correlationId) structuredLog.correlationId = context.correlationId;
      if (context.userId) structuredLog.userId = context.userId;
      if (context.sessionId) structuredLog.sessionId = context.sessionId;
      if (context.method) structuredLog.method = context.method;
      if (context.url) structuredLog.url = context.url;
      if (context.statusCode) structuredLog.statusCode = context.statusCode;
      if (context.responseTime) structuredLog.responseTime = context.responseTime;

      if (context.error) {
        structuredLog.error = {
          name: context.error.name,
          message: context.error.message,
          stack: this.environment === 'development' ? context.error.stack : undefined,
        };
      }

      if (context.additionalData) {
        structuredLog.metadata = context.additionalData;
      }
    }

    return structuredLog;
  }

  /**
   * Create Winston transports based on environment
   */
  private createTransports(): winston.transport[] {
    const transports: winston.transport[] = [];

    // Console transport (always enabled)
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          this.environment === 'production'
            ? winston.format.json()
            : winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
                  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
                  return `${timestamp} [${service}] ${level}: ${message}${metaStr}`;
                })
              )
        ),
      })
    );

    // File transports (production only)
    if (this.environment === 'production') {
      // General application logs
      transports.push(
        new winston.transports.File({
          filename: 'logs/application.log',
          maxsize: 10485760, // 10MB
          maxFiles: 5,
          format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
        })
      );

      // Error logs
      transports.push(
        new winston.transports.File({
          filename: 'logs/errors.log',
          level: 'error',
          maxsize: 10485760, // 10MB
          maxFiles: 10,
          format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
        })
      );

      // HTTP access logs
      transports.push(
        new winston.transports.File({
          filename: 'logs/access.log',
          maxsize: 20971520, // 20MB
          maxFiles: 10,
          format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
        })
      );

      // Security events logs
      transports.push(
        new winston.transports.File({
          filename: 'logs/security.log',
          maxsize: 10485760, // 10MB
          maxFiles: 20, // Keep longer history for security events
          format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
        })
      );
    }

    return transports;
  }

  /**
   * Extract correlation ID from request
   */
  private getCorrelationId(request: Request): string | undefined {
    return (
      (request.headers['x-correlation-id'] as string) ||
      (request.headers['x-request-id'] as string) ||
      (request as RequestWithCorrelation).correlationId
    );
  }

  /**
   * Extract user ID from request
   */
  private getUserId(request: Request): string | undefined {
    const userReq = request as RequestWithCorrelation;
    return userReq.user?.id || userReq.user?.sub;
  }

  /**
   * Extract client IP from request
   */
  private getClientIP(request: Request): string {
    return (
      request.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
      request.get('X-Real-IP') ||
      request.connection.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Get Winston logger instance for direct access
   */
  getWinstonLogger(): winston.Logger {
    return this.logger;
  }

  /**
   * Flush logs (useful for shutdown)
   */
  async flush(): Promise<void> {
    return new Promise(resolve => {
      this.logger.on('finish', resolve);
      this.logger.end();
    });
  }

  /**
   * Create child logger with additional context
   */
  createChildLogger(defaultContext: LogContext): {
    info: (message: string, context?: LogContext) => void;
    warn: (message: string, context?: LogContext) => void;
    error: (message: string, error?: Error, context?: LogContext) => void;
    debug: (message: string, context?: LogContext) => void;
  } {
    return {
      info: (message: string, context?: LogContext) =>
        this.info(message, { ...defaultContext, ...context }),
      warn: (message: string, context?: LogContext) =>
        this.warn(message, { ...defaultContext, ...context }),
      error: (message: string, error?: Error, context?: LogContext) =>
        this.error(message, error, { ...defaultContext, ...context }),
      debug: (message: string, context?: LogContext) =>
        this.debug(message, { ...defaultContext, ...context }),
    };
  }
}
