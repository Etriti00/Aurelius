import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AuthService } from '../auth.service';
import { UnauthorizedException } from '../../../common/exceptions/app.exception';

interface JwtPayload {
  sub: string;
  email: string;
  name?: string;
  iat: number;
  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
      issuer: 'aurelius.ai',
      audience: 'aurelius-users',
    });
  }

  async validate(payload: JwtPayload): Promise<any> {
    try {
      const user = await this.authService.validateUser(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      return user;
    } catch (error) {
      this.logger.warn('JWT validation failed', { 
        error: error.message, 
        payload: payload.sub 
      });
      throw new UnauthorizedException('Invalid token');
    }
  }
}