import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-microsoft';
import { ConfigService } from '@nestjs/config';

import { AuthService } from '../auth.service';

@Injectable()
export class MicrosoftStrategy extends PassportStrategy(Strategy, 'microsoft') {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) {
    super({
      clientID: configService.get<string>('MICROSOFT_CLIENT_ID'),
      clientSecret: configService.get<string>('MICROSOFT_CLIENT_SECRET'),
      callbackURL: '/api/v1/auth/microsoft/callback',
      scope: [
        'user.read',
        'mail.readwrite',
        'calendars.readwrite',
        'offline_access',
      ],
      tenant: 'common',
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback
  ): Promise<void> {
    try {
      const oauthUser = {
        email: profile.emails[0].value,
        name: profile.displayName,
        avatar: profile.photos[0]?.value,
        provider: 'microsoft' as const,
        providerId: profile.id,
      };

      const tokens = await this.authService.handleOAuthLogin(oauthUser);
      
      // Store OAuth tokens for API access
      const user = {
        ...oauthUser,
        tokens,
        microsoftAccessToken: accessToken,
        microsoftRefreshToken: refreshToken,
      };

      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }
}