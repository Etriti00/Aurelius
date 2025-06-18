import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

import { VoiceController } from './voice.controller';
import { VoiceService } from './voice.service';
import { ElevenLabsService } from './services/elevenlabs.service';
import { AIGatewayModule } from '../ai-gateway/ai-gateway.module';

@Module({
  imports: [
    AIGatewayModule,
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
  providers: [VoiceService, ElevenLabsService],
  exports: [VoiceService],
})
export class VoiceModule {}