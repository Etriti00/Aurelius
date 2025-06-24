import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';

import { AuthService } from '../auth.service';
import { UnauthorizedException } from '../../../common/exceptions/app.exception';
import { JwtPayload, RequestUser } from '../../../common/interfaces/user.interface';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  private readonly logger = new Logger(RefreshTokenStrategy.name);

  constructor(
    private readonly authService: AuthService,
    configService: ConfigService
  ) {
    const refreshSecret = configService.get<string>('jwt.refreshToken.secret');

    if (!refreshSecret) {
      throw new Error(
        'JWT refresh token secret is not configured. ' +
          'Please ensure JWT_REFRESH_SECRET is set in your environment variables.'
      );
    }

    super({
      jwtFromRequest: (req: Request) => {
        const token = req.body?.refreshToken || req.query?.refreshToken;
        return token || null;
      },
      ignoreExpiration: true, // We'll handle expiration manually
      secretOrKey: refreshSecret,
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    payload: JwtPayload
  ): Promise<RequestUser & { refreshToken: string }> {
    // Log the JWT payload for debugging
    this.logger.debug('Refresh token payload:', payload.sub);

    const refreshToken = req.body?.refreshToken || req.query?.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token required');
    }

    try {
      const user = await this.authService.validateRefreshToken(refreshToken);
      return { ...user, refreshToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
