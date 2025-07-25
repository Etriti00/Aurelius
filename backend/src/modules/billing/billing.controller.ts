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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
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
} from './dto';
import { ErrorResponseDto } from '../../common/dto/api-response.dto';

interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string;
}

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create Paddle checkout session',
    description:
      'Create a new Paddle checkout session for subscription payments. Returns customer and pricing information for client-side Paddle checkout integration.',
  })
  @ApiBody({
    type: CreateCheckoutDto,
    description: 'Checkout session configuration',
    examples: {
      subscription: {
        summary: 'Create subscription checkout',
        value: {
          priceId: 'pri_01ABC123xyz',
          successUrl: 'https://app.aurelius.plus/billing/success',
          cancelUrl: 'https://app.aurelius.plus/billing/cancel',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Checkout session created successfully',
    type: CheckoutResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid checkout parameters',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ErrorResponseDto,
  })
  async createCheckout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCheckoutDto
  ): Promise<CheckoutResponseDto> {
    return this.billingService.createCheckoutSession(user.id, dto);
  }

  @Post('subscription')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create subscription' })
  @ApiResponse({ status: 201, type: SubscriptionResponseDto })
  async createSubscription(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSubscriptionDto
  ): Promise<SubscriptionResponseDto> {
    return this.billingService.createSubscription(user.id, dto);
  }

  @Get('subscription')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current subscription details',
    description:
      "Retrieve comprehensive details about the user's current subscription including plan, status, usage limits, billing cycle, and renewal information.",
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription details retrieved successfully',
    type: SubscriptionResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'No active subscription found',
    type: ErrorResponseDto,
  })
  async getSubscription(@CurrentUser() user: AuthenticatedUser): Promise<SubscriptionResponseDto> {
    return this.billingService.getCurrentSubscription(user.id);
  }

  @Patch('subscription')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update subscription' })
  @ApiResponse({ status: 200, type: SubscriptionResponseDto })
  async updateSubscription(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateSubscriptionDto
  ): Promise<SubscriptionResponseDto> {
    return this.billingService.updateSubscription(user.id, dto);
  }

  @Delete('subscription')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel subscription' })
  @ApiResponse({ status: 200, type: SubscriptionResponseDto })
  async cancelSubscription(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CancelSubscriptionDto
  ): Promise<SubscriptionResponseDto> {
    return this.billingService.cancelSubscription(user.id, dto);
  }

  @Post('portal')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create billing portal session' })
  @ApiResponse({ status: 201, type: BillingPortalResponseDto })
  async createBillingPortal(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBillingPortalDto
  ): Promise<BillingPortalResponseDto> {
    return this.billingService.createBillingPortalSession(user.id, dto);
  }

  @Post('usage')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Record usage' })
  @ApiResponse({ status: 201, type: UsageResponseDto })
  async recordUsage(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RecordUsageDto
  ): Promise<UsageResponseDto> {
    return this.billingService.recordUsage(user.id, dto);
  }

  @Get('usage')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get usage summary' })
  @ApiResponse({ status: 200, type: UsageSummaryDto })
  async getUsageSummary(@CurrentUser() user: AuthenticatedUser): Promise<UsageSummaryDto> {
    return this.billingService.getUsageSummary(user.id);
  }

  @Get('invoices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List invoices' })
  @ApiResponse({ status: 200, type: InvoiceListResponseDto })
  async listInvoices(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListInvoicesDto
  ): Promise<InvoiceListResponseDto> {
    return this.billingService.listInvoices(user.id, query);
  }

  @Get('payment-methods')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List payment methods' })
  @ApiResponse({ status: 200, type: ListPaymentMethodsResponseDto })
  async listPaymentMethods(
    @CurrentUser() user: AuthenticatedUser
  ): Promise<ListPaymentMethodsResponseDto> {
    return this.billingService.listPaymentMethods(user.id);
  }

  @Post('payment-methods')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add payment method' })
  @ApiResponse({ status: 201, type: PaymentMethodDto })
  async addPaymentMethod(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddPaymentMethodDto
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
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') paymentMethodId: string
  ): Promise<void> {
    await this.billingService.removePaymentMethod(user.id, paymentMethodId);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Paddle webhook endpoint' })
  @ApiResponse({ status: 200 })
  async handleWebhook(
    @Headers('paddle-signature') signature: string,
    @Req() request: RawBodyRequest<Request>
  ): Promise<{ received: boolean }> {
    const rawBody = request.rawBody;
    if (!rawBody) {
      throw new Error('No raw body available');
    }

    await this.billingService.handleWebhook(rawBody, signature);
    return { received: true };
  }
}
