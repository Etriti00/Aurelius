import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { UnauthorizedException } from '../../common/exceptions/app.exception';
import { JwtPayload, RequestUser } from '../../common/interfaces/user.interface';
import { User, RefreshToken } from '@prisma/client';
import { AuthTokens as ImportedAuthTokens } from '../../common/types';
import { getOrDefault } from '../../common/utils/type-guards';
import { RegisterDto } from './dto/register.dto';
import { ConflictException, BadRequestException } from '@nestjs/common';

// Use imported AuthTokens type
type AuthTokens = ImportedAuthTokens;

interface OAuthUser {
  id?: string;
  email: string;
  name?: string;
  avatar?: string;
  provider: 'google' | 'microsoft' | 'apple';
  providerId: string;
}

interface RefreshTokenWithUser extends RefreshToken {
  user: User;
}

interface ProviderTokens {
  accessToken: string;
  refreshToken?: string;
  tokenExpiry?: Date;
}

interface AuthResult {
  user: User;
  tokens: AuthTokens;
}

interface UserInput {
  id: string;
  email: string;
  name?: string | null;
  roles?: string[];
}

interface UserData {
  email: string;
  name?: string;
  avatar?: string;
  lastActiveAt: Date;
  googleId?: string;
  microsoftId?: string;
  appleId?: string;
}

interface UserCreateData extends UserData {
  [key: string]: string | Date | undefined;
}

