import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddPaymentMethodDto {
  @ApiProperty({ description: 'Stripe payment method ID' })
  @IsString()
  paymentMethodId: string;

  @ApiPropertyOptional({ description: 'Set as default payment method' })
  @IsBoolean()
  @IsOptional()
  setAsDefault?: boolean = true;
}

export class PaymentMethodDto {
  @ApiProperty({ description: 'Payment method ID' })
  id: string;

  @ApiProperty({ description: 'Payment method type' })
  type: string;

  @ApiProperty({ description: 'Card details' })
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };

  @ApiProperty({ description: 'Is default payment method' })
  isDefault: boolean;

  @ApiProperty({ description: 'Created timestamp' })
  created: Date;
}

export class ListPaymentMethodsResponseDto {
  @ApiProperty({ description: 'List of payment methods' })
  data: PaymentMethodDto[];

  @ApiProperty({ description: 'Default payment method ID' })
  defaultPaymentMethodId?: string;
}

export class RemovePaymentMethodDto {
  @ApiProperty({ description: 'Payment method ID to remove' })
  @IsString()
  paymentMethodId: string;
}