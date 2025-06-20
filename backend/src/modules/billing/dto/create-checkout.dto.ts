import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CheckoutMode {
  PAYMENT = 'payment',
  SUBSCRIPTION = 'subscription',
  SETUP = 'setup',
}

export class CreateCheckoutDto {
  @ApiProperty({ description: 'Stripe price ID' })
  @IsString()
  priceId: string;

  @ApiProperty({ description: 'Success redirect URL' })
  @IsString()
  successUrl: string;

  @ApiProperty({ description: 'Cancel redirect URL' })
  @IsString()
  cancelUrl: string;

  @ApiPropertyOptional({ enum: CheckoutMode, default: CheckoutMode.SUBSCRIPTION })
  @IsEnum(CheckoutMode)
  @IsOptional()
  mode?: CheckoutMode = CheckoutMode.SUBSCRIPTION;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class CheckoutResponseDto {
  @ApiProperty({ description: 'Checkout session ID' })
  sessionId: string;

  @ApiProperty({ description: 'Checkout URL' })
  url: string;
}