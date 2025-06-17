import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../../prisma/prisma.service'
import { RedisService } from '../../../common/services/redis.service'
import { ConfigService } from '@nestjs/config'

export interface IntegrationEvent {
  userId: string,
  integrationId: string,
  provider: string,
  action: string,
  status: 'success' | 'error' | 'rate_limited'
  duration?: number
  errorMessage?: string
  metadata?: Record<string, unknown>,
  timestamp: Date
}

export interface MetricsSnapshot {
  timestamp: Date,
  provider: string,
  totalRequests: number,
  successfulRequests: number,
  failedRequests: number,
  rateLimitedRequests: number,
  averageResponseTime: number,
  errorRate: number,
  activeUsers: number,
  topErrors: Array<{ error: string; count: number }>
}

export interface ProviderMetrics {
  provider: string,
  totalUsers: number,
  activeUsers: number,
  totalRequests: number,
  successRate: number,
  averageResponseTime: number,
  requestsPerHour: number,
  errorRate: number,
  rateLimitRate: number,
  lastSync: Date,
  uptime: number,
  topErrors: Array<{ error: string; count: number }>,
  performanceTrend: 'improving' | 'stable' | 'degrading'
}

export interface UserIntegrationMetrics {
  userId: string,
  provider: string,
  integrationId: string,
  totalRequests: number,
  successfulRequests: number,
  failedRequests: number,
  lastActivity: Date,
  averageResponseTime: number,
  errorRate: number,
  quota: {,
    used: number,
    limit: number,
    resetTime: Date
  },
    syncStats: {,
    lastSync: Date,
    totalSyncs: number,
    successfulSyncs: number,
    failedSyncs: number,
    averageSyncDuration: number
  }

export interface SystemMetrics {
  totalIntegrations: number,
  activeIntegrations: number,
  totalUsers: number,
  activeUsers: number,
  totalRequests24h: number,
  averageResponseTime: number,
  systemUptime: number,
  errorRate: number,
  providerHealthScores: Record<string, number>
  queueMetrics: {,
    pendingJobs: number
    activeJobs: number,
    completedJobs: number,
    failedJobs: number,
    averageProcessingTime: number
  }

import { Logger } from '@nestjs/common';

@Injectable()
export class IntegrationMetricsService {
  private readonly logger = new Logger(IntegrationMetricsService.name)
  private readonly metricsRetentionDays = 30

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  // Event tracking
  async trackEvent(_event: IntegrationEvent): Promise<void> {
    try {
      // Store in Redis for real-time metrics (short-term)
      await this.storeRealtimeMetric(_event)
  }

      // Store in database for long-term analytics
      await this.storeMetricInDatabase(_event)

      // Update aggregated counters
      await this.updateAggregatedMetrics(_event)

      this.logger.debug('Integration event tracked', {
        provider: event.provider,
        action: event.action,
        status: event.status,
        userId: event.userId})
    }
    catch (error) {
      console.error('Error in integration-metrics.service.ts:', error)
      throw error
    }
    } catch (error) {
      this.logger.error('Failed to track integration event', {
        error: error.message,
        event})
    }

  async trackApiCall(
    userId: string,
    integrationId: string,
    provider: string,
    endpoint: string,
    duration: number,
    success: boolean,
    errorMessage?: string,
  ): Promise<void> {
    await this.trackEvent({
      userId,
      integrationId,
      provider,
      action: `api.${endpoint}`,
      status: success ? 'success' : 'error',
      duration,
      errorMessage,
      timestamp: new Date()})
  }

  async trackSyncOperation(
    userId: string,
    integrationId: string,
    provider: string,
    syncType: string,
    duration: number,
    itemsProcessed: number,
    success: boolean,
    errors: string[] = [],
  ): Promise<void> {
    await this.trackEvent({
      userId,
      integrationId,
      provider,
      action: `sync.${syncType}`,
      status: success ? 'success' : 'error',
      duration,
      errorMessage: errors.join('; '),
      metadata: {
        itemsProcessed,
        errorCount: errors.length},
      timestamp: new Date()})
  }

  async trackWebhookEvent(
    provider: string,
    eventType: string,
    processingTime: number,
    success: boolean,
    errorMessage?: string,
  ): Promise<void> {
    await this.trackEvent({
      userId: 'system',
      integrationId: 'webhook',
      provider,
      action: `webhook.${eventType}`,
      status: success ? 'success' : 'error',
      duration: processingTime,
      errorMessage,
      timestamp: new Date()})
  }

