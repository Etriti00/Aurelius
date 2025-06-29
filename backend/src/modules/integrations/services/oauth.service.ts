import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '../../config/config.service';
import { CacheService } from '../../cache/services/cache.service';
import { URLSearchParams } from 'url';
import {
  OAuthProvider,
  OAuthConfig,
  OAuthTokens,
  OAuthTokenResponse,
  OAuthUserInfo,
  OAuthStateData,
} from '../interfaces';
import { BusinessException } from '../../../common/exceptions';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);
  private readonly providers = new Map<OAuthProvider, OAuthConfig>();

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    private cacheService: CacheService
  ) {
    this.initializeProviders();
  }

  /**
   * Initialize OAuth providers
   */
  private initializeProviders(): void {
    // Google OAuth
    this.providers.set(OAuthProvider.GOOGLE, {
      clientId: this.configService.get('GOOGLE_CLIENT_ID'),
      clientSecret: this.configService.get('GOOGLE_CLIENT_SECRET'),
      redirectUri: this.configService.get('GOOGLE_REDIRECT_URI'),
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
      scope: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/tasks',
      ],
    });

    // Microsoft OAuth
    this.providers.set(OAuthProvider.MICROSOFT, {
      clientId: this.configService.get('MICROSOFT_CLIENT_ID'),
      clientSecret: this.configService.get('MICROSOFT_CLIENT_SECRET'),
      redirectUri: this.configService.get('MICROSOFT_REDIRECT_URI'),
      authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
      scope: [
        'openid',
        'profile',
        'email',
        'offline_access',
        'User.Read',
        'Mail.Read',
        'Mail.Send',
        'Calendars.ReadWrite',
        'Files.Read.All',
        'Tasks.ReadWrite',
      ],
    });

    // Slack OAuth
    this.providers.set(OAuthProvider.SLACK, {
      clientId: this.configService.get('SLACK_CLIENT_ID'),
      clientSecret: this.configService.get('SLACK_CLIENT_SECRET'),
      redirectUri: this.configService.get('SLACK_REDIRECT_URI'),
      authorizationUrl: 'https://slack.com/oauth/v2/authorize',
      tokenUrl: 'https://slack.com/api/oauth.v2.access',
      userInfoUrl: 'https://slack.com/api/users.identity',
      scope: [
        'channels:read',
        'chat:write',
        'files:read',
        'groups:read',
        'im:read',
        'users:read',
        'users:read.email',
      ],
    });
  }

  /**
   * Get authorization URL
   */
  getAuthorizationUrl(
    provider: OAuthProvider,
    userId: string,
    additionalParams?: Record<string, string>
  ): string {
    const config = this.providers.get(provider);
    if (!config) {
      throw new BusinessException(
        `OAuth provider ${provider} not configured`,
        'OAUTH_PROVIDER_NOT_CONFIGURED'
      );
    }

    const state = uuidv4();

    // Store state for verification
    this.cacheService.set(
      `oauth:state:${state}`,
      { userId, provider },
      600 // 10 minutes
    );

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scope.join(' '),
      state,
      access_type: 'offline',
      prompt: 'consent',
      ...additionalParams,
    });

    return `${config.authorizationUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(
    provider: OAuthProvider,
    code: string,
    state: string
  ): Promise<{ tokens: OAuthTokens; userId: string }> {
    try {
      // Verify state
      const stateData = await this.cacheService.get<OAuthStateData>(`oauth:state:${state}`);
      if (!stateData || stateData.provider !== provider) {
        throw new BusinessException('Invalid OAuth state', 'INVALID_OAUTH_STATE');
      }

      // Clear state
      await this.cacheService.del(`oauth:state:${state}`);

      const config = this.providers.get(provider);
      if (!config) {
        throw new BusinessException(
          `OAuth provider ${provider} not configured`,
          'OAUTH_PROVIDER_NOT_CONFIGURED'
        );
      }

      const params = new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code',
      });

      const response = await this.httpService.axiosRef.post<OAuthTokenResponse>(
        config.tokenUrl,
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const tokens: OAuthTokens = {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt: new Date(Date.now() + (response.data.expires_in || 3600) * 1000),
        tokenType: response.data.token_type || 'Bearer',
        scope: this.convertScopeToArray(response.data.scope),
      };

      return {
        tokens,
        userId: stateData.userId,
      };
    } catch (error) {
      const axiosError = error as { message: string };
      this.logger.error(`Failed to exchange code for tokens: ${axiosError.message}`);
      throw new BusinessException(
        'Failed to exchange authorization code',
        'OAUTH_TOKEN_EXCHANGE_FAILED',
        undefined,
        axiosError
      );
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(provider: OAuthProvider, refreshToken: string): Promise<OAuthTokens> {
    try {
      const config = this.providers.get(provider);
      if (!config) {
        throw new BusinessException(
          `OAuth provider ${provider} not configured`,
          'OAUTH_PROVIDER_NOT_CONFIGURED'
        );
      }

      const params = new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      });

      const response = await this.httpService.axiosRef.post<OAuthTokenResponse>(
        config.tokenUrl,
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token || refreshToken,
        expiresAt: new Date(Date.now() + (response.data.expires_in || 3600) * 1000),
        tokenType: response.data.token_type || 'Bearer',
        scope: this.convertScopeToArray(response.data.scope),
      };
    } catch (error) {
      const axiosError = error as { message: string };
      this.logger.error(`Failed to refresh token: ${axiosError.message}`);
      throw new BusinessException(
        'Failed to refresh access token',
        'OAUTH_TOKEN_REFRESH_FAILED',
        undefined,
        axiosError
      );
    }
  }

  /**
   * Get user info
   */
  async getUserInfo(provider: OAuthProvider, accessToken: string): Promise<OAuthUserInfo> {
    try {
      const config = this.providers.get(provider);
      if (!config?.userInfoUrl) {
        throw new BusinessException(
          `OAuth provider ${provider} not configured`,
          'OAUTH_PROVIDER_NOT_CONFIGURED'
        );
      }

      const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
      };

      // Slack requires token in POST body
      if (provider === OAuthProvider.SLACK) {
        const response = await this.httpService.axiosRef.post(
          config.userInfoUrl,
          { token: accessToken },
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        return this.mapUserInfo(provider, response.data);
      }

      const response = await this.httpService.axiosRef.get(config.userInfoUrl, { headers });

      return this.mapUserInfo(provider, response.data);
    } catch (error) {
      const axiosError = error as { message: string };
      this.logger.error(`Failed to get user info: ${axiosError.message}`);
      throw new BusinessException(
        'Failed to get user info',
        'OAUTH_USER_INFO_FAILED',
        undefined,
        axiosError
      );
    }
  }

  /**
   * Revoke tokens
   */
  async revokeTokens(provider: OAuthProvider, tokens: OAuthTokens): Promise<void> {
    try {
      switch (provider) {
        case OAuthProvider.GOOGLE:
          await this.revokeGoogleTokens(tokens);
          break;
        case OAuthProvider.MICROSOFT:
          // Microsoft doesn't have a revoke endpoint
          this.logger.log('Microsoft tokens cannot be revoked via API');
          break;
        case OAuthProvider.SLACK:
          await this.revokeSlackTokens(tokens);
          break;
        default:
          this.logger.warn(`Token revocation not implemented for ${provider}`);
      }
    } catch (error) {
      const axiosError = error as { message: string };
      this.logger.error(`Failed to revoke tokens: ${axiosError.message}`);
      // Don't throw - token revocation failure shouldn't block operations
    }
  }

  /**
   * Validate tokens
   */
  async validateTokens(provider: OAuthProvider, tokens: OAuthTokens): Promise<boolean> {
    try {
      // Check expiration
      if (tokens.expiresAt && new Date() > new Date(tokens.expiresAt)) {
        return false;
      }

      // Try to get user info as validation
      await this.getUserInfo(provider, tokens.accessToken);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Map user info based on provider
   */
  private mapUserInfo(
    provider: OAuthProvider,
    data: Record<string, string | number | boolean | object>
  ): OAuthUserInfo {
    switch (provider) {
      case OAuthProvider.GOOGLE:
        return {
          id: String(data.id),
          email: typeof data.email === 'string' ? data.email : '',
          name: typeof data.name === 'string' ? data.name : '',
          picture: typeof data.picture === 'string' ? data.picture : undefined,
          provider: provider,
        };

      case OAuthProvider.MICROSOFT:
        return {
          id: String(data.id),
          email:
            typeof data.mail === 'string'
              ? data.mail
              : typeof data.userPrincipalName === 'string'
                ? data.userPrincipalName
                : '',
          name: typeof data.displayName === 'string' ? data.displayName : '',
          picture: undefined, // Microsoft requires separate API call for photo
          provider: provider,
        };

      case OAuthProvider.SLACK:
        const slackUser = data.user as
          | Record<string, string | number | boolean | object>
          | undefined;
        return {
          id: slackUser && typeof slackUser.id === 'string' ? slackUser.id : '',
          email: slackUser && typeof slackUser.email === 'string' ? slackUser.email : '',
          name: slackUser && typeof slackUser.name === 'string' ? slackUser.name : '',
          picture:
            slackUser && typeof slackUser.image_512 === 'string' ? slackUser.image_512 : undefined,
          provider: provider,
        };

      default:
        throw new BusinessException(
          `User info mapping not implemented for ${provider}`,
          'OAUTH_PROVIDER_NOT_SUPPORTED'
        );
    }
  }

  /**
   * Revoke Google tokens
   */
  private async revokeGoogleTokens(tokens: OAuthTokens): Promise<void> {
    const revokeUrl = 'https://oauth2.googleapis.com/revoke';
    const params = new URLSearchParams({
      token: tokens.refreshToken || tokens.accessToken,
    });

    await this.httpService.axiosRef.post(revokeUrl, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  }

  /**
   * Revoke Slack tokens
   */
  private async revokeSlackTokens(tokens: OAuthTokens): Promise<void> {
    const revokeUrl = 'https://slack.com/api/auth.revoke';

    await this.httpService.axiosRef.post(
      revokeUrl,
      { token: tokens.accessToken },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      }
    );
  }

  /**
   * Convert scope to array format
   */
  private convertScopeToArray(scope: string | undefined): string[] | undefined {
    if (!scope) {
      return undefined;
    }
    if (typeof scope === 'string') {
      return scope.split(' ');
    }
    return scope;
  }
}
