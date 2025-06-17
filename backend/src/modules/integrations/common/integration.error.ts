export class IntegrationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
    public readonly provider?: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'IntegrationError'
  }
}

export class AuthenticationError extends IntegrationError {
  constructor(message: string, provider?: string, context?: Record<string, unknown>) {
    super(message, 'AUTH_FAILED', 401, provider, context)
    this.name = 'AuthenticationError'
  }
}

export class RateLimitError extends IntegrationError {
  constructor(
    message: string,
    public readonly retryAfter: number,
    provider?: string,
    context?: Record<string, unknown>,
  ) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429, provider, context)
    this.name = 'RateLimitError'
  }
}

export class SyncError extends IntegrationError {
  constructor(message: string, provider?: string, context?: Record<string, unknown>) {
    super(message, 'SYNC_FAILED', 500, provider, context)
    this.name = 'SyncError'
  }
}

export class WebhookError extends IntegrationError {
  constructor(message: string, provider?: string, context?: Record<string, unknown>) {
    super(message, 'WEBHOOK_FAILED', 400, provider, context)
    this.name = 'WebhookError'
  }
}

export class ConfigurationError extends IntegrationError {
  constructor(message: string, provider?: string, context?: Record<string, unknown>) {
    super(message, 'CONFIG_ERROR', 500, provider, context)
    this.name = 'ConfigurationError'
  }
}