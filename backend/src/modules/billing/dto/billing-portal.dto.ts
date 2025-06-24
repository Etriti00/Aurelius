import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBillingPortalDto {
  @ApiProperty({ description: 'Return URL after portal session' })
  @IsString()
  returnUrl: string;

  @ApiPropertyOptional({ description: 'Portal configuration ID' })
  @IsString()
  @IsOptional()
  configurationId?: string;

  constructor() {
    this.returnUrl = '';
  }
}

export class BillingPortalResponseDto {
  @ApiProperty({ description: 'Portal session ID' })
  id: string;

  @ApiProperty({ description: 'Portal URL' })
  url: string;

  @ApiProperty({ description: 'Return URL' })
  returnUrl: string;

  @ApiProperty({ description: 'Session created timestamp' })
  created: Date;

  constructor() {
    this.id = '';
    this.url = '';
    this.returnUrl = '';
    this.created = new Date();
  }
}