interface UserUpdates {
  name?: string;
  avatar?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly integrationsService: IntegrationsService
  ) {}

  async generateTokens(user: UserInput): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      roles: getOrDefault(user.roles, ['user']),
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.generateRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.getTokenExpirationTime(),
    };
  }

  async validateUser(userId: string): Promise<RequestUser> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: getOrDefault(user.roles, ['user']),
    };
  }

  async validateUserCredentials(email: string, password: string): Promise<User | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user || user.deletedAt) {
        return null;
      }

      if (!user.passwordHash) {
        return null; // OAuth-only user
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

      if (!isPasswordValid) {
        return null;
      }

      // Update last active time
      await this.usersService.updateLastActive(user.id);

      return user;
    } catch (error) {
      this.logger.error('Credential validation failed', error);
      return null;
    }
  }

  async registerUser(registerDto: RegisterDto): Promise<User> {
    try {
      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: registerDto.email },
      });

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(registerDto.password, saltRounds);

      // Create user
      const user = await this.prisma.user.create({
        data: {
          email: registerDto.email,
          name: registerDto.name,
          passwordHash,
          timezone: registerDto.timezone || 'UTC',
          preferences: {
            acceptTerms: registerDto.acceptTerms || false,
            marketingEmails: registerDto.marketingEmails || false,
          },
          lastActiveAt: new Date(),
        },
      });

      this.logger.log(`New user registered: ${user.email}`);
      return user;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error('User registration failed', error);
      throw new BadRequestException('Registration failed');
    }
  }

  async validateRefreshToken(refreshToken: string): Promise<User> {
    try {
      const tokenRecord = (await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      })) as RefreshTokenWithUser | null;

      if (!tokenRecord) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      if (tokenRecord.expiresAt < new Date()) {
        await this.revokeRefreshToken(refreshToken);
        throw new UnauthorizedException('Refresh token expired');
      }

      if (tokenRecord.revokedAt) {
        throw new UnauthorizedException('Refresh token revoked');
      }

      return tokenRecord.user;
    } catch (error) {
      this.logger.error('Refresh token validation failed', error);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    const user = await this.validateRefreshToken(refreshToken);

    // Revoke old refresh token (token rotation)
    await this.revokeRefreshToken(refreshToken);

    // Generate new tokens
    return this.generateTokens(user);
  }

  async handleOAuthLogin(oauthUser: OAuthUser): Promise<AuthTokens> {
    try {
      let user = await this.findUserByProvider(oauthUser.provider, oauthUser.providerId);

      if (!user) {
        // Create new user
        user = await this.createUserFromOAuth(oauthUser);
        this.logger.log(`New user created via ${oauthUser.provider}: ${user.email}`);
      } else {
        // Update last active time and sync profile data
        await this.usersService.updateLastActive(user.id);
        await this.syncOAuthProfile(user.id, oauthUser);
      }

      return this.generateTokens(user);
    } catch (error) {
      this.logger.error(`OAuth login failed for ${oauthUser.provider}`, error);
      throw new UnauthorizedException('OAuth authentication failed');
    }
  }

  async handleOAuthLoginWithTokens(
    oauthUser: OAuthUser,
    providerTokens: ProviderTokens
  ): Promise<AuthResult> {
    try {
      let user = await this.findUserByProvider(oauthUser.provider, oauthUser.providerId);

      if (!user) {
        // Create new user
        user = await this.createUserFromOAuth(oauthUser);
        this.logger.log(`New user created via ${oauthUser.provider}: ${user.email}`);
      } else {
        // Update last active time and sync profile data
        await this.usersService.updateLastActive(user.id);
        await this.syncOAuthProfile(user.id, oauthUser);
      }

      // Store encrypted OAuth tokens for integration use
      await this.integrationsService.connectIntegration(user.id, oauthUser.provider, {
        accessToken: providerTokens.accessToken,
        refreshToken: providerTokens.refreshToken,
        tokenExpiry: providerTokens.tokenExpiry,
        tokenType: 'Bearer',
        providerAccountId: oauthUser.providerId,
      });

      // Generate JWT tokens for our application
      const authTokens = await this.generateTokens(user);

      return { user, tokens: authTokens };
    } catch (error) {
      this.logger.error(`OAuth login with tokens failed for ${oauthUser.provider}`, error);
      throw new UnauthorizedException('OAuth authentication failed');
    }
  }

  async handleOAuthLoginWithUser(oauthUser: OAuthUser): Promise<AuthResult> {
    try {
      let user = await this.findUserByProvider(oauthUser.provider, oauthUser.providerId);

      if (!user) {
        // Create new user
        user = await this.createUserFromOAuth(oauthUser);
        this.logger.log(`New user created via ${oauthUser.provider}: ${user.email}`);
      } else {
        // Update last active time and sync profile data
        await this.usersService.updateLastActive(user.id);
        await this.syncOAuthProfile(user.id, oauthUser);
      }

      const tokens = await this.generateTokens(user);
      return { user, tokens };
    } catch (error) {
      this.logger.error(`OAuth login failed for ${oauthUser.provider}`, error);
      throw new UnauthorizedException('OAuth authentication failed');
    }
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    try {
      await this.prisma.refreshToken.update({
        where: { token: refreshToken },
        data: { revokedAt: new Date() },
      });
    } catch (error) {
      this.logger.warn('Failed to revoke refresh token', error);
    }
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    try {
      await this.prisma.refreshToken.updateMany({
        where: {
          userId,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
      this.logger.log(`Revoked all tokens for user: ${userId}`);
    } catch (error) {
      this.logger.error('Failed to revoke user tokens', error);
    }
  }

  async validateApiKey(apiKey: string): Promise<never> {
    // Log the attempt for security monitoring
    this.logger.warn(`API key authentication attempted: ${apiKey.substring(0, 8)}...`);

    // For future API key authentication - validate against database
    // const apiKeyRecord = await this.prisma.apiKey.findUnique({ where: { key: apiKey } });
    // if (!apiKeyRecord || !apiKeyRecord.isActive) {
    //   throw new UnauthorizedException('Invalid API key');
    // }

    throw new UnauthorizedException('API key authentication not implemented');
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const family = uuidv4(); // For token rotation family tracking

    await this.prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
        family,
      },
    });

    return token;
  }

  private async findUserByProvider(provider: string, providerId: string): Promise<User | null> {
    const providerField = `${provider}Id`;

    return this.prisma.user.findFirst({
      where: {
        [providerField]: providerId,
      },
    });
  }

  private async createUserFromOAuth(oauthUser: OAuthUser): Promise<User> {
    const userData: UserData = {
      email: oauthUser.email,
      name: oauthUser.name,
      avatar: oauthUser.avatar,
      lastActiveAt: new Date(),
    };

    // Set provider-specific ID
    switch (oauthUser.provider) {
      case 'google':
        userData.googleId = oauthUser.providerId;
        break;
      case 'microsoft':
        userData.microsoftId = oauthUser.providerId;
        break;
      case 'apple':
        userData.appleId = oauthUser.providerId;
        break;
    }

    return this.prisma.user.create({
      data: userData as UserCreateData,
    });
  }

  private async syncOAuthProfile(userId: string, oauthUser: OAuthUser): Promise<void> {
    const updates: UserUpdates = {};

    if (oauthUser.name) {
      updates.name = oauthUser.name;
    }

    if (oauthUser.avatar) {
      updates.avatar = oauthUser.avatar;
    }

    if (Object.keys(updates).length > 0) {
      await this.prisma.user.update({
        where: { id: userId },
        data: updates,
      });
    }
  }

  private getTokenExpirationTime(): number {
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '15m');

    // Convert to seconds
    if (expiresIn.endsWith('m')) {
      return parseInt(expiresIn) * 60;
    } else if (expiresIn.endsWith('h')) {
      return parseInt(expiresIn) * 3600;
    } else if (expiresIn.endsWith('d')) {
      return parseInt(expiresIn) * 86400;
    } else {
      return parseInt(expiresIn);
    }
  }

  async cleanupExpiredTokens(): Promise<void> {
    try {
      const result = await this.prisma.refreshToken.deleteMany({
        where: {
          OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { not: null } }],
        },
      });

      if (result.count > 0) {
        this.logger.log(`Cleaned up ${result.count} expired/revoked tokens`);
      }
    } catch (error) {
      this.logger.error('Failed to cleanup expired tokens', error);
    }
  }
}
