import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TemplateFilterDto {
  @ApiPropertyOptional({ description: 'Filter templates by category' })
  @IsOptional()
  @IsString()
  category?: string;
}
