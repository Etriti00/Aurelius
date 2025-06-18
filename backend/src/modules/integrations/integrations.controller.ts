import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { IntegrationsService } from './integrations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('integrations')
@Controller('integrations')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user integrations' })
  @ApiResponse({ status: 200, description: 'Integrations retrieved successfully' })
  async getUserIntegrations(@CurrentUser() user: any): Promise<any> {
    return this.integrationsService.getUserIntegrations(user.id);
  }

  @Get(':provider/status')
  @ApiOperation({ summary: 'Get integration status' })
  @ApiResponse({ status: 200, description: 'Integration status retrieved successfully' })
  async getIntegrationStatus(
    @CurrentUser() user: any,
    @Param('provider') provider: string
  ): Promise<any> {
    return this.integrationsService.getIntegrationStatus(user.id, provider);
  }

  @Post(':provider/connect')
  @ApiOperation({ summary: 'Connect integration' })
  @ApiResponse({ status: 201, description: 'Integration connected successfully' })
  async connectIntegration(
    @CurrentUser() user: any,
    @Param('provider') provider: string,
    @Body() credentials: any
  ): Promise<any> {
    return this.integrationsService.connectIntegration(user.id, provider, credentials);
  }

  @Delete(':provider')
  @ApiOperation({ summary: 'Disconnect integration' })
  @ApiResponse({ status: 200, description: 'Integration disconnected successfully' })
  async disconnectIntegration(
    @CurrentUser() user: any,
    @Param('provider') provider: string
  ): Promise<any> {
    return this.integrationsService.disconnectIntegration(user.id, provider);
  }
}