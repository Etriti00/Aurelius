import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DraftEmailDto {
  @ApiProperty({
    description: 'Email recipient',
    example: 'john.doe@company.com',
  })
  @IsString()
  recipient: string;

  @ApiProperty({
    description: 'Purpose/intent of the email',
    example: 'Follow up on project meeting and confirm next steps',
  })
  @IsString()
  purpose: string;

  @ApiProperty({
    description: 'Context or additional information for the email',
    example: 'Met yesterday about Project Alpha. Discussed budget constraints and timeline adjustments.',
  })
  @IsString()
  context: string;

  @ApiProperty({
    description: 'Tone of the email',
    example: 'formal',
    enum: ['formal', 'casual', 'friendly'],
    required: false,
  })
  @IsOptional()
  @IsIn(['formal', 'casual', 'friendly'])
  tone?: 'formal' | 'casual' | 'friendly';
}