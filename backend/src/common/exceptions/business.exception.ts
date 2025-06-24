import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessException extends HttpException {
  constructor(
    message: string,
    code: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: any
  ) {
    super(
      {
        statusCode,
        message,
        code,
        details,
        timestamp: new Date().toISOString(),
      },
      statusCode
    );
  }
}

export class ValidationException extends BusinessException {
  constructor(message: string, details: any) {
    super(message, 'VALIDATION_ERROR', HttpStatus.BAD_REQUEST, details);
  }
}

export class UnauthorizedException extends BusinessException {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', HttpStatus.UNAUTHORIZED);
  }
}

export class ForbiddenException extends BusinessException {
  constructor(message: string = 'Forbidden') {
    super(message, 'FORBIDDEN', HttpStatus.FORBIDDEN);
  }
}

export class NotFoundException extends BusinessException {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id ${id} not found` : `${resource} not found`;
    super(message, 'NOT_FOUND', HttpStatus.NOT_FOUND);
  }
}

export class ConflictException extends BusinessException {
  constructor(message: string, details?: any) {
    super(message, 'CONFLICT', HttpStatus.CONFLICT, details);
  }
}

export class RateLimitException extends BusinessException {
  constructor(retryAfter?: number) {
    super('Too many requests', 'RATE_LIMIT_EXCEEDED', HttpStatus.TOO_MANY_REQUESTS, { retryAfter });
  }
}

export class PaymentRequiredException extends BusinessException {
  constructor(message: string = 'Payment required') {
    super(message, 'PAYMENT_REQUIRED', HttpStatus.PAYMENT_REQUIRED);
  }
}

export class QuotaExceededException extends BusinessException {
  constructor(resource: string, limit: number, current: number) {
    super(`${resource} quota exceeded`, 'QUOTA_EXCEEDED', HttpStatus.PAYMENT_REQUIRED, {
      resource,
      limit,
      current,
    });
  }
}

export class IntegrationException extends BusinessException {
  constructor(provider: string, message: string, details?: any) {
    super(
      `${provider} integration error: ${message}`,
      'INTEGRATION_ERROR',
      HttpStatus.BAD_GATEWAY,
      details
    );
  }
}

export class AIException extends BusinessException {
  constructor(message: string, model?: string, details?: any) {
    super(message, 'AI_ERROR', HttpStatus.SERVICE_UNAVAILABLE, { model, ...details });
  }
}
