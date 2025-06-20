import { Module } from '@nestjs/common';
import {
  EncryptionService,
  SecurityValidationService,
  AuditLogService,
  RateLimitService,
} from './services';
import { ConfigModule } from '../config/config.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    CacheModule,
  ],
  providers: [
    EncryptionService,
    SecurityValidationService,
    AuditLogService,
    RateLimitService,
  ],
  exports: [
    EncryptionService,
    SecurityValidationService,
    AuditLogService,
    RateLimitService,
  ],
})
export class SecurityModule {}