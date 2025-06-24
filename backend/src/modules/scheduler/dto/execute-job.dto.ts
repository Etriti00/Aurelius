import { IsObject, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ExecuteJobDto {
  @ApiPropertyOptional({
    description: 'Optional parameters to override for this execution',
    type: Object,
  })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, any>;
}
