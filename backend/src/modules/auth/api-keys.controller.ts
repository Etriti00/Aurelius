import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiKeyService } from '../../common/guards/api-key.guard';
import { RequestUser } from '../../common/interfaces/user.interface';

class CreateApiKeyDto {
  name: string;
  expiresIn?: number; // seconds

  constructor(data: { name: string; expiresIn?: number }) {
    this.name = data.name;
    this.expiresIn = data.expiresIn;
  }
}

class ApiKeyResponseDto {
  id: string;
  name: string;
  key?: string; // Only returned on creation
  keyPrefix: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  usageCount: number;

  constructor(data: {
    id: string;
    name: string;
    key?: string;
    keyPrefix: string;
    lastUsedAt: Date | null;
    expiresAt: Date | null;
    isActive: boolean;
    createdAt: Date;
    usageCount: number;
  }) {
    this.id = data.id;
    this.name = data.name;
    this.key = data.key;
    this.keyPrefix = data.keyPrefix;
    this.lastUsedAt = data.lastUsedAt;
    this.expiresAt = data.expiresAt;
    this.isActive = data.isActive;
    this.createdAt = data.createdAt;
    this.usageCount = data.usageCount;
  }
}

@ApiTags('auth')
@Controller('auth/api-keys')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ApiKeysController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post()
  @ApiOperation({ summary: 'Generate a new API key' })
  @ApiResponse({
    status: 201,
    description: 'API key created successfully',
    type: ApiKeyResponseDto,
  })
  async createApiKey(
    @CurrentUser() user: RequestUser,
    @Body() createDto: CreateApiKeyDto
  ): Promise<ApiKeyResponseDto> {
    const { key } = await this.apiKeyService.generateApiKey(
      user.id,
      createDto.name,
      createDto.expiresIn
    );

    // Get the created key details
    const keys = await this.apiKeyService.listApiKeys(user.id);
    const createdKey = keys.find(k => k.name === createDto.name);

    if (!createdKey) {
      throw new Error('Failed to create API key');
    }

    return {
      ...createdKey,
      key, // Include the actual key only on creation
    };
  }

  @Get()
  @ApiOperation({ summary: 'List all API keys for the current user' })
  @ApiResponse({
    status: 200,
    description: 'List of API keys',
    type: [ApiKeyResponseDto],
  })
  async listApiKeys(@CurrentUser() user: RequestUser): Promise<ApiKeyResponseDto[]> {
    const keys = await this.apiKeyService.listApiKeys(user.id);
    return keys.map(key => ({
      ...key,
      lastUsedAt: key.lastUsedAt,
      expiresAt: key.expiresAt,
    }));
  }

  @Delete(':keyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiResponse({
    status: 204,
    description: 'API key revoked successfully',
  })
  async revokeApiKey(
    @CurrentUser() user: RequestUser,
    @Param('keyId') keyId: string
  ): Promise<void> {
    await this.apiKeyService.revokeApiKey(user.id, keyId);
  }
}
