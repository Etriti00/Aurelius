import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';

import { AIGatewayController } from './ai-gateway.controller';
import { AIGatewayService } from './ai-gateway.service';
import { AIModelSelectorService } from './services/ai-model-selector.service';
import { AnthropicService } from './services/anthropic.service';
import { EmbeddingsService } from './services/embeddings.service';
import { UsageTrackingService } from './services/usage-tracking.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'ai-processing',
    }),
  ],
  controllers: [AIGatewayController],
  providers: [
    AIGatewayService,
    AIModelSelectorService,
    AnthropicService,
    EmbeddingsService,
    UsageTrackingService,
  ],
  exports: [AIGatewayService, EmbeddingsService],
})
export class AIGatewayModule {}