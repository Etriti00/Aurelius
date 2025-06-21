import { Module } from '@nestjs/common';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';
import { TriggerService } from './services/trigger.service';
import { AnalysisService } from './services/analysis.service';
import { SuggestionService } from './services/suggestion.service';
import { ActionService } from './services/action.service';
import { WorkflowEngineService } from './services/workflow-engine.service';
import { WorkflowTemplateService } from './services/workflow-template.service';
import { AppConfigModule } from '../config/config.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../cache/cache.module';
import { QueueModule } from '../queue/queue.module';
import { AIGatewayModule } from '../ai-gateway/ai-gateway.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    CacheModule,
    QueueModule,
    AIGatewayModule,
    SearchModule,
  ],
  controllers: [WorkflowController],
  providers: [
    WorkflowService,
    TriggerService,
    AnalysisService,
    SuggestionService,
    ActionService,
    WorkflowEngineService,
    WorkflowTemplateService,
  ],
  exports: [
    WorkflowService,
    TriggerService,
    AnalysisService,
    SuggestionService,
    ActionService,
    WorkflowEngineService,
  ],
})
export class WorkflowModule {}