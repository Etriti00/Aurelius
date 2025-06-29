import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  SetMetadata,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { EnhancedApiKeyService } from '../services/api-key.service';

// Metadata keys for decorator configuration
export const API_KEY_SCOPES_KEY = 'api_key_scopes';
export const API_KEY_PERMISSIONS_KEY = 'api_key_permissions';
export const API_KEY_RATE_LIMIT_KEY = 'api_key_rate_limit';

// Decorators for API key requirements
export const RequireApiKeyScopes = (...scopes: string[]) => SetMetadata(API_KEY_SCOPES_KEY, scopes);

export const RequireApiKeyPermissions = (permissions: Record<string, unknown>) =>
  SetMetadata(API_KEY_PERMISSIONS_KEY, permissions);

export const RequireApiKeyRateLimit = (limit: number, windowSeconds: number) =>
  SetMetadata(API_KEY_RATE_LIMIT_KEY, { limit, windowSeconds });

interface RequestWithApiKey extends Request {
  apiKey?: {
    id: string;
    userId: string;
    user: {
      id: string;
      email: string;
      roles: string[];
    };
    scopes: string[];
    permissions: Record<string, unknown>;
  };
  rateLimit?: {
    limit: number;
    remaining: number;
    resetTime: Date;
  };
}

@Injectable()
export class EnhancedApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(EnhancedApiKeyGuard.name);

  constructor(
    private readonly apiKeyService: EnhancedApiKeyService,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithApiKey>();
    const response = context.switchToHttp().getResponse<Response>();

    try {
      // Extract API key from request
      const apiKey = this.extractApiKey(request);

      if (!apiKey) {
        this.setErrorHeaders(response, 'API key missing');
        throw new UnauthorizedException('API key is required');
      }

      // Prepare request info for validation
      const requestInfo = {
        method: request.method,
        endpoint: request.path,
        ipAddress: this.getClientIP(request),
        userAgent: request.get('User-Agent'),
        headers: this.getRequestHeaders(request),
      };

      // Validate API key
      const validationResult = await this.apiKeyService.validateApiKey(apiKey, requestInfo);

      if (!validationResult.isValid) {
        this.setErrorHeaders(response, validationResult.error || 'Invalid API key');

        if (validationResult.blocked) {
          this.logger.warn(`API key blocked: ${validationResult.blockReason}`, {
            apiKey: apiKey.substring(0, 12) + '***',
            reason: validationResult.blockReason,
            ip: requestInfo.ipAddress,
            endpoint: requestInfo.endpoint,
          });
        }

        throw new UnauthorizedException(validationResult.error || 'Invalid API key');
      }

      // Check required scopes
      const requiredScopes = this.reflector.get<string[]>(API_KEY_SCOPES_KEY, context.getHandler());
      if (requiredScopes && requiredScopes.length > 0) {
        const hasRequiredScopes = requiredScopes.every(
          scope => validationResult.apiKey?.scopes.includes(scope) || false
        );

        if (!hasRequiredScopes) {
          this.setErrorHeaders(response, 'Insufficient API key scopes');
          throw new UnauthorizedException('API key does not have required scopes');
        }
      }

      // Check required permissions
      const requiredPermissions = this.reflector.get<Record<string, unknown>>(
        API_KEY_PERMISSIONS_KEY,
        context.getHandler()
      );

      if (requiredPermissions) {
        const hasRequiredPermissions = this.checkPermissions(
          validationResult.apiKey?.permissions || {},
          requiredPermissions
        );

        if (!hasRequiredPermissions) {
          this.setErrorHeaders(response, 'Insufficient API key permissions');
          throw new UnauthorizedException('API key does not have required permissions');
        }
      }

      // Attach API key info to request
      if (validationResult.apiKey) {
        request.apiKey = validationResult.apiKey;
      }

      // Set rate limit headers
      if (validationResult.apiKey?.rateLimit) {
        response.set({
          'X-RateLimit-Limit': validationResult.apiKey.rateLimit.toString(),
          'X-RateLimit-Window': (validationResult.apiKey.rateLimitWindow || 3600).toString(),
        });
      }

      // Log successful authentication
      if (validationResult.apiKey) {
        this.logger.debug(`API key authenticated successfully`, {
          apiKeyId: validationResult.apiKey.id,
          userId: validationResult.apiKey.userId,
          endpoint: requestInfo.endpoint,
          scopes: validationResult.apiKey.scopes,
        });
      }

      return true;
    } catch (error) {
      // Set common error headers
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.setErrorHeaders(response, errorMessage);

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error('Error in API key guard:', error);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  private extractApiKey(request: Request): string | null {
    // Check Authorization header (Bearer token)
    const authHeader = request.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check X-API-Key header
    const apiKeyHeader = request.get('X-API-Key');
    if (apiKeyHeader) {
      return apiKeyHeader;
    }

    // Check query parameter (least secure, log warning)
    if (request.query.api_key && typeof request.query.api_key === 'string') {
      this.logger.warn('API key provided in query parameter (insecure)', {
        ip: this.getClientIP(request),
        endpoint: request.path,
      });
      return request.query.api_key;
    }

    return null;
  }

  private getClientIP(request: Request): string {
    return (
      request.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
      request.get('X-Real-IP') ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }

  private getRequestHeaders(request: Request): Record<string, string> {
    const headers: Record<string, string> = {};

    // Only capture relevant headers for security checks
    const relevantHeaders = [
      'user-agent',
      'referer',
      'origin',
      'x-forwarded-for',
      'x-real-ip',
      'content-type',
      'accept',
    ];

    relevantHeaders.forEach(headerName => {
      const value = request.get(headerName);
      if (value) {
        headers[headerName] = value;
      }
    });

    return headers;
  }

  private checkPermissions(
    apiKeyPermissions: Record<string, unknown>,
    requiredPermissions: Record<string, unknown>
  ): boolean {
    // Check if API key has all required permissions
    for (const [key, requiredValue] of Object.entries(requiredPermissions)) {
      const apiKeyValue = apiKeyPermissions[key];

      if (apiKeyValue === undefined) {
        return false; // Missing permission
      }

      // Handle different permission value types
      if (typeof requiredValue === 'boolean') {
        if (apiKeyValue !== requiredValue) {
          return false;
        }
      } else if (typeof requiredValue === 'string') {
        if (apiKeyValue !== requiredValue) {
          return false;
        }
      } else if (Array.isArray(requiredValue)) {
        // Check if API key has at least one of the required values
        if (!Array.isArray(apiKeyValue)) {
          return false;
        }
        const hasAnyRequired = requiredValue.some(value =>
          (apiKeyValue as unknown[]).includes(value)
        );
        if (!hasAnyRequired) {
          return false;
        }
      } else if (typeof requiredValue === 'object' && requiredValue !== null) {
        // Recursive check for nested permissions
        if (typeof apiKeyValue !== 'object' || apiKeyValue === null) {
          return false;
        }
        if (
          !this.checkPermissions(
            apiKeyValue as Record<string, unknown>,
            requiredValue as Record<string, unknown>
          )
        ) {
          return false;
        }
      } else {
        // Direct comparison for other types
        if (apiKeyValue !== requiredValue) {
          return false;
        }
      }
    }

    return true;
  }

  private setErrorHeaders(response: Response, error: string): void {
    response.set({
      'WWW-Authenticate': 'Bearer realm="API", error="invalid_token"',
      'X-API-Error': error,
      'X-API-Error-Code': this.getErrorCode(error),
    });
  }

  private getErrorCode(error: string): string {
    if (error.includes('missing') || error.includes('required')) {
      return 'missing_api_key';
    }
    if (error.includes('invalid')) {
      return 'invalid_api_key';
    }
    if (error.includes('expired')) {
      return 'expired_api_key';
    }
    if (error.includes('revoked')) {
      return 'revoked_api_key';
    }
    if (error.includes('rate limit')) {
      return 'rate_limit_exceeded';
    }
    if (error.includes('scope')) {
      return 'insufficient_scope';
    }
    if (error.includes('permission')) {
      return 'insufficient_permissions';
    }
    if (error.includes('IP')) {
      return 'ip_not_allowed';
    }
    if (error.includes('domain')) {
      return 'domain_not_allowed';
    }
    return 'authentication_failed';
  }
}

// Export current user decorator for API key authentication
export const CurrentApiKey = () => {
  return (target: object, key: string | symbol, index: number) => {
    const existingTypes = Reflect.getMetadata('design:paramtypes', target, key) || [];
    existingTypes[index] = Object;
    Reflect.defineMetadata('design:paramtypes', existingTypes, target, key);
  };
};