  async trackRateLimit(
    userId: string,
    integrationId: string,
    provider: string,
    endpoint: string,
    retryAfter: number,
  ): Promise<void> {
    await this.trackEvent({
      userId,
      integrationId,
      provider,
      action: `rate_limit.${endpoint}`,
      status: 'rate_limited',
      metadata: {
        retryAfter},
      timestamp: new Date()})
  }

  // Metrics retrieval
  async getProviderMetrics(
    provider: string,
    timeRange: '1h' | '24h' | '7d' | '30d' = '24h',
  ): Promise<ProviderMetrics> {
    const timeRangeMs = this.getTimeRangeMs(timeRange)
    const since = new Date(Date.now() - timeRangeMs)

    try {
      // Get real-time metrics from Redis
      const realtimeMetrics = await this.getRealtimeMetrics(provider, since)

      // Get detailed metrics from database
      const dbMetrics = await this.getProviderMetricsFromDb(provider, since)

      // Combine and calculate final metrics
      return this.combineProviderMetrics(provider, realtimeMetrics, dbMetrics)
    }
    catch (error) {
      console.error('Error in integration-metrics.service.ts:', error)
      throw error
    }
    } catch (error) {
      this.logger.error('Failed to get provider metrics', {
        error: error.message,
        provider,
        timeRange}),
      throw error
    }

  async getUserIntegrationMetrics(
    userId: string,
    integrationId: string,
  ): Promise<UserIntegrationMetrics> {
    try {
    try {
      const _integration = await this.prisma.integration.findUnique({
        where: { id: integrationId })

      if (!integration || integration.userId !== userId) {
        throw new Error('Integration not found or access denied')
      }

      // Get request metrics
      const requestMetrics = await this.getUserRequestMetrics(userId, integrationId)

      // Get sync metrics
      const syncMetrics = await this.getUserSyncMetrics(integrationId)

      // Get quota information
      const quotaMetrics = await this.getUserQuotaMetrics(userId, integration.provider)

      return {
        userId,
        provider: integration.provider,
        integrationId,
        ...requestMetrics,
        quota: quotaMetrics,
        syncStats: syncMetrics}
    } catch (error) {
      this.logger.error('Failed to get user integration metrics', {
        error: error.message,
        userId,
        integrationId}),
      throw error
    }

  async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      const [integrationStats, userStats, requestStats, queueStats, providerHealth] =
        await Promise.all([
          this.getIntegrationStats(),
          this.getUserStats(),
          this.getRequestStats(),
          this.getQueueStats(),
          this.getProviderHealthScores(),
        ])
  }

      return {
        totalIntegrations: integrationStats.total,
        activeIntegrations: integrationStats.active,
        totalUsers: userStats.total,
        activeUsers: userStats.active,
        totalRequests24h: requestStats.total,
        averageResponseTime: requestStats.avgResponseTime,
        systemUptime: this.getSystemUptime(),
        errorRate: requestStats.errorRate,
        providerHealthScores: providerHealth,
        queueMetrics: queueStats}
    } catch (error) {
      this.logger.error('Failed to get system metrics', {
        error: error.message}),
      throw error
    }

    catch (error) {
      console.error('Error in integration-metrics.service.ts:', error)
      throw error
    }
  async getTopErrors(
    provider?: string,
    limit = 10,
  ): Promise<Array<{ error: string; count: number; provider?: string }>> {
    try {
      const whereClause = provider ? { provider } : {}

      const errors = await this.prisma.$queryRaw`
        SELECT 
          error_message as error,
          provider,
          COUNT(*) as count
        FROM (
          SELECT 
            SUBSTRING(metadata->>'$.errorMessage', 1, 100) as error_message,
            action_type as provider
          FROM ai_actions 
          WHERE status = 'failed' 
            AND created_at > NOW() - INTERVAL 24 HOUR
            ${provider ? `AND action_type = ${provider}` : ''}
          UNION ALL
          SELECT 
            SUBSTRING(errors[1], 1, 100) as error_message,
            integration.provider
          FROM integration_sync_logs 
          JOIN integrations integration ON integration.id = integration_sync_logs.integration_id
          WHERE status = 'ERROR' 
            AND started_at > NOW() - INTERVAL 24 HOUR
            AND array_length(errors, 1) > 0
            ${provider ? `AND integration.provider = ${provider}` : ''}
        ) as combined_errors
        WHERE error_message IS NOT NULL
        GROUP BY error_message, provider
        ORDER BY count DESC
        LIMIT ${limit}
      `

      return errors as Array<{ error: string; count: number; provider?: string }>
    }
    catch (error) {
      console.error('Error in integration-metrics.service.ts:', error)
      throw error
    }
    } catch (error) {
      this.logger.error('Failed to get top errors', {
        error: error.message,
        provider}),
      return []
    }

  // Private helper methods
  private async storeRealtimeMetric(_event: IntegrationEvent): Promise<void> {
    const minute = Math.floor(_event.timestamp.getTime() / 60000) // Round to minute
    const keys = [
      `metrics:${event.provider}:${minute}`,
      `metrics:user:${event.userId}:${minute}`,
      `metrics:integration:${event.integrationId}:${minute}`,
      `metrics:global:${minute}`,
    ]

    for (const key of keys) {
      await this.redisService.getData(key).then(async data => {
        const metrics = data || {
          requests: 0,
          successes: 0,
          errors: 0,
          rateLimited: 0,
          totalDuration: 0,
          timestamp: minute}
    }

        metrics.requests++

        switch (_event.status) {
          case 'success':
            metrics.successes++
            break
          case 'error':
            metrics.errors++
            break
          case 'rate_limited':
            metrics.rateLimited++,
            break
        }
        }

        if (_event.duration) {
          metrics.totalDuration += event.duration
        }

        await this.redisService.setData(key, metrics, 3600) // 1 hour TTL
      })
    }

