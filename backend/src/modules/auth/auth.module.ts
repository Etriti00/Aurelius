import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { ApiKeysController } from './api-keys.controller';
import { AuthService } from './auth.service';
import { ApiKeyService } from '../../common/guards/api-key.guard';
import { UsersModule } from '../users/users.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { MicrosoftStrategy } from './strategies/microsoft.strategy';
import { AppleStrategy } from './strategies/apple.strategy';

@Module({
  imports: [
    UsersModule,
    IntegrationsModule,
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const secret = configService.get<string>('jwt.accessToken.secret');
        if (!secret) {
          throw new Error('JWT_ACCESS_SECRET must be defined');
        }

        return {
          secret,
          signOptions: {
            expiresIn: configService.get<string>('jwt.accessToken.expiresIn') || '15m',
            issuer: configService.get<string>('jwt.issuer') || 'aurelius.ai',
            audience: configService.get<string>('jwt.audience') || 'aurelius-users',
            algorithm: 'HS256' as const,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, ApiKeysController],
  providers: [
    AuthService,
    ApiKeyService,
    JwtStrategy,
    RefreshTokenStrategy,
    GoogleStrategy,
    MicrosoftStrategy,
    AppleStrategy,
  ],
  exports: [AuthService, PassportModule],
})
export class AuthModule {}
