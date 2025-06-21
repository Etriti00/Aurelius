import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { ConfigService } from '../../modules/config/config.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(
    context: ExecutionContext,
  ): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      throw new UnauthorizedException('API key is missing');
    }

    // TODO: Implement actual API key validation against database
    // This is a placeholder implementation
    const prefix = this.configService.get<string>('security.api.keyPrefix');
    
    if (!apiKey.startsWith(prefix)) {
      throw new UnauthorizedException('Invalid API key format');
    }

    // In production, validate against database
    // const isValid = await this.validateApiKey(apiKey);
    // if (!isValid) {
    //   throw new UnauthorizedException('Invalid API key');
    // }

    return true;
  }

  private extractApiKey(request: Request): string | undefined {
    // Check Authorization header
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check X-API-Key header
    const apiKeyHeader = request.headers['x-api-key'];
    if (apiKeyHeader) {
      return apiKeyHeader as string;
    }

    // Check query parameter
    return request.query.api_key as string;
  }
}