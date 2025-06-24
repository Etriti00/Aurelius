import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class IdParamDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  id: string;

  constructor() {
    this.id = '';
  }
}

export class OptionalIdParamDto {
  @ApiProperty({ format: 'uuid', required: false })
  @IsUUID('4')
  id?: string;
}
