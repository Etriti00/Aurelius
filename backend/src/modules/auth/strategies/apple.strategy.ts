import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';

import { AuthService } from '../auth.service';

interface AppleIdToken {
  id: string;
  email: string;
  name?: {
    firstName: string;
    lastName: string;
  };
}

interface AppleProfile {
  id: string;
  displayName: string;
  emails: Array<{ value: string; verified: boolean }>;
}

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(
    private readonly authService: AuthService,
    configService: ConfigService
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
    idToken: AppleIdToken,
    profile: AppleProfile
  ): Promise<User> {
    try {
      console.log('Apple OAuth validation:', { accessToken: Boolean(accessToken), refreshToken: Boolean(refreshToken), profileId: profile.id });
      const { id, email, name } = idToken;
      
      const oauthUser = {
        email,
        name: name ? `${name.firstName} ${name.lastName}` : undefined,
        provider: 'apple' as const,
        providerId: id,
      };

      const result = await this.authService.handleOAuthLoginWithUser(oauthUser);
      return result.user;
    } catch (error) {
      throw error;
    }
  }
}