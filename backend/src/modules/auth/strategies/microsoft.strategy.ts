import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy, VerifyCallback } from 'passport-microsoft'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class MicrosoftStrategy extends PassportStrategy(Strategy, 'microsoft') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.get<string>('MICROSOFT_CLIENT_ID'),
      clientSecret: configService.get<string>('MICROSOFT_CLIENT_SECRET'),
      callbackURL: '/auth/microsoft/callback',
      scope: ['user.read'],
    })
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: { email: string; [key: string]: unknown },
    done: VerifyCallback,
  ): Promise<unknown> {
    const _user = {
      email: profile.emails[0].value,
      name: profile.displayName,
      accessToken,
      refreshToken,
    }
    done(null, user)
  }
}
