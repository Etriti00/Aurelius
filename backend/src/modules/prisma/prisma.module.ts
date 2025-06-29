import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { DatabasePoolService } from './database-pool.service';

/**
 * Global Prisma module with enterprise-grade database connection pooling
 * Provides comprehensive database services including connection monitoring,
 * pool management, and performance optimization
 */
@Global()
@Module({
  providers: [PrismaService, DatabasePoolService],
  exports: [PrismaService, DatabasePoolService],
})
export class PrismaModule {}
