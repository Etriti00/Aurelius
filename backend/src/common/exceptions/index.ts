// Base application exceptions
export {
  AppException,
  ValidationException as AppValidationException,
  UnauthorizedException as AppUnauthorizedException,
  ForbiddenException as AppForbiddenException,
  NotFoundException as AppNotFoundException,
  ConflictException as AppConflictException,
  RateLimitException as AppRateLimitException,
  AIServiceException,
  IntegrationException as AppIntegrationException,
} from './app.exception';

// Business logic exceptions
export {
  BusinessException,
  ValidationException as BusinessValidationException,
  UnauthorizedException as BusinessUnauthorizedException,
  ForbiddenException as BusinessForbiddenException,
  NotFoundException as BusinessNotFoundException,
  ConflictException as BusinessConflictException,
  RateLimitException as BusinessRateLimitException,
  PaymentRequiredException,
  QuotaExceededException,
  IntegrationException as BusinessIntegrationException,
  AIException,
} from './business.exception';

export * from './error-codes.enum';
