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

  constructor() {
    this.paymentMethodId = '';
  }
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

  constructor() {
    this.id = '';
    this.type = '';
    this.isDefault = false;
    this.created = new Date();
  }
}

export class ListPaymentMethodsResponseDto {
  @ApiProperty({ description: 'List of payment methods' })
  data: PaymentMethodDto[];

  @ApiProperty({ description: 'Default payment method ID' })
  defaultPaymentMethodId?: string;

  constructor() {
    this.data = [];
  }
}

export class RemovePaymentMethodDto {
  @ApiProperty({ description: 'Payment method ID to remove' })
  @IsString()
  paymentMethodId: string;

  constructor() {
    this.paymentMethodId = '';
  }
}