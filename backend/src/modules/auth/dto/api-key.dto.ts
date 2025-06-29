import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsBoolean,
  IsObject,
  IsEnum,
  IsPositive,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ApiKeyEnvironment {
  PRODUCTION = 'production',
  STAGING = 'staging',
  DEVELOPMENT = 'development',
}

export class CreateApiKeyDto {
  @ApiProperty({
    description: 'Name of the API key',
    example: 'Production API Key',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    description: 'Description of the API key purpose',
    example: 'API key for production server integration',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Scopes that this API key has access to',
    example: ['read:tasks', 'write:tasks', 'read:calendar'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];

  @ApiPropertyOptional({
    description: 'Permissions object with specific capabilities',
    example: {
      tasks: { read: true, write: true, delete: false },
      calendar: { read: true, write: false },
    },
  })
  @IsOptional()
  @IsObject()
  permissions?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Rate limit per hour',
    example: 1000,
    minimum: 1,
    maximum: 100000,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Min(1)
  @Max(100000)
  rateLimit?: number;

  @ApiPropertyOptional({
    description: 'Rate limit window in seconds',
    example: 3600,
    minimum: 60,
    maximum: 86400,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Min(60) // Minimum 1 minute
  @Max(86400) // Maximum 24 hours
  rateLimitWindow?: number;

  @ApiPropertyOptional({
    description: 'Allowed IP addresses (CIDR notation supported)',
    example: ['192.168.1.0/24', '10.0.0.1'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedIPs?: string[];

  @ApiPropertyOptional({
    description: 'Allowed domains (wildcards supported)',
    example: ['*.example.com', 'api.myapp.com'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedDomains?: string[];

  @ApiPropertyOptional({
    description: 'Required headers that must be present in requests',
    example: { 'X-Client-Version': '1.0', 'X-App-ID': 'myapp' },
  })
  @IsOptional()
  @IsObject()
  requiredHeaders?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Expiration time in seconds from now',
    example: 7776000, // 90 days
    minimum: 3600,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Min(3600) // Minimum 1 hour
  expiresIn?: number;

  @ApiPropertyOptional({
    description: 'Environment this API key is for',
    enum: ApiKeyEnvironment,
    example: ApiKeyEnvironment.PRODUCTION,
  })
  @IsOptional()
  @IsEnum(ApiKeyEnvironment)
  environment?: ApiKeyEnvironment;

  @ApiPropertyOptional({
    description: 'Tags for organizing API keys',
    example: ['production', 'mobile-app', 'v1'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { team: 'backend', owner: 'john@example.com' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateApiKeyDto {
  @ApiPropertyOptional({
    description: 'Name of the API key',
    example: 'Updated API Key',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Description of the API key purpose',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Scopes that this API key has access to',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];

  @ApiPropertyOptional({
    description: 'Permissions object with specific capabilities',
  })
  @IsOptional()
  @IsObject()
  permissions?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Rate limit per hour',
    minimum: 1,
    maximum: 100000,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Min(1)
  @Max(100000)
  rateLimit?: number;

  @ApiPropertyOptional({
    description: 'Rate limit window in seconds',
    minimum: 60,
    maximum: 86400,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Min(60)
  @Max(86400)
  rateLimitWindow?: number;

  @ApiPropertyOptional({
    description: 'Allowed IP addresses',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedIPs?: string[];

  @ApiPropertyOptional({
    description: 'Allowed domains',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedDomains?: string[];

  @ApiPropertyOptional({
    description: 'Required headers',
  })
  @IsOptional()
  @IsObject()
  requiredHeaders?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Tags for organizing API keys',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Additional metadata',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class RevokeApiKeyDto {
  @ApiPropertyOptional({
    description: 'Reason for revoking the API key',
    example: 'Security breach - key compromised',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class ApiKeyResponseDto {
  @ApiProperty({
    description: 'API key ID',
    example: 'cuid123',
  })
  id!: string;

  @ApiProperty({
    description: 'API key name',
    example: 'Production API Key',
  })
  name!: string;

  @ApiPropertyOptional({
    description: 'API key description',
    example: 'API key for production server integration',
  })
  description?: string;

  @ApiProperty({
    description: 'API key prefix (for display purposes)',
    example: 'aur_1234***',
  })
  keyPrefix!: string;

  @ApiPropertyOptional({
    description: 'Full API key (only returned on creation)',
    example: 'aur_1234567890abcdef...',
  })
  key?: string;

  @ApiProperty({
    description: 'Scopes assigned to this API key',
    type: [String],
    example: ['read:tasks', 'write:tasks'],
  })
  scopes!: string[];

  @ApiProperty({
    description: 'Permissions assigned to this API key',
    example: { tasks: { read: true, write: true } },
  })
  permissions!: Record<string, unknown>;

  @ApiProperty({
    description: 'Whether the API key is active',
    example: true,
  })
  isActive!: boolean;

  @ApiProperty({
    description: 'Whether the API key is revoked',
    example: false,
  })
  isRevoked!: boolean;

  @ApiProperty({
    description: 'Number of times this API key has been used',
    example: 1542,
  })
  usageCount!: number;

  @ApiPropertyOptional({
    description: 'Last time this API key was used',
    example: '2024-12-29T10:30:00.000Z',
  })
  lastUsedAt?: Date;

  @ApiPropertyOptional({
    description: 'Rate limit per hour',
    example: 1000,
  })
  rateLimit?: number;

  @ApiPropertyOptional({
    description: 'Rate limit window in seconds',
    example: 3600,
  })
  rateLimitWindow?: number;

  @ApiPropertyOptional({
    description: 'When this API key expires',
    example: '2025-03-29T10:30:00.000Z',
  })
  expiresAt?: Date;

  @ApiProperty({
    description: 'Environment this API key is for',
    example: 'production',
  })
  environment!: string;

  @ApiProperty({
    description: 'Tags associated with this API key',
    type: [String],
    example: ['production', 'mobile-app'],
  })
  tags!: string[];

  @ApiProperty({
    description: 'When this API key was created',
    example: '2024-12-29T10:30:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'When this API key was last updated',
    example: '2024-12-29T10:30:00.000Z',
  })
  updatedAt!: Date;
}

export class ApiKeyUsageStatsDto {
  @ApiProperty({
    description: 'Total number of requests',
    example: 1542,
  })
  totalRequests!: number;

  @ApiProperty({
    description: 'Number of successful requests (2xx status)',
    example: 1485,
  })
  successfulRequests!: number;

  @ApiProperty({
    description: 'Number of blocked requests',
    example: 57,
  })
  blockedRequests!: number;

  @ApiProperty({
    description: 'Average response time in milliseconds',
    example: 245,
  })
  averageResponseTime!: number;

  @ApiProperty({
    description: 'Top endpoints by usage',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        endpoint: { type: 'string', example: '/api/v1/tasks' },
        count: { type: 'number', example: 342 },
      },
    },
  })
  topEndpoints!: Array<{ endpoint: string; count: number }>;

  @ApiProperty({
    description: 'Daily usage statistics',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        date: { type: 'string', example: '2024-12-29' },
        count: { type: 'number', example: 156 },
      },
    },
  })
  dailyUsage!: Array<{ date: string; count: number }>;
}

export class ListApiKeysQueryDto {
  @ApiPropertyOptional({
    description: 'Environment to filter by',
    enum: ApiKeyEnvironment,
  })
  @IsOptional()
  @IsEnum(ApiKeyEnvironment)
  environment?: ApiKeyEnvironment;

  @ApiPropertyOptional({
    description: 'Whether to include revoked keys',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeRevoked?: boolean;

  @ApiPropertyOptional({
    description: 'Tag to filter by',
    example: 'production',
  })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}

export class UsageStatsQueryDto {
  @ApiPropertyOptional({
    description: 'Start date for statistics (ISO 8601)',
    example: '2024-12-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({
    description: 'End date for statistics (ISO 8601)',
    example: '2024-12-29T23:59:59.999Z',
  })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({
    description: 'Specific API key ID to get statistics for',
    example: 'cuid123',
  })
  @IsOptional()
  @IsString()
  keyId?: string;
}
