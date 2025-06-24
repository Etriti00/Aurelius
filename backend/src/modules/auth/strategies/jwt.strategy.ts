import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AuthService } from '../auth.service';
import { UnauthorizedException } from '../../../common/exceptions/app.exception';
import { JwtPayload, RequestUser } from '../../../common/interfaces/user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly authService: AuthService,
    configService: ConfigService
  ) {
    const accessSecret = configService.get<string>('jwt.accessToken.secret');

    if (!accessSecret) {
      throw new Error(
        'JWT access token secret is not configured. ' +
          'Please ensure JWT_ACCESS_SECRET is set in your environment variables.'
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: accessSecret,
      issuer: configService.get<string>('jwt.issuer'),
      audience: configService.get<string>('jwt.audience'),
      algorithms: [configService.get<string>('jwt.accessToken.algorithm') || 'HS256'],
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    try {
      const user = await this.authService.validateUser(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      return user;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Validation failed';
      this.logger.warn('JWT validation failed', {
        error: errorMessage,
        payload: payload.sub,
      });
      throw new UnauthorizedException('Invalid token');
    }
  }
}
