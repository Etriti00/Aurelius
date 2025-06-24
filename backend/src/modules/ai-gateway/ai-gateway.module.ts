import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../cache/cache.module';

import { AIGatewayController } from './ai-gateway.controller';
import { AIGatewayService } from './ai-gateway.service';
import { AIModelSelectorService } from './services/ai-model-selector.service';
import { AnthropicService } from './services/anthropic.service';
import { ClaudeService } from './services/claude.service';
import { OpenAIService } from './services/openai.service';
import { PromptService } from './services/prompt.service';
import { EmbeddingsService } from './services/embeddings.service';
import { AIUsageTrackingService } from './services/ai-usage-tracking.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'ai-processing',
    }),
    PrismaModule,
    CacheModule,
  ],
  controllers: [AIGatewayController],
  providers: [
    AIGatewayService,
    AIModelSelectorService,
    AnthropicService,
    ClaudeService,
    OpenAIService,
    PromptService,
    EmbeddingsService,
    AIUsageTrackingService,
  ],
  exports: [AIGatewayService, OpenAIService, EmbeddingsService],
})
export class AIGatewayModule {}
