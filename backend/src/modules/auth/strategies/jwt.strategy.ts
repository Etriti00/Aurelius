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
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
      issuer: 'aurelius.ai',
      audience: 'aurelius-users',
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
        payload: payload.sub 
      });
      throw new UnauthorizedException('Invalid token');
    }
  }
}