import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AnalyzeEmailDto {
  @ApiProperty({
    description: 'Email thread content to analyze',
    example: 'Subject: Project Update\n\nFrom: john@company.com\nHi team, we need to discuss the project timeline...',
  })
  @IsString()
  emailContent: string;
}