import { Module } from '@nestjs/common'
import { TasksService } from './tasks.service'
import { TasksController } from './tasks.controller'
import { AiGatewayModule } from '../ai-gateway/ai-gateway.module'

@Module({
  imports: [AiGatewayModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
