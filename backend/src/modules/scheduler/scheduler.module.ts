import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { SchedulerController } from './scheduler.controller';
import { SchedulerService } from './scheduler.service';
import { JobSchedulerService } from './services/job-scheduler.service';
import { RecurringJobService } from './services/recurring-job.service';
import { JobExecutorService } from './services/job-executor.service';
import { SchedulerMonitorService } from './services/scheduler-monitor.service';
import { AppConfigModule } from '../config/config.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../cache/cache.module';
import { QueueModule } from '../queue/queue.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TasksModule } from '../tasks/tasks.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    HttpModule,
    AppConfigModule,
    PrismaModule,
    CacheModule,
    QueueModule,
    NotificationsModule,
    TasksModule,
    EmailModule,
  ],
  controllers: [SchedulerController],
  providers: [
    SchedulerService,
    JobSchedulerService,
    RecurringJobService,
    JobExecutorService,
    SchedulerMonitorService,
  ],
  exports: [SchedulerService, JobSchedulerService, RecurringJobService],
})
export class SchedulerModule {}
