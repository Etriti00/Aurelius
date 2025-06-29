import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface RequestWithUser extends Request {
  user?: { id: string };
}
import {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} from '@prisma/client/runtime/library';

interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string;
  error: string;
  correlationId: string;
  details?: unknown;
  stack?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const correlationId = this.generateCorrelationId();

    // Determine the error type and create appropriate response
    const errorResponse = this.createErrorResponse(exception, request, correlationId);

    // Log the error with appropriate level
    this.logError(exception, request, correlationId, errorResponse);

    // Set security headers
    this.setSecurityHeaders(response);

    // Send response
    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private createErrorResponse(
    exception: unknown,
    request: Request,
    correlationId: string
  ): ErrorResponse {
    const timestamp = new Date().toISOString();
    const path = request.url;
    const method = request.method;

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';
    let details: unknown = undefined;
    let stack: string | undefined = undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === 'string') {
        message = response;
        error = exception.name;
      } else if (typeof response === 'object' && response !== null) {
        const responseObj = response as Record<string, unknown>;
        message =
          (typeof responseObj.message === 'string' ? responseObj.message : null) ||
          exception.message;
        error =
          (typeof responseObj.error === 'string' ? responseObj.error : null) || exception.name;
        details = responseObj.details;
      }

      if (process.env.NODE_ENV === 'development') {
        stack = exception.stack;
      }
    } else if (exception instanceof PrismaClientKnownRequestError) {
      statusCode = this.mapPrismaErrorToHttpStatus(exception.code);
      message = this.mapPrismaErrorToMessage(exception);
      error = 'Database Error';
      details = {
        code: exception.code,
        meta: exception.meta,
      };
    } else if (exception instanceof PrismaClientValidationError) {
      statusCode = HttpStatus.BAD_REQUEST;
      message = 'Invalid data provided';
      error = 'Validation Error';
      details = {
        validation: exception.message,
      };
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;

      if (process.env.NODE_ENV === 'development') {
        stack = exception.stack;
      }

      // Check for specific error patterns
      if (exception.message.includes('ECONNREFUSED')) {
        statusCode = HttpStatus.SERVICE_UNAVAILABLE;
        message = 'External service unavailable';
        error = 'Service Unavailable';
      } else if (exception.message.includes('timeout')) {
        statusCode = HttpStatus.REQUEST_TIMEOUT;
        message = 'Request timeout';
        error = 'Timeout Error';
      } else if (exception.message.includes('rate limit')) {
        statusCode = HttpStatus.TOO_MANY_REQUESTS;
        message = 'Rate limit exceeded';
        error = 'Rate Limit Error';
      }
    }

    return {
      statusCode,
      timestamp,
      path,
      method,
      message,
      error,
      correlationId,
      details,
      stack,
    };
  }

  private logError(
    exception: unknown,
    request: Request,
    correlationId: string,
    errorResponse: ErrorResponse
  ): void {
    const logContext = {
      correlationId,
      method: request.method,
      url: request.url,
      userAgent: request.get('User-Agent'),
      ip: this.getClientIP(request),
      userId: (request as RequestWithUser).user?.id,
      statusCode: errorResponse.statusCode,
    };

    if (errorResponse.statusCode >= 500) {
      // Server errors - log as error with full stack
      this.logger.error(
        `${errorResponse.error}: ${errorResponse.message}`,
        exception instanceof Error ? exception.stack : JSON.stringify(exception),
        logContext
      );
    } else if (errorResponse.statusCode >= 400) {
      // Client errors - log as warning
      this.logger.warn(`${errorResponse.error}: ${errorResponse.message}`, logContext);
    } else {
      // Other errors - log as info
      this.logger.log(`${errorResponse.error}: ${errorResponse.message}`, logContext);
    }
  }

  private mapPrismaErrorToHttpStatus(code: string): number {
    switch (code) {
      case 'P2002': // Unique constraint failed
        return HttpStatus.CONFLICT;
      case 'P2003': // Foreign key constraint failed
        return HttpStatus.BAD_REQUEST;
      case 'P2004': // Constraint failed
        return HttpStatus.BAD_REQUEST;
      case 'P2025': // Record not found
        return HttpStatus.NOT_FOUND;
      case 'P2026': // Query timeout
        return HttpStatus.REQUEST_TIMEOUT;
      default:
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }

  private mapPrismaErrorToMessage(error: PrismaClientKnownRequestError): string {
    switch (error.code) {
      case 'P2002':
        return `Duplicate entry: ${error.meta?.target || 'unique constraint violated'}`;
      case 'P2003':
        return 'Referenced record does not exist';
      case 'P2004':
        return 'Database constraint violation';
      case 'P2025':
        return 'Record not found';
      case 'P2026':
        return 'Database query timeout';
      default:
        return error.message || 'Database operation failed';
    }
  }

  private setSecurityHeaders(response: Response): void {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('X-XSS-Protection', '1; mode=block');
    response.removeHeader('X-Powered-By');
  }

  private getClientIP(request: Request): string {
    return (
      request.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
      request.get('X-Real-IP') ||
      request.connection.remoteAddress ||
      'unknown'
    );
  }

  private generateCorrelationId(): string {
    return `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
