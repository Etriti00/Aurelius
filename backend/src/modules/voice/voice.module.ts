import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { HttpModule } from '@nestjs/axios';
import { diskStorage } from 'multer';
import { extname } from 'path';

import { VoiceController } from './voice.controller';
import { VoiceService } from './voice.service';
import {
  ElevenLabsService,
  SpeechToTextService,
  VoiceAnalyticsService,
} from './services';
import { AIGatewayModule } from '../ai-gateway/ai-gateway.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../cache/cache.module';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [
    HttpModule,
    AIGatewayModule,
    PrismaModule,
    CacheModule,
    ConfigModule,
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads/voice',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          callback(null, `voice-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, callback) => {
        const allowedMimes = ['audio/mp3', 'audio/wav', 'audio/webm', 'audio/ogg'];
        if (allowedMimes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(new Error('Invalid audio file type'), false);
        }
      },
    }),
  ],
  controllers: [VoiceController],
  providers: [
    VoiceService,
    ElevenLabsService,
    SpeechToTextService,
    VoiceAnalyticsService,
  ],
  exports: [VoiceService, VoiceAnalyticsService],
})
export class VoiceModule {}