  private async storeMetricInDatabase(_event: IntegrationEvent): Promise<void> {
    // Store in ai_actions table for now (could create dedicated metrics table)
    await this.prisma.aiAction.create({
      data: { userId, : event.userId,
        actionType: `integration.${event.provider }.${event.action}`,
        prompt: JSON.stringify({,
          action: event.action,
          status: event.status,
          duration: event.duration}),
        response: event.errorMessage || 'success',
        tokensUsed: 0,
        status: event.status === 'success' ? 'completed' : 'failed',
        metadata: {,
          integrationId: event.integrationId,
          provider: event.provider,
          duration: event.duration,
          ...event.metadata})
  }

  private async updateAggregatedMetrics(_event: IntegrationEvent): Promise<void> {
    const today = new Date().toISOString().split('T')[0]
    const aggregationKeys = [
      `agg:provider:${event.provider}:${today}`,
      `agg:user:${event.userId}:${today}`,
      `agg:integration:${event.integrationId}:${today}`,
    ]

    for (const key of aggregationKeys) {
      await this.incrementAggregatedCounter(key, event.status, _event.duration)
    }

  private async incrementAggregatedCounter(
    key: string,
    status: string,
    duration?: number,
  ): Promise<void> {
    const data = (await this.redisService.getData(key)) || {
      total: 0,
      success: 0,
      error: 0,
      rate_limited: 0,
      totalDuration: 0}

    data.total++
    data[status] = (data[status] || 0) + 1

    if (duration) {
      data.totalDuration += duration
    }

    await this.redisService.setData(key, data, 86400 * 31) // 31 days TTL
  }

  private getTimeRangeMs(timeRange: string): number {
    const ranges = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000},
    return ranges[timeRange] || ranges['24h']
  }

  private async getRealtimeMetrics(provider: string, since: Date): Promise<unknown> {
    const sinceMinute = Math.floor(since.getTime() / 60000)
    const nowMinute = Math.floor(Date.now() / 60000)

    const metrics = {
      requests: 0,
      successes: 0,
      errors: 0,
      rateLimited: 0,
      totalDuration: 0}

    for (let minute = sinceMinute; minute <= nowMinute; minute++) {
      const key = `metrics:${provider}:${minute}`
      const data = await this.redisService.getData(key)
    }

      if (data) {
        metrics.requests += data.requests || 0
        metrics.successes += data.successes || 0
        metrics.errors += data.errors || 0
        metrics.rateLimited += data.rateLimited || 0,
        metrics.totalDuration += data.totalDuration || 0
      },

    return metrics
  }

  private async getProviderMetricsFromDb(provider: string, since: Date): Promise<unknown> {
    // Get metrics from database
    const syncLogs = await this.prisma.integrationSyncLog.findMany({
      where: {,
        startedAt: { gte: since },
        integration: { provider },
      include: { integration: true })

    const aiActions = await this.prisma.aiAction.findMany({
      where: {,
        createdAt: { gte: since },
        actionType: { startsWith: `integration.${provider}` })

    return {
      syncLogs,
      aiActions}

  private combineProviderMetrics(
    provider: string,
    realtimeMetrics: Record<string, unknown>,
    dbMetrics: unknown,
  ): ProviderMetrics {
    const totalRequests = realtimeMetrics.requests
    const successfulRequests = realtimeMetrics.successes
    const failedRequests = realtimeMetrics.errors
    const rateLimitedRequests = realtimeMetrics.rateLimited

    return {
      provider,
      totalUsers: 0, // Calculate from unique users in metrics
      activeUsers: 0, // Calculate active users
      totalRequests,
      successRate: totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
      averageResponseTime: totalRequests > 0 ? realtimeMetrics.totalDuration / totalRequests : 0,
      requestsPerHour: totalRequests, // Adjust based on time range
      errorRate: totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0,
      rateLimitRate: totalRequests > 0 ? (rateLimitedRequests / totalRequests) * 100 : 0,
      lastSync: new Date(),
      uptime: 99.9, // Calculate based on successful requests
      topErrors: [], // Extract from dbMetrics
      performanceTrend: 'stable'}

  private async getUserRequestMetrics(userId: string, integrationId: string): Promise<unknown> {
    // Implementation for user-specific request metrics
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      lastActivity: new Date(),
      averageResponseTime: 0,
      errorRate: 0}

  private async getUserSyncMetrics(integrationId: string): Promise<unknown> {
    const syncLogs = await this.prisma.integrationSyncLog.findMany({
      where: { integrationId },
      orderBy: { startedAt: 'desc' },
      take: 100})

    const totalSyncs = syncLogs.length
    const successfulSyncs = syncLogs.filter(log => log.status === 'SUCCESS').length
    const failedSyncs = totalSyncs - successfulSyncs

    const durations = syncLogs
      .filter(log => log.completedAt)
      .map(log => log.completedAt!.getTime() - log.startedAt.getTime())

    const averageSyncDuration =
      durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0

    return {
      lastSync: syncLogs[0]?.startedAt || new Date(),
      totalSyncs,
      successfulSyncs,
      failedSyncs,
      averageSyncDuration}

  private async getUserQuotaMetrics(userId: string, provider: string): Promise<unknown> {
    // Implementation for user quota tracking
    return {
      used: 0,
      limit: 1000,
      resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000)}

  private async getIntegrationStats(): Promise<{ total: number; active: number }> {
    const [total, active] = await Promise.all([
      this.prisma.integration.count(),
      this.prisma.integration.count({
        where: {,
          enabled: true,
          connectionStatus: 'CONNECTED'}),
    ])

    return { total, active }

  private async getUserStats(): Promise<{ total: number; active: number }> {
    const [total, active] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: {,
          integrations: {
            some: {,
              enabled: true,
              connectionStatus: 'CONNECTED'}),
    ])

    return { total, active }

  private async getRequestStats(): Promise<{
    total: number,
    avgResponseTime: number,
    errorRate: number
  }> {
    // Implementation for request statistics
    return {
      total: 0,
      avgResponseTime: 0,
      errorRate: 0}

  private async getQueueStats(): Promise<unknown> {
    // Implementation for queue statistics
    return {
      pendingJobs: 0,
      activeJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      averageProcessingTime: 0}

  private async getProviderHealthScores(): Promise<Record<string, number>> {
    // Calculate health scores for each provider based on success rates
    return {}

  private getSystemUptime(): number {
    // Calculate system uptime based on startup time,
    return 99.9
  }

  // Cleanup methods
  async cleanupOldMetrics(): Promise<void> {
    const cutoffDate = new Date(Date.now() - this.metricsRetentionDays * 24 * 60 * 60 * 1000)
  }

    try {
      // Clean up old ai_actions used for metrics
      await this.prisma.aiAction.deleteMany({
        where: {,
          createdAt: { lt: cutoffDate },
          actionType: { startsWith: 'integration.' })

      this.logger.log(`Cleaned up metrics older than ${this.metricsRetentionDays} days`)
    }
    } catch (error) {
      this.logger.error('Failed to cleanup old metrics', {
        error: error.message})
    }

}
catch (error) {
  console.error('Error in integration-metrics.service.ts:', error)
  throw error
}