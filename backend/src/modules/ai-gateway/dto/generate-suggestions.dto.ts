import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateSuggestionsDto {
  @ApiProperty({
    description: 'User context for generating relevant suggestions',
    example: 'User has 5 unread emails, 3 upcoming meetings today, and 2 overdue tasks. Last active on project Alpha.',
  })
  @IsString()
  context!: string;
}