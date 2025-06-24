import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly authService: AuthService,
    configService: ConfigService
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

      const result = await this.authService.handleOAuthLoginWithTokens(oauthUser, {
        accessToken,
        refreshToken,
        tokenExpiry: profile._json.expires_in
          ? new Date(Date.now() + profile._json.expires_in * 1000)
          : undefined,
      });

      // Return user with application tokens
      const user = {
        ...result.user,
        tokens: result.tokens,
      };

      done(null, user);
    } catch (error) {
      const errorToPass = error instanceof Error ? error : new Error('Authentication failed');
      done(errorToPass, undefined);
    }
  }
}
