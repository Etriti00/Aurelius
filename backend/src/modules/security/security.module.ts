import { Module } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  EncryptionService,
  SecurityValidationService,
  AuditLogService,
  RateLimitService,
} from './services';
import { AppConfigModule } from '../config/config.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    CacheModule,
  ],
  providers: [
    EncryptionService,
    SecurityValidationService,
    AuditLogService,
    RateLimitService,
    EventEmitter2,
  ],
  exports: [
    EncryptionService,
    SecurityValidationService,
    AuditLogService,
    RateLimitService,
  ],
})
export class SecurityModule {}