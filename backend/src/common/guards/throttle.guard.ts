import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';
import { RequestUser } from '../interfaces/user.interface';

interface RequestWithUser extends Request {
  user?: RequestUser;
}

@Injectable()
export class CustomThrottleGuard extends ThrottlerGuard {
  protected async getTracker(req: RequestWithUser): Promise<string> {
    // Use user ID if authenticated, otherwise use IP
    const userId = req.user?.id;
    if (userId) {
      return `user:${userId}`;
    }

    // Get real IP address considering proxies
    const forwardedFor = req.headers['x-forwarded-for'] as string;
    const realIp = forwardedFor ? forwardedFor.split(',')[0] : req.ip;

    return `ip:${realIp}`;
  }

  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest() as RequestWithUser;

    // Skip for health check endpoints only
    if (request.path === '/health') {
      return true;
    }

    // Admin users should still be rate limited to prevent abuse
    // They may get higher limits through getLimit override if needed
    return false;
  }

  // Override to provide different limits based on user role
  // Since getLimit is not available in base class, we'll handle this differently
  // by using custom metadata or configuration
}
