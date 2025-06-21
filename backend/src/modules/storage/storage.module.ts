import { Module } from '@nestjs/common';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';
import { S3Service } from './services/s3.service';
import { CdnService } from './services/cdn.service';
import { ImageService } from './services/image.service';
import { AppConfigModule } from '../config/config.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    CacheModule,
  ],
  controllers: [StorageController],
  providers: [
    StorageService,
    S3Service,
    CdnService,
    ImageService,
  ],
  exports: [StorageService, S3Service, CdnService, ImageService],
})
export class StorageModule {}