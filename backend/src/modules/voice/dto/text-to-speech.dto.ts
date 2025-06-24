import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TextToSpeechDto {
  @ApiProperty({
    description: 'Text to convert to speech',
    example: 'Hello, this is a test of the text-to-speech functionality.',
  })
  @IsString()
  text: string;

  @ApiProperty({
    description: 'ElevenLabs voice ID',
    example: 'rachel',
    required: false,
  })
  @IsOptional()
  @IsString()
  voiceId?: string;

  @ApiProperty({
    description: 'Voice synthesis settings',
    example: {
      stability: 0.75,
      similarityBoost: 0.75,
      style: 0.5,
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  voiceSettings?: {
    stability?: number;
    similarityBoost?: number;
    style?: number;
  };

  constructor() {
    this.text = '';
  }
}
