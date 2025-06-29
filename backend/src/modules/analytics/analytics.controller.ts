import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AnalyticsService } from './services/analytics.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import {
  UsageAnalytics,
  PerformanceMetrics,
  Insight,
  ActivityTimelineItem,
  IntegrationAnalytics,
} from './interfaces/analytics.interface';

interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string;
}

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('usage')
  @ApiOperation({ summary: 'Get usage analytics' })
  async getUsageAnalytics(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AnalyticsQueryDto
  ): Promise<UsageAnalytics> {
    return this.analyticsService.getUserUsageAnalytics(user.id, query);
  }

  @Get('usage/current')
  @ApiOperation({ summary: 'Get current period usage' })
  async getCurrentUsage(@CurrentUser() user: AuthenticatedUser): Promise<UsageAnalytics> {
    return this.analyticsService.getUserUsageAnalytics(user.id, {});
  }

  @Get('performance')
  @ApiOperation({ summary: 'Get performance metrics' })
  async getPerformanceMetrics(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AnalyticsQueryDto
  ): Promise<PerformanceMetrics> {
    return this.analyticsService.getPerformanceMetrics(user.id, query);
  }

  @Get('insights')
  @ApiOperation({ summary: 'Get AI-generated insights' })
  async getInsights(@CurrentUser() user: AuthenticatedUser): Promise<Insight[]> {
    return this.analyticsService.generateInsights(user.id);
  }

  @Get('activity')
  @ApiOperation({ summary: 'Get activity timeline' })
  async getActivityTimeline(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AnalyticsQueryDto
  ): Promise<ActivityTimelineItem[]> {
    return this.analyticsService.getActivityTimeline(user.id, query);
  }

  @Get('integrations/:provider')
  @ApiOperation({ summary: 'Get integration-specific analytics' })
  async getIntegrationAnalytics(
    @CurrentUser() user: AuthenticatedUser,
    @Param('provider') provider: string,
    @Query() query: AnalyticsQueryDto
  ): Promise<IntegrationAnalytics> {
    return this.analyticsService.getIntegrationAnalytics(user.id, provider, query);
  }
}
