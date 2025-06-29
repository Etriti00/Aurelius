import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { IntegrationsService } from './integrations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser } from '../../common/interfaces/user.interface';
import {
  ConnectIntegrationDto,
  UserIntegrationResponse,
  IntegrationStatusResponse,
  ConnectIntegrationResponse,
  DisconnectIntegrationResponse,
} from './dto/integration.dto';

@ApiTags('integrations')
@Controller('integrations')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user integrations' })
  @ApiResponse({ status: 200, description: 'Integrations retrieved successfully', type: [Object] })
  async getUserIntegrations(@CurrentUser() user: RequestUser): Promise<UserIntegrationResponse[]> {
    return this.integrationsService.getUserIntegrations(user.id);
  }

  @Get(':provider/status')
  @ApiOperation({ summary: 'Get integration status' })
  @ApiResponse({
    status: 200,
    description: 'Integration status retrieved successfully',
    type: Object,
  })
  async getIntegrationStatus(
    @CurrentUser() user: RequestUser,
    @Param('provider') provider: string
  ): Promise<IntegrationStatusResponse | null> {
    return this.integrationsService.getIntegrationStatus(user.id, provider);
  }

  @Post(':provider/connect')
  @ApiOperation({ summary: 'Connect integration' })
  @ApiResponse({ status: 201, description: 'Integration connected successfully', type: Object })
  async connectIntegration(
    @CurrentUser() user: RequestUser,
    @Param('provider') provider: string,
    @Body() credentials: ConnectIntegrationDto
  ): Promise<ConnectIntegrationResponse> {
    const processedCredentials = {
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken,
      tokenExpiry: credentials.tokenExpiry ? new Date(credentials.tokenExpiry) : undefined,
      tokenType: credentials.tokenType,
      providerAccountId: credentials.providerAccountId,
    };

    return this.integrationsService.connectIntegration(user.id, provider, processedCredentials);
  }

  @Delete(':provider')
  @ApiOperation({ summary: 'Disconnect integration' })
  @ApiResponse({ status: 200, description: 'Integration disconnected successfully', type: Object })
  async disconnectIntegration(
    @CurrentUser() user: RequestUser,
    @Param('provider') provider: string
  ): Promise<DisconnectIntegrationResponse> {
    return this.integrationsService.disconnectIntegration(user.id, provider);
  }
}
