import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('billing')
@Controller('billing')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('usage')
  @ApiOperation({ summary: 'Get billing usage information' })
  @ApiResponse({ status: 200, description: 'Usage information retrieved successfully' })
  async getUsage(@CurrentUser() user: any): Promise<any> {
    return this.billingService.getUsage(user.id);
  }
}