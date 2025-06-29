import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString } from 'class-validator';

export class ConnectIntegrationDto {
  @ApiProperty({ description: 'OAuth access token' })
  @IsString()
  accessToken: string = '';

  @ApiPropertyOptional({ description: 'OAuth refresh token' })
  @IsOptional()
  @IsString()
  refreshToken?: string;

  @ApiPropertyOptional({ description: 'Token expiry date' })
  @IsOptional()
  @IsDateString()
  tokenExpiry?: string;

  @ApiPropertyOptional({ description: 'Token type', default: 'Bearer' })
  @IsOptional()
  @IsString()
  tokenType?: string;

  @ApiPropertyOptional({ description: 'Provider account ID' })
  @IsOptional()
  @IsString()
  providerAccountId?: string;
}

export interface UserIntegrationResponse {
  id: string;
  provider: string;
  status: string;
  lastSyncAt: Date | null;
  syncError: string | null;
  settings: Record<string, string | number | boolean | object>;
  createdAt: Date;
}

export interface IntegrationStatusResponse {
  id: string;
  provider: string;
  status: string;
  lastSyncAt: Date | null;
  syncError: string | null;
}

export interface ConnectIntegrationResponse {
  id: string;
  provider: string;
  status: string;
  message: string;
}

export interface DisconnectIntegrationResponse {
  message: string;
}

export interface IntegrationSyncStatusResponse {
  integrationId: string;
  status: 'idle' | 'syncing' | 'error' | 'paused';
  lastSync?: Date;
  nextSync?: Date;
  progress?: number;
  currentOperation?: string;
  errors: string[];
  syncStats?: {
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    itemsSynced: number;
    successRate?: number;
    errorRate?: number;
    averageItemsPerSync?: number;
  };
}

export interface OAuthProviderData {
  id: string;
  email: string;
  name: string;
  picture?: string;
  verified_email?: boolean;
  provider?: string;
}

export interface IntegrationTokens {
  accessToken: string;
  refreshToken?: string;
  tokenExpiry?: Date;
  tokenType?: string;
}

export interface IntegrationHealth {
  isConnected: boolean;
  lastSync?: Date;
  error?: string;
  syncStatus: 'idle' | 'syncing' | 'error';
  errorCount?: number;
  lastHealthCheck?: Date;
}
