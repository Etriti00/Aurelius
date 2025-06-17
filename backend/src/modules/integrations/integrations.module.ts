import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { ConfigService } from '@nestjs/config'
import { IntegrationsService } from './integrations.service'
import { IntegrationsController } from './integrations.controller'
import { WebsocketModule } from '../websocket/websocket.module'

// Base components
import { IntegrationFactory } from './base/integration-factory'

// Common services
import { EncryptionService } from './common/encryption.service'
import { RateLimiterService } from './common/rate-limiter.service'

// Core infrastructure
import { IntegrationRegistryService } from './core/integration-registry.service'

// Webhook handling
import { WebhookRouterController } from './webhooks/webhook-router.controller'
import { WebhookSecurityService } from './webhooks/webhook-security.service'

// Sync orchestration
import { SyncOrchestratorService } from './sync/sync-orchestrator.service'

// Metrics and monitoring
import { IntegrationMetricsService } from './metrics/integration-metrics.service'

// Reliability
import { CircuitBreakerService } from './reliability/circuit-breaker.service'

@Module({
  imports: [
    WebsocketModule,
    ScheduleModule.forRoot(), // Required for cron jobs in sync orchestrator
  ],
  controllers: [IntegrationsController, WebhookRouterController],
  providers: [
    // Core services
    IntegrationsService,

    // Common utilities
    EncryptionService,
    RateLimiterService,

    // Infrastructure services
    IntegrationRegistryService,
    WebhookSecurityService,
    SyncOrchestratorService,
    IntegrationMetricsService,
    CircuitBreakerService,

    // Factory last to resolve dependencies
    {
      provide: IntegrationFactory,
      useFactory: (configService, circuitBreaker, metricsService) => {
        return new IntegrationFactory(configService, circuitBreaker, metricsService)
      },
      inject: [ConfigService, CircuitBreakerService, IntegrationMetricsService],
    },
  ],
  exports: [
    // Export main services for use in other modules
    IntegrationsService,
    IntegrationFactory,
    EncryptionService,
    RateLimiterService,
    IntegrationRegistryService,
    WebhookSecurityService,
    SyncOrchestratorService,
    IntegrationMetricsService,
    CircuitBreakerService,
  ],
})
export class IntegrationsModule {}
