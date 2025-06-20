import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';
import { ConfigService } from '@nestjs/config';

import { AuthService } from '../auth.service';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) {
    super({
      clientID: configService.get<string>('APPLE_CLIENT_ID'),
      teamID: configService.get<string>('APPLE_TEAM_ID'),
      keyID: configService.get<string>('APPLE_KEY_ID'),
      privateKeyLocation: configService.get<string>('APPLE_PRIVATE_KEY_PATH'),
      callbackURL: '/api/v1/auth/apple/callback',
      scope: ['email', 'name'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    idToken: any,
    profile: any
  ): Promise<any> {
    try {
      const { id, email, name } = idToken;
      
      const oauthUser = {
        email,
        name: name ? `${name.firstName} ${name.lastName}` : undefined,
        provider: 'apple' as const,
        providerId: id,
      };

      const tokens = await this.authService.handleOAuthLogin(oauthUser);
      
      const user = {
        ...oauthUser,
        tokens,
      };

      return user;
    } catch (error) {
      throw error;
    }
  }
}