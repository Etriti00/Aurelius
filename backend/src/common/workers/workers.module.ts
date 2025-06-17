import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bull'
import { AIProcessingWorker } from './ai-processing.worker'
import { QueueService } from '../services/queue.service'
import { AiGatewayModule } from '../../modules/ai-gateway/ai-gateway.module'
import { WebsocketModule } from '../../modules/websocket/websocket.module'
import { VectorService } from '../services/vector.service'

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'ai-processing',
      defaultJobOptions: {,
        removeOnComplete: 10,
        removeOnFail: 5,
        attempts: 3,
        backoff: {,
          type: 'exponential',
          delay: 2000,
        },
      },
    }),
    AiGatewayModule,
    WebsocketModule,
  ],
  providers: [AIProcessingWorker, QueueService, VectorService],
  exports: [QueueService, VectorService],
})
export class WorkersModule {}
