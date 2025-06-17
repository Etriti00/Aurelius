import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
  RawBodyRequest,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { BillingService, CreateSubscriptionDto, UpdateSubscriptionDto } from './billing.service'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { Request } from 'express'

@ApiTags('billing')
@Controller('api/v1/billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('subscription')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new subscription' })
  @ApiResponse({ status: 201, description: 'Subscription created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createSubscription(
    @Req() req: Request,
    @Body() createSubscriptionDto: CreateSubscriptionDto,
  ) {
    const userId = req.user?.['sub']
    return await this.billingService.createSubscription(userId, createSubscriptionDto)
  }

  @Put('subscription')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update subscription' })
  @ApiResponse({ status: 200, description: 'Subscription updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async updateSubscription(
    @Req() req: Request,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
  ) {
    const userId = req.user?.['sub']
    return await this.billingService.updateSubscription(userId, updateSubscriptionDto)
  }

  @Delete('subscription')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel subscription' })
  @ApiResponse({ status: 204, description: 'Subscription cancelled successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async cancelSubscription(@Req() req: Request) {
    const userId = req.user?.['sub']
    await this.billingService.cancelSubscription(userId)
  }

  @Post('subscription/reactivate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reactivate cancelled subscription' })
  @ApiResponse({ status: 200, description: 'Subscription reactivated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async reactivateSubscription(@Req() req: Request) {
    const userId = req.user?.['sub']
    return await this.billingService.reactivateSubscription(userId)
  }

  @Get('subscription')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current subscription' })
  @ApiResponse({ status: 200, description: 'Subscription retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async getSubscription(@Req() req: Request) {
    const userId = req.user?.['sub']
    return await this.billingService.getSubscription(userId)
  }

  @Get('info')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get comprehensive billing information' })
  @ApiResponse({ status: 200, description: 'Billing info retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async getBillingInfo(@Req() req: Request) {
    const userId = req.user?.['sub']
    return await this.billingService.getBillingInfo(userId)
  }

  @Get('usage')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get usage metrics' })
  @ApiResponse({ status: 200, description: 'Usage metrics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async getUsageMetrics(@Req() req: Request) {
    const userId = req.user?.['sub']
    return await this.billingService.getUsageMetrics(userId)
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Stripe webhooks' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook signature' })
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const payload = req.rawBody
    await this.billingService.handleStripeWebhook(signature, payload)
    return { received: true }

  @Get('status')
  @ApiOperation({ summary: 'Get billing service status' })
  @ApiResponse({ status: 200, description: 'Service status' })
  getStatus() {
    return {
      status: 'Billing service active',
      features: {,
        subscriptions: true,
        usage_tracking: true,
        stripe_integration: true,
        webhooks: true,
      },
    }
  }

}