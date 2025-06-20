import { IsOptional, IsString, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ProcessVoiceDto {
  @ApiProperty({
    description: 'Language code for speech recognition',
    example: 'en',
    required: false,
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({
    description: 'Additional metadata for voice processing',
    example: { location: 'office', context: 'meeting' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Audio file (mp3, wav, webm, ogg)',
  })
  audio: any;
}