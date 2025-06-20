import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Headers,
  RawBodyRequest,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BillingService } from './billing.service';
import {
  CreateCheckoutDto,
  CheckoutResponseDto,
  CreateSubscriptionDto,
  SubscriptionResponseDto,
  UpdateSubscriptionDto,
  CancelSubscriptionDto,
  CreateBillingPortalDto,
  BillingPortalResponseDto,
  RecordUsageDto,
  UsageResponseDto,
  UsageSummaryDto,
  ListInvoicesDto,
  InvoiceListResponseDto,
  AddPaymentMethodDto,
  PaymentMethodDto,
  ListPaymentMethodsResponseDto,
  RemovePaymentMethodDto,
} from './dto';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create checkout session' })
  @ApiResponse({ status: 201, type: CheckoutResponseDto })
  async createCheckout(
    @CurrentUser() user: any,
    @Body() dto: CreateCheckoutDto,
  ): Promise<CheckoutResponseDto> {
    return this.billingService.createCheckoutSession(user.id, dto);
  }

  @Post('subscription')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create subscription' })
  @ApiResponse({ status: 201, type: SubscriptionResponseDto })
  async createSubscription(
    @CurrentUser() user: any,
    @Body() dto: CreateSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    return this.billingService.createSubscription(user.id, dto);
  }

  @Get('subscription')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current subscription' })
  @ApiResponse({ status: 200, type: SubscriptionResponseDto })
  async getSubscription(@CurrentUser() user: any): Promise<SubscriptionResponseDto> {
    return this.billingService.getCurrentSubscription(user.id);
  }

  @Patch('subscription')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update subscription' })
  @ApiResponse({ status: 200, type: SubscriptionResponseDto })
  async updateSubscription(
    @CurrentUser() user: any,
    @Body() dto: UpdateSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    return this.billingService.updateSubscription(user.id, dto);
  }

  @Delete('subscription')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel subscription' })
  @ApiResponse({ status: 200, type: SubscriptionResponseDto })
  async cancelSubscription(
    @CurrentUser() user: any,
    @Body() dto: CancelSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    return this.billingService.cancelSubscription(user.id, dto);
  }

  @Post('portal')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create billing portal session' })
  @ApiResponse({ status: 201, type: BillingPortalResponseDto })
  async createBillingPortal(
    @CurrentUser() user: any,
    @Body() dto: CreateBillingPortalDto,
  ): Promise<BillingPortalResponseDto> {
    return this.billingService.createBillingPortalSession(user.id, dto);
  }

  @Post('usage')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Record usage' })
  @ApiResponse({ status: 201, type: UsageResponseDto })
  async recordUsage(
    @CurrentUser() user: any,
    @Body() dto: RecordUsageDto,
  ): Promise<UsageResponseDto> {
    return this.billingService.recordUsage(user.id, dto);
  }

  @Get('usage')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get usage summary' })
  @ApiResponse({ status: 200, type: UsageSummaryDto })
  async getUsageSummary(@CurrentUser() user: any): Promise<UsageSummaryDto> {
    return this.billingService.getUsageSummary(user.id);
  }

  @Get('invoices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List invoices' })
  @ApiResponse({ status: 200, type: InvoiceListResponseDto })
  async listInvoices(
    @CurrentUser() user: any,
    @Query() query: ListInvoicesDto,
  ): Promise<InvoiceListResponseDto> {
    return this.billingService.listInvoices(user.id, query);
  }

  @Get('payment-methods')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List payment methods' })
  @ApiResponse({ status: 200, type: ListPaymentMethodsResponseDto })
  async listPaymentMethods(@CurrentUser() user: any): Promise<ListPaymentMethodsResponseDto> {
    return this.billingService.listPaymentMethods(user.id);
  }

  @Post('payment-methods')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add payment method' })
  @ApiResponse({ status: 201, type: PaymentMethodDto })
  async addPaymentMethod(
    @CurrentUser() user: any,
    @Body() dto: AddPaymentMethodDto,
  ): Promise<PaymentMethodDto> {
    return this.billingService.addPaymentMethod(user.id, dto);
  }

  @Delete('payment-methods/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove payment method' })
  @ApiResponse({ status: 204 })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removePaymentMethod(
    @CurrentUser() user: any,
    @Param('id') paymentMethodId: string,
  ): Promise<void> {
    await this.billingService.removePaymentMethod(user.id, paymentMethodId);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  @ApiResponse({ status: 200 })
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: RawBodyRequest<Request>,
  ): Promise<{ received: boolean }> {
    const rawBody = request.rawBody;
    if (!rawBody) {
      throw new Error('No raw body available');
    }
    
    await this.billingService.handleWebhook(rawBody, signature);
    return { received: true };
  }
}