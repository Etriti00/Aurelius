import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { EnhancedApiKeyService } from '../services/api-key.service';
import { RequestUser } from '../../../common/interfaces/user.interface';
import {
  CreateApiKeyDto,
  UpdateApiKeyDto,
  RevokeApiKeyDto,
  ApiKeyResponseDto,
  ApiKeyUsageStatsDto,
  ListApiKeysQueryDto,
  UsageStatsQueryDto,
} from '../dto/api-key.dto';

@ApiTags('auth')
@Controller('auth/api-keys')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class EnhancedApiKeysController {
  constructor(private readonly apiKeyService: EnhancedApiKeyService) {}

  @Post()
  @ApiOperation({
    summary: 'Generate a new API key',
    description:
      'Creates a new API key with specified permissions, scopes, and security restrictions',
  })
  @ApiResponse({
    status: 201,
    description: 'API key created successfully',
    type: ApiKeyResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or API key with same name already exists',
  })
  async createApiKey(
    @CurrentUser() user: RequestUser,
    @Body(new ValidationPipe({ transform: true })) createDto: CreateApiKeyDto
  ): Promise<ApiKeyResponseDto> {
    const { key, apiKey } = await this.apiKeyService.generateApiKey(user.id, createDto, user.id);

    return {
      ...apiKey,
      key, // Include the actual key only on creation
    };
  }

  @Get()
  @ApiOperation({
    summary: 'List API keys for the current user',
    description: 'Retrieves all API keys with optional filtering by environment, tags, and status',
  })
  @ApiQuery({
    name: 'environment',
    required: false,
    enum: ['production', 'staging', 'development'],
  })
  @ApiQuery({ name: 'includeRevoked', required: false, type: Boolean })
  @ApiQuery({ name: 'tag', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'List of API keys',
    type: [ApiKeyResponseDto],
  })
  async listApiKeys(
    @CurrentUser() user: RequestUser,
    @Query(new ValidationPipe({ transform: true })) query: ListApiKeysQueryDto
  ): Promise<ApiKeyResponseDto[]> {
    const keys = await this.apiKeyService.listApiKeys(user.id);

    // Apply client-side filtering (in production, this should be done in the service)
    let filteredKeys = keys;

    if (query.environment) {
      filteredKeys = filteredKeys.filter(key => key.environment === query.environment);
    }

    if (!query.includeRevoked) {
      filteredKeys = filteredKeys.filter(key => !key.isRevoked);
    }

    if (query.tag) {
      filteredKeys = filteredKeys.filter(key => query.tag && key.tags.includes(query.tag));
    }

    // Apply pagination
    const page = query.page || 1;
    const limit = query.limit || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    return filteredKeys.slice(startIndex, endIndex);
  }

  @Get(':keyId')
  @ApiOperation({
    summary: 'Get API key details',
    description: 'Retrieves detailed information about a specific API key',
  })
  @ApiParam({ name: 'keyId', description: 'API key ID' })
  @ApiResponse({
    status: 200,
    description: 'API key details',
    type: ApiKeyResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'API key not found',
  })
  async getApiKey(
    @CurrentUser() user: RequestUser,
    @Param('keyId') keyId: string
  ): Promise<ApiKeyResponseDto> {
    const keys = await this.apiKeyService.listApiKeys(user.id);
    const apiKey = keys.find(key => key.id === keyId);

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    return apiKey;
  }

  @Put(':keyId')
  @ApiOperation({
    summary: 'Update an API key',
    description:
      'Updates API key settings including permissions, rate limits, and security restrictions',
  })
  @ApiParam({ name: 'keyId', description: 'API key ID' })
  @ApiResponse({
    status: 200,
    description: 'API key updated successfully',
    type: ApiKeyResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'API key not found',
  })
  async updateApiKey(
    @CurrentUser() user: RequestUser,
    @Param('keyId') keyId: string,
    @Body(new ValidationPipe({ transform: true })) updateDto: UpdateApiKeyDto
  ): Promise<ApiKeyResponseDto> {
    return await this.apiKeyService.updateApiKey(user.id, keyId, updateDto);
  }

  @Delete(':keyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Revoke an API key',
    description: 'Permanently revokes an API key, making it unusable for future requests',
  })
  @ApiParam({ name: 'keyId', description: 'API key ID' })
  @ApiResponse({
    status: 204,
    description: 'API key revoked successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'API key not found',
  })
  async revokeApiKey(
    @CurrentUser() user: RequestUser,
    @Param('keyId') keyId: string,
    @Body(new ValidationPipe({ transform: true })) revokeDto: RevokeApiKeyDto
  ): Promise<void> {
    await this.apiKeyService.revokeApiKey(user.id, keyId, revokeDto.reason, user.id);
  }

  @Get(':keyId/usage')
  @ApiOperation({
    summary: 'Get API key usage statistics',
    description: 'Retrieves detailed usage statistics for a specific API key',
  })
  @ApiParam({ name: 'keyId', description: 'API key ID' })
  @ApiQuery({ name: 'from', required: false, type: String, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'to', required: false, type: String, description: 'End date (ISO 8601)' })
  @ApiResponse({
    status: 200,
    description: 'API key usage statistics',
    type: ApiKeyUsageStatsDto,
  })
  async getApiKeyUsage(
    @CurrentUser() user: RequestUser,
    @Param('keyId') keyId: string,
    @Query(new ValidationPipe({ transform: true })) query: UsageStatsQueryDto
  ): Promise<ApiKeyUsageStatsDto> {
    const timeRange =
      query.from && query.to
        ? {
            from: new Date(query.from),
            to: new Date(query.to),
          }
        : undefined;

    return await this.apiKeyService.getUsageStatistics(user.id, keyId, timeRange);
  }

  @Get('usage/overview')
  @ApiOperation({
    summary: 'Get usage overview for all API keys',
    description: 'Retrieves aggregated usage statistics for all user API keys',
  })
  @ApiQuery({ name: 'from', required: false, type: String, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'to', required: false, type: String, description: 'End date (ISO 8601)' })
  @ApiResponse({
    status: 200,
    description: 'Overall usage statistics',
    type: ApiKeyUsageStatsDto,
  })
  async getUsageOverview(
    @CurrentUser() user: RequestUser,
    @Query(new ValidationPipe({ transform: true })) query: UsageStatsQueryDto
  ): Promise<ApiKeyUsageStatsDto> {
    const timeRange =
      query.from && query.to
        ? {
            from: new Date(query.from),
            to: new Date(query.to),
          }
        : undefined;

    return await this.apiKeyService.getUsageStatistics(user.id, undefined, timeRange);
  }
}
