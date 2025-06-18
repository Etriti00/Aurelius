import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: '/api/v1/auth/google/callback',
      scope: [
        'email',
        'profile',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/calendar',
      ],
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
        provider: 'google' as const,
        providerId: profile.id,
      };

      const tokens = await this.authService.handleOAuthLogin(oauthUser);
      
      // Store OAuth tokens for API access
      const user = {
        ...oauthUser,
        tokens,
        googleAccessToken: accessToken,
        googleRefreshToken: refreshToken,
      };

      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }
}