import { HttpException, HttpStatus } from '@nestjs/common';

export class AppException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    code?: string
  ) {
    super(
      {
        message,
        statusCode,
        error: code || 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
      },
      statusCode
    );
  }
}

export class ValidationException extends AppException {
  constructor(message: string, errors?: Record<string, string[]>) {
    super(
      message,
      HttpStatus.BAD_REQUEST,
      'VALIDATION_ERROR'
    );
    if (errors) {
      (this.getResponse() as Record<string, unknown>).errors = errors;
    }
  }
}

export class UnauthorizedException extends AppException {
  constructor(message: string = 'Unauthorized access') {
    super(message, HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED');
  }
}

export class ForbiddenException extends AppException {
  constructor(message: string = 'Access forbidden') {
    super(message, HttpStatus.FORBIDDEN, 'FORBIDDEN');
  }
}

export class NotFoundException extends AppException {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, HttpStatus.NOT_FOUND, 'NOT_FOUND');
  }
}

export class ConflictException extends AppException {
  constructor(message: string = 'Resource already exists') {
    super(message, HttpStatus.CONFLICT, 'CONFLICT');
  }
}

export class RateLimitException extends AppException {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, HttpStatus.TOO_MANY_REQUESTS, 'RATE_LIMIT_EXCEEDED');
  }
}

export class AIServiceException extends AppException {
  constructor(message: string = 'AI service error', details?: string) {
    super(message, HttpStatus.SERVICE_UNAVAILABLE, 'AI_SERVICE_ERROR');
    if (details) {
      (this.getResponse() as Record<string, unknown>).details = details;
    }
  }
}

export class IntegrationException extends AppException {
  constructor(provider: string, message: string = 'Integration error') {
    super(
      `${provider} integration error: ${message}`,
      HttpStatus.BAD_GATEWAY,
      'INTEGRATION_ERROR'
    );
    (this.getResponse() as Record<string, unknown>).provider = provider;
  }
}