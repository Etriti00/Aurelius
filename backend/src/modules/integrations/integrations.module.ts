import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';

// Services
import { MCPPoolManagerService } from './services/mcp-pool-manager.service';
import { MCPMonitoringService } from './services/mcp-monitoring.service';
import { MCPLoadBalancerService } from './services/mcp-load-balancer.service';

// Controllers
import { IntegrationsController } from './controllers/integrations.controller';
import { MCPServerController } from './controllers/mcp-server.controller';
import { MonitoringController } from './controllers/monitoring.controller';

// Configuration
import { integrationsConfig } from './config/integrations.config';

@Module({
  imports: [
    ConfigModule.forFeature(integrationsConfig),
    EventEmitterModule,
    ScheduleModule.forRoot(),
    BullModule.registerQueue({
      name: 'mcp-operations',
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }),
    BullModule.registerQueue({
      name: 'mcp-monitoring',
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 25,
        attempts: 2,
      },
    }),
  ],
  controllers: [IntegrationsController, MCPServerController, MonitoringController],
  providers: [MCPPoolManagerService, MCPMonitoringService, MCPLoadBalancerService],
  exports: [MCPPoolManagerService, MCPMonitoringService, MCPLoadBalancerService],
})
export class IntegrationsModule {}
