import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { User } from '@prisma/client';

import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LoginDto, LoginResponseDto } from './dto/login.dto';
import { RegisterDto, RegisterResponseDto } from './dto/register.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser } from '../../common/interfaces/user.interface';
import { UsersService } from '../users/users.service';

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    name?: string | null;
    avatar?: string | null;
  };
}

interface OAuthRequest {
  user: User;
}

interface UserProfileResponse {
  id: string;
  email: string;
  name?: string | null;
  avatar?: string | null;
  createdAt: Date;
  lastActiveAt?: Date | null;
  preferences: Record<string, string | number | boolean | null>;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService
  ) {}

  @Get('google')
  @ApiOperation({ summary: 'Initiate Google OAuth flow' })
  @ApiResponse({ status: 302, description: 'Redirect to Google OAuth' })
  @UseGuards(AuthGuard('google'))
  googleAuth(): void {
    // Initiates Google OAuth flow
  }

  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiResponse({ status: 200, description: 'Authentication successful', type: Object })
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Request() req: OAuthRequest): Promise<AuthResponse> {
    return this.handleOAuthCallback(req);
  }

  @Get('microsoft')
  @ApiOperation({ summary: 'Initiate Microsoft OAuth flow' })
  @ApiResponse({ status: 302, description: 'Redirect to Microsoft OAuth' })
  @UseGuards(AuthGuard('microsoft'))
  microsoftAuth(): void {
    // Initiates Microsoft OAuth flow
  }

  @Get('microsoft/callback')
  @ApiOperation({ summary: 'Microsoft OAuth callback' })
  @ApiResponse({ status: 200, description: 'Authentication successful', type: Object })
  @UseGuards(AuthGuard('microsoft'))
  async microsoftCallback(@Request() req: OAuthRequest): Promise<AuthResponse> {
    return this.handleOAuthCallback(req);
  }

  @Get('apple')
  @ApiOperation({ summary: 'Initiate Apple OAuth flow' })
  @ApiResponse({ status: 302, description: 'Redirect to Apple OAuth' })
  @UseGuards(AuthGuard('apple'))
  appleAuth(): void {
    // Initiates Apple OAuth flow
  }

  @Get('apple/callback')
  @ApiOperation({ summary: 'Apple OAuth callback' })
  @ApiResponse({ status: 200, description: 'Authentication successful', type: Object })
  @UseGuards(AuthGuard('apple'))
  async appleCallback(@Request() req: OAuthRequest): Promise<AuthResponse> {
    return this.handleOAuthCallback(req);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful', type: LoginResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.authService.validateUserCredentials(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.authService.generateTokens(user);

    return new LoginResponseDto(tokens.accessToken, tokens.refreshToken, tokens.expiresIn, {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      mfaEnabled: user.mfaEnabled,
    });
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register new user account' })
  @ApiResponse({ status: 201, description: 'Registration successful', type: RegisterResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input or user already exists' })
  @Throttle({ default: { limit: 3, ttl: 300000 } }) // 3 requests per 5 minutes
  async register(@Body() registerDto: RegisterDto): Promise<RegisterResponseDto> {
    const user = await this.authService.registerUser(registerDto);
    const tokens = await this.authService.generateTokens(user);

    return new RegisterResponseDto(tokens.accessToken, tokens.refreshToken, tokens.expiresIn, {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      mfaEnabled: user.mfaEnabled,
    });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully', type: Object })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto
  ): Promise<Omit<AuthResponse, 'user'>> {
    const tokens = await this.authService.refreshTokens(refreshTokenDto.refreshToken);
    return tokens;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user and revoke tokens' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentUser() user: RequestUser,
    @Body() refreshTokenDto?: RefreshTokenDto
  ): Promise<{ message: string }> {
    if (refreshTokenDto?.refreshToken) {
      await this.authService.revokeRefreshToken(refreshTokenDto.refreshToken);
    }

    // Optionally revoke all user tokens
    await this.authService.revokeAllUserTokens(user.id);

    return { message: 'Logout successful' };
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: RequestUser): Promise<UserProfileResponse> {
    // Fetch complete user profile from database
    const fullUser = await this.usersService.findById(user.id);

    if (!fullUser) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: fullUser.id,
      email: fullUser.email,
      name: fullUser.name,
      avatar: fullUser.avatar,
      createdAt: fullUser.createdAt,
      lastActiveAt: fullUser.lastActiveAt,
      preferences: (fullUser.preferences as Record<string, string | number | boolean | null>) || {},
    };
  }

  @Post('revoke-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke all refresh tokens for security' })
  @ApiResponse({ status: 200, description: 'All tokens revoked successfully' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 2, ttl: 300000 } }) // 2 requests per 5 minutes
  async revokeAllTokens(@CurrentUser() user: RequestUser): Promise<{ message: string }> {
    await this.authService.revokeAllUserTokens(user.id);
    return { message: 'All tokens revoked successfully' };
  }

  private async handleOAuthCallback(req: OAuthRequest): Promise<AuthResponse> {
    const tokens = await this.authService.generateTokens(req.user);
    return {
      ...tokens,
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        avatar: req.user.avatar,
      },
    };
  }
}
