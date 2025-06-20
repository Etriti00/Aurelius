import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { VoiceService } from './voice.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProcessVoiceDto } from './dto/process-voice.dto';
import { TextToSpeechDto } from './dto/text-to-speech.dto';

@ApiTags('voice')
@Controller('voice')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  @Post('process')
  @UseInterceptors(FileInterceptor('audio'))
  @ApiOperation({ summary: 'Process voice command with audio file' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Voice command processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid audio file' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  async processVoiceCommand(
    @UploadedFile() audioFile: Express.Multer.File,
    @CurrentUser() user: any,
    @Body() processVoiceDto: ProcessVoiceDto
  ): Promise<any> {
    if (!audioFile) {
      throw new Error('Audio file is required');
    }

    return this.voiceService.processVoiceCommand({
      audioBuffer: audioFile.buffer,
      userId: user.id,
      userSubscription: user.subscription,
      language: processVoiceDto.language,
      metadata: processVoiceDto.metadata,
    });
  }

  @Post('text-to-speech')
  @ApiOperation({ summary: 'Convert text to speech' })
  @ApiResponse({ status: 200, description: 'Text converted to speech successfully' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute
  async textToSpeech(
    @CurrentUser() user: any,
    @Body() textToSpeechDto: TextToSpeechDto
  ): Promise<{ audioUrl: string }> {
    return this.voiceService.textToSpeech({
      text: textToSpeechDto.text,
      userId: user.id,
      voiceId: textToSpeechDto.voiceId,
      voiceSettings: textToSpeechDto.voiceSettings,
    });
  }

  @Get('voices')
  @ApiOperation({ summary: 'Get available voices for text-to-speech' })
  @ApiResponse({ status: 200, description: 'Available voices retrieved successfully' })
  async getAvailableVoices(): Promise<any[]> {
    return this.voiceService.getAvailableVoices();
  }

  @Get('history')
  @ApiOperation({ summary: 'Get user voice interaction history' })
  @ApiResponse({ status: 200, description: 'Voice history retrieved successfully' })
  async getVoiceHistory(
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ): Promise<any[]> {
    const limitNum = limit ? parseInt(limit) : 20;
    const offsetNum = offset ? parseInt(offset) : 0;
    return this.voiceService.getUserVoiceHistory(user.id, limitNum, offsetNum);
  }

  @Get('health')
  @ApiOperation({ summary: 'Check voice service health' })
  @ApiResponse({ status: 200, description: 'Health check completed' })
  async healthCheck(): Promise<any> {
    return this.voiceService.healthCheck();
  }
}