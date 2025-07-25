import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CheckoutMode {
  PAYMENT = 'payment',
  SUBSCRIPTION = 'subscription',
  SETUP = 'setup',
}

export class CreateCheckoutDto {
  @ApiProperty({ description: 'Paddle price ID' })
  @IsString()
  priceId: string;

  @ApiPropertyOptional({ description: 'Success redirect URL' })
  @IsString()
  @IsOptional()
  successUrl?: string;

  @ApiPropertyOptional({ description: 'Cancel redirect URL' })
  @IsString()
  @IsOptional()
  cancelUrl?: string;

  @ApiPropertyOptional({ enum: CheckoutMode, default: CheckoutMode.SUBSCRIPTION })
  @IsEnum(CheckoutMode)
  @IsOptional()
  mode?: CheckoutMode = CheckoutMode.SUBSCRIPTION;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, string | number | boolean>;

  constructor() {
    this.priceId = '';
    this.mode = CheckoutMode.SUBSCRIPTION;
  }
}

export class CheckoutResponseDto {
  @ApiProperty({ description: 'Paddle customer ID for checkout' })
  customerId: string;

  @ApiProperty({ description: 'Paddle price ID for checkout' })
  priceId: string;

  @ApiProperty({ description: 'Customer email' })
  customerEmail: string;

  @ApiPropertyOptional({ description: 'Success redirect URL' })
  successUrl?: string;

  constructor() {
    this.customerId = '';
    this.priceId = '';
    this.customerEmail = '';
  }
}
